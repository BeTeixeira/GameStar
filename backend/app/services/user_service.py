import logging
import uuid

from app.core.security import hash_password, verify_password
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.user import User
from app.domain.schemas.user import UserCreate, UserUpdate
from app.infrastructure.exceptions import BadRequestError, ConflictError, NotFoundError
from app.infrastructure.storage import ImageKind, ImageStorage

logger = logging.getLogger(__name__)


class UserService:
    def __init__(
        self, repository: AbstractUserRepository, storage: ImageStorage | None = None
    ) -> None:
        self._repo = repository
        self._storage = storage or ImageStorage()

    async def get_user_or_none(self, user_id: uuid.UUID) -> User | None:
        return await self._repo.get_by_id(user_id)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def list_users(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        return await self._repo.list_all(skip=skip, limit=limit)

    async def _check_unique(self, user: User, data: UserUpdate) -> None:
        if data.email and data.email != user.email and await self._repo.get_by_email(data.email):
            raise ConflictError(f"Email '{data.email}' is already registered.")
        if (
            data.username
            and data.username != user.username
            and await self._repo.get_by_username(data.username)
        ):
            raise ConflictError(f"Username '{data.username}' is already taken.")

    async def create_user(self, data: UserCreate) -> User:
        if await self._repo.get_by_email(data.email):
            raise ConflictError(f"Email '{data.email}' is already registered.")
        if await self._repo.get_by_username(data.username):
            raise ConflictError(f"Username '{data.username}' is already taken.")
        user = await self._repo.create(data)
        logger.info("User created: id=%s email=%s", user.id, user.email)
        return user

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        await self._check_unique(user, data)
        updated = await self._repo.update(user, data)
        logger.info("User updated: id=%s", user_id)
        return updated

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self.get_user(user_id)
        self._storage.delete(user.avatar_url)
        self._storage.delete(user.banner_url)
        await self._repo.delete(user)
        logger.info("User deleted: id=%s", user_id)

    # ── Conta do próprio usuário (/users/me) ──────────────

    async def change_password(self, user: User, current: str, new: str) -> None:
        if not verify_password(current, user.hashed_password):
            raise BadRequestError("Current password is incorrect.")
        if verify_password(new, user.hashed_password):
            raise BadRequestError("New password must be different from the current one.")
        await self._repo.set_password(user, hash_password(new))
        logger.info("Password changed: id=%s", user.id)

    async def delete_own_account(self, user: User, password: str) -> None:
        if not verify_password(password, user.hashed_password):
            raise BadRequestError("Password is incorrect.")
        await self.delete_user(user.id)

    async def set_image(self, user: User, kind: ImageKind, data: bytes) -> User:
        """Troca a foto (avatars) ou o fundo (banners); apaga o arquivo anterior."""
        url = self._storage.save(kind, data)
        field = "avatar_url" if kind == "avatars" else "banner_url"
        old = getattr(user, field)
        updated = await self._repo.set_field(user, field, url)
        self._storage.delete(old)
        return updated

    async def remove_image(self, user: User, kind: ImageKind) -> User:
        field = "avatar_url" if kind == "avatars" else "banner_url"
        self._storage.delete(getattr(user, field))
        return await self._repo.set_field(user, field, None)
