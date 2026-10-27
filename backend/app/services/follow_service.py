import logging
import uuid

from app.domain.interfaces.follow_repository import AbstractFollowRepository
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.user import User
from app.infrastructure.exceptions import BadRequestError, ForbiddenError, NotFoundError

logger = logging.getLogger(__name__)


class FollowService:
    """Seguir contas especialistas. Seguir é unilateral (não precisa ser aceito)."""

    def __init__(
        self, repository: AbstractFollowRepository, user_repository: AbstractUserRepository
    ) -> None:
        self._repo = repository
        self._users = user_repository

    async def _get_expert(self, user_id: uuid.UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if not user or not user.is_active:
            raise NotFoundError("User", user_id)
        if not user.is_expert:
            raise BadRequestError("Only expert accounts can be followed.")
        return user

    async def follow(self, follower_id: uuid.UUID, expert_id: uuid.UUID) -> int:
        """Segue o especialista (sem erro se já seguia). Devolve o total de seguidores."""
        if follower_id == expert_id:
            raise BadRequestError("You cannot follow yourself.")
        await self._get_expert(expert_id)
        if not await self._repo.exists(follower_id, expert_id):
            await self._repo.create(follower_id, expert_id)
            logger.info("Follow: %s -> %s", follower_id, expert_id)
        return await self._repo.count_followers(expert_id)

    async def unfollow(self, follower_id: uuid.UUID, expert_id: uuid.UUID) -> int:
        """Deixa de seguir (sem erro se não seguia). Devolve o total de seguidores."""
        if await self._repo.delete(follower_id, expert_id):
            logger.info("Unfollow: %s -> %s", follower_id, expert_id)
        return await self._repo.count_followers(expert_id)

    async def list_followers(self, user: User) -> list[User]:
        if not user.is_expert:
            raise ForbiddenError("Only expert accounts have followers.")
        return await self._repo.list_followers(user.id)

    async def list_following(self, follower_id: uuid.UUID) -> list[User]:
        return await self._repo.list_following(follower_id)
