import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.follow_repository import AbstractFollowRepository
from app.domain.models.follow import Follow
from app.domain.models.user import User


class FollowRepository(AbstractFollowRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def exists(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> bool:
        return await self._session.get(Follow, (follower_id, followed_id)) is not None

    async def create(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> None:
        self._session.add(Follow(follower_id=follower_id, followed_id=followed_id))
        await self._session.flush()

    async def delete(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            delete(Follow).where(
                Follow.follower_id == follower_id, Follow.followed_id == followed_id
            )
        )
        await self._session.flush()
        return result.rowcount > 0

    async def count_followers(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Follow).where(Follow.followed_id == user_id)
        )
        return result.scalar_one()

    async def list_following(self, follower_id: uuid.UUID) -> list[User]:
        result = await self._session.execute(
            select(User)
            .join(Follow, Follow.followed_id == User.id)
            .where(Follow.follower_id == follower_id)
            .order_by(Follow.created_at.desc())
        )
        return list(result.scalars().all())
