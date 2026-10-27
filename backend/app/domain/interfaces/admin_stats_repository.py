from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class StatsCounts:
    users: int
    experts: int
    moderators: int
    banned: int
    muted: int
    games: int
    reviews: int
    pending_expert_requests: int
    pending_reports: int


@dataclass(frozen=True)
class PendingExpertRequestRow:
    request_id: str
    username: str
    created_at: datetime


@dataclass(frozen=True)
class PendingReportRow:
    author_name: str
    game_title: str
    created_at: datetime


class AbstractAdminStatsRepository(ABC):
    @abstractmethod
    async def counts(self) -> StatsCounts: ...

    @abstractmethod
    async def newest_pending_expert_requests(self, limit: int) -> list[PendingExpertRequestRow]: ...

    @abstractmethod
    async def newest_pending_report_groups(self, limit: int) -> list[PendingReportRow]:
        """Um item por comentário denunciado, com a data da denúncia pendente mais recente."""
