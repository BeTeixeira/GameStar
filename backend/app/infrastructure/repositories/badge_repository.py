import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.badge_repository import AbstractBadgeRepository
from app.domain.models.user_badge import UserBadge


class BadgeRepository(AbstractBadgeRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_user(self, user_id: uuid.UUID) -> list[UserBadge]:
        result = await self._session.execute(
            select(UserBadge)
            .where(UserBadge.user_id == user_id)
            .order_by(UserBadge.redeemed_at, UserBadge.badge_id)
        )
        return list(result.scalars().all())

    async def create(self, user_id: uuid.UUID, badge_id: str) -> UserBadge:
        badge = UserBadge(user_id=user_id, badge_id=badge_id)
        self._session.add(badge)
        await self._session.flush()
        await self._session.refresh(badge)
        return badge

    async def set_slots(self, badges: list[UserBadge], slots: dict[str, int]) -> None:
        """Troca as badges equipadas de uma vez: quem não está em `slots` fica desequipada."""
        for badge in badges:
            badge.slot = slots.get(badge.badge_id)
        await self._session.flush()
