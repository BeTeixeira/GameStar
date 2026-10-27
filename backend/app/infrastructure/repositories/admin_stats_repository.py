from sqlalchemy import distinct, false, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.admin_stats_repository import (
    AbstractAdminStatsRepository,
    PendingExpertRequestRow,
    PendingReportRow,
    StatsCounts,
)
from app.domain.models.expert_request import ExpertRequest, ExpertRequestStatus
from app.domain.models.game import Game
from app.domain.models.review import Review
from app.domain.models.review_report import ReportStatus, ReviewReport
from app.domain.models.user import AccountType, User, UserRole


class AdminStatsRepository(AbstractAdminStatsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _count(self, statement) -> int:
        return (await self._session.execute(statement)).scalar_one()

    async def counts(self) -> StatsCounts:
        users = select(func.count()).select_from(User)
        return StatsCounts(
            users=await self._count(users),
            experts=await self._count(
                users.where(User.account_type == AccountType.especialista)
            ),
            moderators=await self._count(users.where(User.role == UserRole.moderator)),
            banned=await self._count(users.where(User.is_active == false())),
            muted=await self._count(users.where(User.is_muted == true())),
            games=await self._count(select(func.count()).select_from(Game)),
            reviews=await self._count(select(func.count()).select_from(Review)),
            pending_expert_requests=await self._count(
                select(func.count())
                .select_from(ExpertRequest)
                .where(ExpertRequest.status == ExpertRequestStatus.pending)
            ),
            pending_reports=await self._count(
                select(func.count(distinct(ReviewReport.review_id))).where(
                    ReviewReport.status == ReportStatus.pending
                )
            ),
        )

    async def newest_pending_expert_requests(self, limit: int) -> list[PendingExpertRequestRow]:
        result = await self._session.execute(
            select(ExpertRequest)
            .where(ExpertRequest.status == ExpertRequestStatus.pending)
            .order_by(ExpertRequest.created_at.desc())
            .limit(limit)
        )
        return [
            PendingExpertRequestRow(str(row.id), row.username, row.created_at)
            for row in result.unique().scalars()
        ]

    async def newest_pending_report_groups(self, limit: int) -> list[PendingReportRow]:
        newest = func.max(ReviewReport.created_at)
        result = await self._session.execute(
            select(
                func.max(ReviewReport.review_author_name),
                func.max(ReviewReport.game_title),
                newest,
            )
            .where(ReviewReport.status == ReportStatus.pending)
            .group_by(ReviewReport.review_id)
            .order_by(newest.desc())
            .limit(limit)
        )
        return [PendingReportRow(author, title, created) for author, title, created in result]
