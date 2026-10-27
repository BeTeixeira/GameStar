import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.notification_repository import AbstractNotificationRepository
from app.domain.models.notification import Notification, NotificationType, PushToken


class NotificationRepository(AbstractNotificationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        body: str,
        data: dict | None,
    ) -> Notification:
        notification = Notification(user_id=user_id, type=type, title=title, body=body, data=data)
        self._session.add(notification)
        await self._session.flush()
        await self._session.refresh(notification)
        return notification

    async def list_for_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Notification]:
        result = await self._session.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_count(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        return result.scalar_one()

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> bool:
        notification = await self._session.get(Notification, notification_id)
        if not notification or notification.user_id != user_id:
            return False
        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc)
            await self._session.flush()
        return True

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self._session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc))
        )
        await self._session.flush()

    async def list_tokens(self, user_id: uuid.UUID) -> list[str]:
        result = await self._session.execute(
            select(PushToken.token).where(PushToken.user_id == user_id)
        )
        return list(result.scalars().all())

    async def upsert_token(self, user_id: uuid.UUID, token: str, platform: str) -> None:
        existing = await self._session.get(PushToken, token)
        if existing:
            existing.user_id = user_id
            existing.platform = platform
        else:
            self._session.add(PushToken(token=token, user_id=user_id, platform=platform))
        await self._session.flush()

    async def delete_token(self, user_id: uuid.UUID, token: str) -> None:
        await self._session.execute(
            delete(PushToken).where(PushToken.token == token, PushToken.user_id == user_id)
        )
        await self._session.flush()

    async def delete_tokens(self, tokens: list[str]) -> None:
        if not tokens:
            return
        await self._session.execute(delete(PushToken).where(PushToken.token.in_(tokens)))
        await self._session.flush()
