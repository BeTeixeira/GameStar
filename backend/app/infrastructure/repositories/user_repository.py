import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.user import User
from app.domain.schemas.user import UserCreate, UserUpdate

_REQUIRED_FIELDS = {"username", "email"}


class UserRepository(AbstractUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self._session.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def list_all(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        result = await self._session.execute(
            select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, data: UserCreate) -> User:
        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
        )
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user: User, data: UserUpdate) -> User:
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is None and field in _REQUIRED_FIELDS:
                continue  # username/email não podem ficar vazios
            setattr(user, field, value)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def set_password(self, user: User, hashed_password: str) -> None:
        user.hashed_password = hashed_password
        await self._session.flush()

    async def set_field(self, user: User, field: str, value: str | None) -> User:
        setattr(user, field, value)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def get_by_github_id(self, github_id: str) -> User | None:
        result = await self._session.execute(select(User).where(User.github_id == github_id))
        return result.scalar_one_or_none()

    async def delete(self, user: User) -> None:
        await self._session.delete(user)
        await self._session.flush()
