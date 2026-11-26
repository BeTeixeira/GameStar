import uuid
from abc import ABC, abstractmethod

from app.domain.models.user_badge import UserBadge


class AbstractBadgeRepository(ABC):
    @abstractmethod
    async def list_by_user(self, user_id: uuid.UUID) -> list[UserBadge]: ...

    @abstractmethod
    async def create(self, user_id: uuid.UUID, badge_id: str) -> UserBadge: ...

    @abstractmethod
    async def set_slots(self, badges: list[UserBadge], slots: dict[str, int]) -> None: ...
