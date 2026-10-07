import logging
import uuid

from app.domain.interfaces.friendship_repository import AbstractFriendshipRepository
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.friendship import Friendship, FriendshipStatus
from app.infrastructure.exceptions import ConflictError, ForbiddenError, NotFoundError

logger = logging.getLogger(__name__)


class FriendshipService:
    def __init__(
        self, repository: AbstractFriendshipRepository, user_repository: AbstractUserRepository
    ) -> None:
        self._repo = repository
        self._users = user_repository

    async def list_friends(self, user_id: uuid.UUID) -> list[Friendship]:
        return await self._repo.list_for_user(user_id, FriendshipStatus.accepted)

    async def list_requests(self, user_id: uuid.UUID) -> list[Friendship]:
        return await self._repo.list_for_user(user_id, FriendshipStatus.pending)

    async def send_request(self, user_id: uuid.UUID, username: str) -> Friendship:
        """Pede amizade a `username`. Se ele já tinha pedido para o usuário, aceita na hora."""
        target = await self._users.get_by_username(username.strip())
        if not target or not target.is_active:
            raise NotFoundError("User", username)
        if target.id == user_id:
            raise ConflictError("You cannot add yourself as a friend.")

        existing = await self._repo.get_between(user_id, target.id)
        if existing:
            if existing.status == FriendshipStatus.accepted:
                raise ConflictError("You are already friends.")
            if existing.requester_id == user_id:
                raise ConflictError("Friend request already sent.")
            logger.info("Friend request auto-accepted: id=%s", existing.id)
            return await self._repo.accept(existing)

        friendship = await self._repo.create(user_id, target.id)
        logger.info("Friend request sent: id=%s from=%s to=%s", friendship.id, user_id, target.id)
        return friendship

    async def _get_pending(self, friendship_id: uuid.UUID) -> Friendship:
        friendship = await self._repo.get_by_id(friendship_id)
        if not friendship or friendship.status != FriendshipStatus.pending:
            raise NotFoundError("Friend request", friendship_id)
        return friendship

    async def accept_request(self, user_id: uuid.UUID, friendship_id: uuid.UUID) -> Friendship:
        friendship = await self._get_pending(friendship_id)
        if friendship.addressee_id != user_id:
            raise ForbiddenError("Only the recipient can accept a friend request.")
        return await self._repo.accept(friendship)

    async def delete_request(self, user_id: uuid.UUID, friendship_id: uuid.UUID) -> None:
        """Recusa (quem recebeu) ou cancela (quem enviou) um pedido pendente."""
        friendship = await self._get_pending(friendship_id)
        if user_id not in (friendship.requester_id, friendship.addressee_id):
            raise ForbiddenError("This friend request is not yours.")
        await self._repo.delete(friendship)

    async def remove_friend(self, user_id: uuid.UUID, friend_id: uuid.UUID) -> None:
        friendship = await self._repo.get_between(user_id, friend_id)
        if not friendship or friendship.status != FriendshipStatus.accepted:
            raise NotFoundError("Friendship", friend_id)
        await self._repo.delete(friendship)
