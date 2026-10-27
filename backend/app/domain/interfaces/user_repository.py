import uuid
from abc import ABC, abstractmethod

from app.domain.models.user import User
from app.domain.schemas.user import UserCreate, UserUpdate


class AbstractUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: uuid.UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def get_by_username(self, username: str) -> User | None: ...

    @abstractmethod
    async def list_filtered(
        self, query: str | None, account_filter: str | None, *, skip: int = 0, limit: int = 20
    ) -> list[User]:
        """Busca por nome de usuário, nome de exibição ou e-mail, filtrada por tipo de conta
        (normais, especialistas, moderadores, banidas, admins)."""

    @abstractmethod
    async def create(self, data: UserCreate) -> User: ...

    @abstractmethod
    async def update(self, user: User, data: UserUpdate) -> User: ...

    @abstractmethod
    async def get_by_github_id(self, github_id: str) -> User | None: ...

    @abstractmethod
    async def delete(self, user: User) -> None: ...

    @abstractmethod
    async def set_password(self, user: User, hashed_password: str) -> None: ...

    @abstractmethod
    async def set_field(self, user: User, field: str, value: object) -> User: ...
