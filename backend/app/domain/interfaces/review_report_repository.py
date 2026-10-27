import uuid
from abc import ABC, abstractmethod

from app.domain.models.review_report import ReportStatus, ReviewReport


class AbstractReviewReportRepository(ABC):
    @abstractmethod
    async def add_if_new(self, report: ReviewReport) -> None:
        """Grava a denúncia; ignora se o mesmo usuário já denunciou o mesmo comentário."""

    @abstractmethod
    async def list_reported_review_ids(
        self, reporter_id: uuid.UUID, game_id: uuid.UUID
    ) -> list[uuid.UUID]: ...

    @abstractmethod
    async def list_group_keys(
        self, status: ReportStatus, query: str | None, *, skip: int, limit: int
    ) -> list[uuid.UUID]:
        """Ids dos comentários com denúncias no status, da mais recente para a mais antiga."""

    @abstractmethod
    async def list_by_reviews(
        self, review_ids: list[uuid.UUID], status: ReportStatus
    ) -> list[ReviewReport]: ...

    @abstractmethod
    async def count_pending_reviews(self) -> int: ...

    @abstractmethod
    async def resolve_pending(
        self, review_id: uuid.UUID, status: ReportStatus, moderator_id: uuid.UUID
    ) -> int:
        """Muda as denúncias pendentes do comentário; devolve quantas foram resolvidas."""
