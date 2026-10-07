import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.interfaces.friendship_repository import AbstractFriendshipRepository
from app.domain.models.friendship import Friendship, FriendshipStatus

_WITH_USERS = (selectinload(Friendship.requester), selectinload(Friendship.addressee))


class FriendshipRepository(AbstractFriendshipRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _load(self, friendship_id: uuid.UUID) -> Friendship | None:
        result = await self._session.execute(
            select(Friendship).options(*_WITH_USERS).where(Friendship.id == friendship_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, friendship_id: uuid.UUID) -> Friendship | None:
        return await self._load(friendship_id)

    async def get_between(self, user_a: uuid.UUID, user_b: uuid.UUID) -> Friendship | None:
        result = await self._session.execute(
            select(Friendship)
            .options(*_WITH_USERS)
            .where(
                or_(
                    and_(Friendship.requester_id == user_a, Friendship.addressee_id == user_b),
                    and_(Friendship.requester_id == user_b, Friendship.addressee_id == user_a),
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, user_id: uuid.UUID, status: FriendshipStatus
    ) -> list[Friendship]:
        result = await self._session.execute(
            select(Friendship)
            .options(*_WITH_USERS)
            .where(
                Friendship.status == status,
                or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
            )
            .order_by(Friendship.updated_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, requester_id: uuid.UUID, addressee_id: uuid.UUID) -> Friendship:
        friendship = Friendship(requester_id=requester_id, addressee_id=addressee_id)
        self._session.add(friendship)
        await self._session.flush()
        return await self._load(friendship.id)

    async def accept(self, friendship: Friendship) -> Friendship:
        friendship.status = FriendshipStatus.accepted
        await self._session.flush()
        return await self._load(friendship.id)

    async def delete(self, friendship: Friendship) -> None:
        await self._session.delete(friendship)
        await self._session.flush()
