import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUserFull, NotificationServiceDep
from app.domain.schemas.notification import (
    NotificationResponse,
    PushTokenRegister,
    PushTokenRemove,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUserFull,
    service: NotificationServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[NotificationResponse]:
    return await service.list_for_user(current_user.id, skip=skip, limit=limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: CurrentUserFull, service: NotificationServiceDep
) -> UnreadCountResponse:
    return UnreadCountResponse(count=await service.unread_count(current_user.id))


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(current_user: CurrentUserFull, service: NotificationServiceDep) -> None:
    await service.mark_all_read(current_user.id)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: uuid.UUID, current_user: CurrentUserFull, service: NotificationServiceDep
) -> None:
    await service.mark_read(current_user.id, notification_id)


@router.put("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    data: PushTokenRegister, current_user: CurrentUserFull, service: NotificationServiceDep
) -> None:
    await service.register_token(current_user.id, data.token, data.platform)


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def remove_push_token(
    data: PushTokenRemove, current_user: CurrentUserFull, service: NotificationServiceDep
) -> None:
    await service.remove_token(current_user.id, data.token)
