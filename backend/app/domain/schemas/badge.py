from datetime import datetime

from pydantic import BaseModel, Field

from app.services.badge_service import MAX_EQUIPPED, BadgeCollection


class UserBadgeResponse(BaseModel):
    model_config = {"from_attributes": True}

    badge_id: str
    redeemed_at: datetime


class BadgeCollectionResponse(BaseModel):
    owned: list[UserBadgeResponse]
    equipped: list[str | None]
    max_equipped: int = MAX_EQUIPPED

    @classmethod
    def from_collection(cls, collection: BadgeCollection) -> "BadgeCollectionResponse":
        return cls(
            owned=[UserBadgeResponse.model_validate(badge) for badge in collection.owned],
            equipped=collection.equipped,
        )


class EquippedBadgesUpdate(BaseModel):
    """Posição de cada badge no perfil; `null` deixa o espaço livre."""

    slots: list[str | None] = Field(..., max_length=MAX_EQUIPPED)


class EquippedBadgesResponse(BaseModel):
    equipped: list[str | None]
