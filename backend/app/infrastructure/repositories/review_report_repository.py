import uuid
from datetime import datetime, timezone

from sqlalchemy import distinct, func, or_, select, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.review_report_repository import AbstractReviewReportRepository
from app.domain.models.review_report import ReportStatus, ReviewReport


class ReviewReportRepository(AbstractReviewReportRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add_if_new(self, report: ReviewReport) -> None:
        existing = await self._session.execute(
            select(ReviewReport.id).where(
                ReviewReport.review_id == report.review_id,
                ReviewReport.reporter_id == report.reporter_id,
            )
        )
        if existing.first() is not None:
            return
        self._session.add(report)
        await self._session.flush()

    async def list_reported_review_ids(
        self, reporter_id: uuid.UUID, game_id: uuid.UUID
    ) -> list[uuid.UUID]:
        result = await self._session.execute(
            select(ReviewReport.review_id)
            .where(ReviewReport.reporter_id == reporter_id, ReviewReport.game_id == game_id)
            .distinct()
        )
        return list(result.scalars().all())

    async def list_group_keys(
        self, status: ReportStatus, query: str | None, *, skip: int, limit: int
    ) -> list[uuid.UUID]:
        statement = select(ReviewReport.review_id).where(ReviewReport.status == status)
        if query:
            pattern = f"%{query}%"
            statement = statement.where(
                or_(
                    ReviewReport.review_body.ilike(pattern),
                    ReviewReport.review_author_name.ilike(pattern),
                    ReviewReport.game_title.ilike(pattern),
                )
            )
        result = await self._session.execute(
            statement.group_by(ReviewReport.review_id)
            .order_by(func.max(ReviewReport.created_at).desc(), ReviewReport.review_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_by_reviews(
        self, review_ids: list[uuid.UUID], status: ReportStatus
    ) -> list[ReviewReport]:
        if not review_ids:
            return []
        result = await self._session.execute(
            select(ReviewReport)
            .where(ReviewReport.review_id.in_(review_ids), ReviewReport.status == status)
            .order_by(ReviewReport.created_at.desc())
            .execution_options(populate_existing=True)
        )
        return list(result.scalars().all())

    async def count_pending_reviews(self) -> int:
        result = await self._session.execute(
            select(func.count(distinct(ReviewReport.review_id))).where(
                ReviewReport.status == ReportStatus.pending
            )
        )
        return result.scalar_one()

    async def resolve_pending(
        self, review_id: uuid.UUID, status: ReportStatus, moderator_id: uuid.UUID
    ) -> int:
        result = await self._session.execute(
            sql_update(ReviewReport)
            .where(
                ReviewReport.review_id == review_id,
                ReviewReport.status == ReportStatus.pending,
            )
            .values(
                status=status,
                resolved_by_id=moderator_id,
                resolved_at=datetime.now(timezone.utc),
            )
            .execution_options(synchronize_session="fetch")
        )
        return result.rowcount
