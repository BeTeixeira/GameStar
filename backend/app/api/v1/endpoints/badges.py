import uuid

from fastapi import APIRouter, status

from app.api.dependencies import BadgeServiceDep, CurrentUser
from app.domain.schemas.badge import (
    BadgeCollectionResponse,
    EquippedBadgesResponse,
    EquippedBadgesUpdate,
    UserBadgeResponse,
)

# Loja de badges. Erros de domínio viram 404/400/409 pelos handlers globais (main.py).
router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("/me", response_model=BadgeCollectionResponse)
async def my_badges(
    service: BadgeServiceDep, current_user_id: CurrentUser
) -> BadgeCollectionResponse:
    collection = await service.get_collection(uuid.UUID(current_user_id))
    return BadgeCollectionResponse.from_collection(collection)


@router.post(
    "/{badge_id}/redeem", response_model=UserBadgeResponse, status_code=status.HTTP_201_CREATED
)
async def redeem_badge(
    badge_id: str, service: BadgeServiceDep, current_user_id: CurrentUser
) -> UserBadgeResponse:
    badge = await service.redeem(uuid.UUID(current_user_id), badge_id)
    return UserBadgeResponse.model_validate(badge)


@router.put("/me/equipped", response_model=BadgeCollectionResponse)
async def set_equipped_badges(
    data: EquippedBadgesUpdate, service: BadgeServiceDep, current_user_id: CurrentUser
) -> BadgeCollectionResponse:
    collection = await service.set_equipped(uuid.UUID(current_user_id), data.slots)
    return BadgeCollectionResponse.from_collection(collection)


@router.get("/users/{user_id}", response_model=EquippedBadgesResponse)
async def equipped_badges_of_user(
    user_id: uuid.UUID, service: BadgeServiceDep, _current_user_id: CurrentUser
) -> EquippedBadgesResponse:
    return EquippedBadgesResponse(equipped=await service.get_equipped_of(user_id))
