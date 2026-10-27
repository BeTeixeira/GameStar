import logging
import uuid

from app.domain.interfaces.review_report_repository import AbstractReviewReportRepository
from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.notification import NotificationType
from app.domain.models.review import Review
from app.domain.models.review_report import ReportReason, ReportStatus, ReviewReport
from app.domain.models.user import User, UserRole
from app.domain.schemas.moderation import ReportGroup
from app.infrastructure.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.services.notification_service import NotificationService
from app.services.review_removal import ensure_can_remove, notify_review_removed

logger = logging.getLogger(__name__)


class ModerationService:
    def __init__(
        self,
        reports: AbstractReviewReportRepository,
        reviews: AbstractReviewRepository,
        users: AbstractUserRepository,
        notifications: NotificationService,
    ) -> None:
        self._reports = reports
        self._reviews = reviews
        self._users = users
        self._notifications = notifications

    # ── Denúncias (qualquer usuário) ───────────────────────

    async def report(self, reporter: User, review_id: uuid.UUID, reason: ReportReason) -> None:
        if reporter.is_muted:
            raise ForbiddenError("Your account is muted.")
        review = await self._reviews.get_by_id(review_id)
        if not review:
            raise NotFoundError("Review", review_id)
        if review.user_id == reporter.id:
            raise BadRequestError("You cannot report your own review.")
        await self._reports.add_if_new(
            ReviewReport(
                review_id=review.id,
                reporter_id=reporter.id,
                reason=reason,
                review_body=review.body or "",
                review_rating=review.rating,
                review_author_id=review.user_id,
                review_author_name=(review.user.display_name or review.user.username)[:60],
                game_id=review.game_id,
                game_title=review.game.title[:200],
            )
        )
        logger.info("Review reported: review=%s reporter=%s reason=%s", review_id, reporter.id, reason)

    async def my_reported_review_ids(
        self, reporter: User, game_id: uuid.UUID
    ) -> list[uuid.UUID]:
        return await self._reports.list_reported_review_ids(reporter.id, game_id)

    # ── Log de denúncias (moderação) ───────────────────────

    async def list_reports(
        self, status: ReportStatus, query: str | None, *, skip: int = 0, limit: int = 20
    ) -> list[ReportGroup]:
        cleaned = query.strip() if query else None
        review_ids = await self._reports.list_group_keys(
            status, cleaned or None, skip=skip, limit=limit
        )
        rows = await self._reports.list_by_reviews(review_ids, status)
        rows_by_review: dict[uuid.UUID, list[ReviewReport]] = {}
        for row in rows:
            rows_by_review.setdefault(row.review_id, []).append(row)
        return [await self._to_group(rows_by_review[rid], status) for rid in review_ids]

    async def _to_group(self, rows: list[ReviewReport], status: ReportStatus) -> ReportGroup:
        latest = rows[0]
        review = await self._reviews.get_by_id(latest.review_id)
        author = (
            await self._users.get_by_id(latest.review_author_id)
            if latest.review_author_id
            else None
        )
        return ReportGroup(
            review_id=latest.review_id,
            review_exists=review is not None,
            current_body=review.body if review else None,
            review_body=latest.review_body,
            review_rating=latest.review_rating,
            author_id=latest.review_author_id,
            author_name=latest.review_author_name,
            author_is_muted=author.is_muted if author else None,
            author_is_active=author.is_active if author else None,
            game_id=latest.game_id,
            game_title=latest.game_title,
            reasons=list(dict.fromkeys(row.reason for row in rows)),
            reporters_count=len(rows),
            last_reported_at=latest.created_at,
            status=status,
        )

    async def pending_count(self) -> int:
        return await self._reports.count_pending_reviews()

    async def keep(self, moderator: User, review_id: uuid.UUID) -> None:
        resolved = await self._reports.resolve_pending(review_id, ReportStatus.kept, moderator.id)
        if not resolved:
            raise NotFoundError("Report", review_id)
        logger.info("Reports kept: review=%s by=%s", review_id, moderator.id)

    async def remove_review(self, moderator: User, review_id: uuid.UUID) -> None:
        review = await self._reviews.get_by_id(review_id)
        if review is None:
            resolved = await self._reports.resolve_pending(
                review_id, ReportStatus.removed, moderator.id
            )
            if not resolved:
                raise NotFoundError("Review", review_id)
            return
        ensure_can_remove(moderator, review)
        await self._reviews.delete(review)
        await self.on_review_removed(review, moderator)

    async def on_review_removed(self, review: Review, moderator: User) -> None:
        """Chamado depois que um moderador apagou o comentário: fecha as denúncias e avisa o autor."""
        await self._reports.resolve_pending(review.id, ReportStatus.removed, moderator.id)
        await notify_review_removed(self._notifications, review)
        logger.info("Review removed by moderation: id=%s by=%s", review.id, moderator.id)

    async def recent_reviews(
        self, query: str | None, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        cleaned = query.strip() if query else None
        return await self._reviews.list_recent(cleaned or None, skip=skip, limit=limit)

    # ── Ações sobre usuários ───────────────────────────────

    async def _target(self, actor: User, user_id: uuid.UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        if user.id == actor.id:
            raise ForbiddenError("You cannot moderate your own account.")
        if user.role == UserRole.admin:
            raise ForbiddenError("Administrators cannot be moderated.")
        if actor.role != UserRole.admin and user.can_moderate:
            raise ForbiddenError("Moderators cannot act on other moderators.")
        return user

    async def ban(self, moderator: User, user_id: uuid.UUID) -> User:
        user = await self._target(moderator, user_id)
        if not user.is_active:
            return user
        await self._users.set_field(user, "is_active", False)
        updated = await self._users.set_field(user, "deactivated_by_role", moderator.role.value)
        logger.info("User banned: id=%s by=%s", user_id, moderator.id)
        return updated

    async def unban(self, moderator: User, user_id: uuid.UUID) -> User:
        user = await self._target(moderator, user_id)
        if moderator.role != UserRole.admin and user.deactivated_by_role != UserRole.moderator.value:
            raise ForbiddenError("Only an administrator can undo this ban.")
        await self._users.set_field(user, "is_active", True)
        updated = await self._users.set_field(user, "deactivated_by_role", None)
        logger.info("User unbanned: id=%s by=%s", user_id, moderator.id)
        return updated

    async def mute(self, moderator: User, user_id: uuid.UUID) -> User:
        user = await self._target(moderator, user_id)
        if user.is_muted:
            return user
        updated = await self._users.set_field(user, "is_muted", True)
        await self._notifications.notify(
            user.id,
            NotificationType.muted,
            "Conta silenciada",
            "Você não pode comentar nem denunciar comentários até a moderação liberar.",
            "/avisos",
        )
        logger.info("User muted: id=%s by=%s", user_id, moderator.id)
        return updated

    async def unmute(self, moderator: User, user_id: uuid.UUID) -> User:
        user = await self._target(moderator, user_id)
        if not user.is_muted:
            return user
        updated = await self._users.set_field(user, "is_muted", False)
        await self._notifications.notify(
            user.id,
            NotificationType.unmuted,
            "Silêncio retirado",
            "Você já pode comentar de novo.",
            "/avisos",
        )
        logger.info("User unmuted: id=%s by=%s", user_id, moderator.id)
        return updated
