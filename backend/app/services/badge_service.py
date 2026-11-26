import logging
import uuid
from dataclasses import dataclass

from app.domain.badge_catalog import BADGE_IDS
from app.domain.interfaces.badge_repository import AbstractBadgeRepository
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.user_badge import UserBadge
from app.infrastructure.exceptions import BadRequestError, ConflictError, NotFoundError

logger = logging.getLogger(__name__)

MAX_EQUIPPED = 6


@dataclass(frozen=True)
class BadgeCollection:
    owned: list[UserBadge]
    equipped: list[str | None]


def equipped_slots(badges: list[UserBadge]) -> list[str | None]:
    slots: list[str | None] = [None] * MAX_EQUIPPED
    for badge in badges:
        if badge.slot is not None and 0 <= badge.slot < MAX_EQUIPPED:
            slots[badge.slot] = badge.badge_id
    return slots


class BadgeService:
    """Loja de badges. Na fase de testes todo resgate é gratuito."""

    def __init__(
        self, repository: AbstractBadgeRepository, user_repository: AbstractUserRepository
    ) -> None:
        self._repo = repository
        self._users = user_repository

    async def get_collection(self, user_id: uuid.UUID) -> BadgeCollection:
        badges = await self._repo.list_by_user(user_id)
        return BadgeCollection(owned=badges, equipped=equipped_slots(badges))

    async def redeem(self, user_id: uuid.UUID, badge_id: str) -> UserBadge:
        if badge_id not in BADGE_IDS:
            raise NotFoundError("Badge", badge_id)
        badges = await self._repo.list_by_user(user_id)
        if any(badge.badge_id == badge_id for badge in badges):
            raise ConflictError("Badge already redeemed.")
        badge = await self._repo.create(user_id, badge_id)
        logger.info("Badge redeemed: user=%s badge=%s", user_id, badge_id)
        return badge

    async def set_equipped(
        self, user_id: uuid.UUID, slots: list[str | None]
    ) -> BadgeCollection:
        if len(slots) > MAX_EQUIPPED:
            raise BadRequestError(f"At most {MAX_EQUIPPED} badges can be equipped.")
        chosen = [badge_id for badge_id in slots if badge_id is not None]
        if len(chosen) != len(set(chosen)):
            raise BadRequestError("The same badge cannot be equipped twice.")

        badges = await self._repo.list_by_user(user_id)
        owned_ids = {badge.badge_id for badge in badges}
        missing = [badge_id for badge_id in chosen if badge_id not in owned_ids]
        if missing:
            raise BadRequestError(f"Badge not redeemed: {missing[0]}")

        positions = {badge_id: index for index, badge_id in enumerate(slots) if badge_id}
        await self._repo.set_slots(badges, positions)
        return BadgeCollection(owned=badges, equipped=equipped_slots(badges))

    async def get_equipped_of(self, user_id: uuid.UUID) -> list[str | None]:
        if not await self._users.get_by_id(user_id):
            raise NotFoundError("User", user_id)
        return equipped_slots(await self._repo.list_by_user(user_id))
