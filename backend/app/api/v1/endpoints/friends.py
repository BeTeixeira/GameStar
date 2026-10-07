import uuid

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, FriendshipServiceDep
from app.domain.models.friendship import Friendship
from app.domain.schemas.friendship import (
    FriendRequestCreate,
    FriendRequestResponse,
    FriendRequestResult,
    FriendResponse,
    FriendUser,
)

# Amigos do usuário logado. Erros do service (404/403/409) viram resposta HTTP
# pelos handlers globais em main.py.
router = APIRouter(prefix="/friends", tags=["friends"])


def _friend_user(friendship: Friendship, me: uuid.UUID) -> FriendUser:
    other = friendship.other_user(me)
    return FriendUser(id=other.id, username=other.username)


@router.get("", response_model=list[FriendResponse])
async def list_friends(
    service: FriendshipServiceDep, current_user_id: CurrentUser
) -> list[FriendResponse]:
    me = uuid.UUID(current_user_id)
    return [
        FriendResponse(friendship_id=f.id, user=_friend_user(f, me), since=f.updated_at)
        for f in await service.list_friends(me)
    ]


@router.get("/requests", response_model=list[FriendRequestResponse])
async def list_friend_requests(
    service: FriendshipServiceDep, current_user_id: CurrentUser
) -> list[FriendRequestResponse]:
    me = uuid.UUID(current_user_id)
    return [
        FriendRequestResponse(
            id=f.id,
            direction="incoming" if f.addressee_id == me else "outgoing",
            user=_friend_user(f, me),
            created_at=f.created_at,
        )
        for f in await service.list_requests(me)
    ]


@router.post(
    "/requests", response_model=FriendRequestResult, status_code=status.HTTP_201_CREATED
)
async def send_friend_request(
    data: FriendRequestCreate, service: FriendshipServiceDep, current_user_id: CurrentUser
) -> FriendRequestResult:
    me = uuid.UUID(current_user_id)
    f = await service.send_request(me, data.username)
    return FriendRequestResult(id=f.id, status=f.status.value, user=_friend_user(f, me))


@router.post("/requests/{request_id}/accept", response_model=FriendResponse)
async def accept_friend_request(
    request_id: uuid.UUID, service: FriendshipServiceDep, current_user_id: CurrentUser
) -> FriendResponse:
    me = uuid.UUID(current_user_id)
    f = await service.accept_request(me, request_id)
    return FriendResponse(friendship_id=f.id, user=_friend_user(f, me), since=f.updated_at)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_friend_request(
    request_id: uuid.UUID, service: FriendshipServiceDep, current_user_id: CurrentUser
) -> None:
    """Recusa um pedido recebido ou cancela um pedido enviado."""
    await service.delete_request(uuid.UUID(current_user_id), request_id)


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    friend_id: uuid.UUID, service: FriendshipServiceDep, current_user_id: CurrentUser
) -> None:
    await service.remove_friend(uuid.UUID(current_user_id), friend_id)
