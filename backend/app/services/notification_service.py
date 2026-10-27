import logging
import uuid

from app.core.config import settings
from app.domain.interfaces.notification_repository import AbstractNotificationRepository
from app.domain.models.notification import Notification, NotificationType
from app.infrastructure.exceptions import NotFoundError
from app.infrastructure.push import PushSender

logger = logging.getLogger(__name__)


class NotificationService:
    """Guarda avisos no app e, se possível, também envia push. Push nunca quebra a ação."""

    def __init__(self, repository: AbstractNotificationRepository, push_sender: PushSender) -> None:
        self._repo = repository
        self._push = push_sender

    async def notify(
        self,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        body: str,
        route: str | None = None,
    ) -> None:
        data = {"route": route} if route else None
        await self._repo.create(user_id, type, title, body, data)
        if not settings.push_enabled:
            return
        tokens = await self._repo.list_tokens(user_id)
        if not tokens:
            return
        dead_tokens = await self._push.send(tokens, title, body, data or {})
        await self._repo.delete_tokens(dead_tokens)

    async def list_for_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Notification]:
        return await self._repo.list_for_user(user_id, skip=skip, limit=limit)

    async def unread_count(self, user_id: uuid.UUID) -> int:
        return await self._repo.unread_count(user_id)

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        if not await self._repo.mark_read(user_id, notification_id):
            raise NotFoundError("Notification", notification_id)

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self._repo.mark_all_read(user_id)

    async def register_token(self, user_id: uuid.UUID, token: str, platform: str) -> None:
        await self._repo.upsert_token(user_id, token, platform)

    async def remove_token(self, user_id: uuid.UUID, token: str) -> None:
        await self._repo.delete_token(user_id, token)
