import uuid
from abc import ABC, abstractmethod

from app.domain.models.notification import Notification, NotificationType


class AbstractNotificationRepository(ABC):
    @abstractmethod
    async def create(
        self,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        body: str,
        data: dict | None,
    ) -> Notification: ...

    @abstractmethod
    async def list_for_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Notification]:
        """Mais recentes primeiro."""

    @abstractmethod
    async def unread_count(self, user_id: uuid.UUID) -> int: ...

    @abstractmethod
    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> bool:
        """Marca como lida; devolve False se não existe ou não é do usuário."""

    @abstractmethod
    async def mark_all_read(self, user_id: uuid.UUID) -> None: ...

    @abstractmethod
    async def list_tokens(self, user_id: uuid.UUID) -> list[str]: ...

    @abstractmethod
    async def upsert_token(self, user_id: uuid.UUID, token: str, platform: str) -> None:
        """Registra o token; se era de outro usuário, passa a ser deste."""

    @abstractmethod
    async def delete_token(self, user_id: uuid.UUID, token: str) -> None: ...

    @abstractmethod
    async def delete_tokens(self, tokens: list[str]) -> None: ...
