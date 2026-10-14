import uuid
from abc import ABC, abstractmethod

from app.domain.models.user import User


class AbstractFollowRepository(ABC):
    @abstractmethod
    async def exists(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> bool: ...

    @abstractmethod
    async def create(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> None: ...

    @abstractmethod
    async def delete(self, follower_id: uuid.UUID, followed_id: uuid.UUID) -> bool:
        """Apaga o vínculo; devolve False se ele não existia."""

    @abstractmethod
    async def count_followers(self, user_id: uuid.UUID) -> int: ...

    @abstractmethod
    async def list_following(self, follower_id: uuid.UUID) -> list[User]:
        """Usuários que follower_id segue, do mais recente para o mais antigo."""
