import logging
import uuid

from app.core.security import hash_password, verify_password
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.user import AccountType, User, UserRole
from app.domain.schemas.user import AccountTypeUpdate, UserCreate, UserUpdate
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

    async def list_users(
        self, *, query: str | None = None, skip: int = 0, limit: int = 20
    ) -> list[User]:
        if query and query.strip():
            return await self._repo.search(query.strip(), skip=skip, limit=limit)
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

    @staticmethod
    def _check_expert_fields(user: User, data: UserUpdate) -> None:
        sent = data.model_fields_set
        if not user.is_expert and sent & {"company", "expertise_area"}:
            raise BadRequestError("Only expert accounts have company and expertise_area.")
        if user.is_expert and "expertise_area" in sent and data.expertise_area is None:
            raise BadRequestError("Expert accounts require an expertise_area.")

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        self._check_expert_fields(user, data)
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

    # ── Ações de admin ─────────────────────────────────────

    async def set_active(self, admin: User, user_id: uuid.UUID, active: bool) -> User:
        if admin.id == user_id:
            raise BadRequestError("You cannot change the status of your own account.")
        user = await self.get_user(user_id)
        updated = await self._repo.set_field(user, "is_active", active)
        await self._repo.set_field(user, "deactivated_by_role", None if active else "admin")
        action = "activated" if active else "deactivated"
        logger.info("User %s: id=%s by admin=%s", action, user_id, admin.id)
        return updated

    async def set_role(self, user_id: uuid.UUID, role: UserRole) -> User:
        user = await self.get_user(user_id)
        if user.role == UserRole.admin:
            raise BadRequestError("The role of an administrator cannot be changed.")
        if user.is_expert:
            raise BadRequestError("Expert accounts cannot be moderators.")
        updated = await self._repo.set_field(user, "role", role)
        logger.info("Role changed: id=%s -> %s", user_id, role.value)
        return updated

    async def set_account_type(self, user_id: uuid.UUID, data: AccountTypeUpdate) -> User:
        """Torna a conta especialista (com área) ou volta para normal (limpa área e empresa)."""
        user = await self.get_user(user_id)
        await self._repo.set_field(user, "account_type", data.account_type)
        await self._repo.set_field(user, "expertise_area", data.expertise_area)
        if data.account_type == AccountType.normal:
            await self._repo.set_field(user, "company", None)
        logger.info("Account type: id=%s -> %s", user_id, data.account_type.value)
        return user

    async def delete_by_admin(self, admin: User, user_id: uuid.UUID) -> None:
        if admin.id == user_id:
            raise BadRequestError("Use the profile screen to delete your own account.")
        await self.delete_user(user_id)

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
