import uuid
from abc import ABC, abstractmethod

from app.domain.models.expert_request import ExpertRequest, ExpertRequestStatus


class AbstractExpertRequestRepository(ABC):
    @abstractmethod
    async def add(self, request: ExpertRequest) -> ExpertRequest: ...

    @abstractmethod
    async def get_by_id(self, request_id: uuid.UUID) -> ExpertRequest | None: ...

    @abstractmethod
    async def get_latest_for_user(self, user_id: uuid.UUID) -> ExpertRequest | None: ...

    @abstractmethod
    async def has_pending(self, user_id: uuid.UUID) -> bool: ...

    @abstractmethod
    async def list_filtered(
        self, status: ExpertRequestStatus | None, *, skip: int, limit: int
    ) -> list[ExpertRequest]:
        """Da mais recente para a mais antiga."""

    @abstractmethod
    async def save(self, request: ExpertRequest) -> ExpertRequest: ...
