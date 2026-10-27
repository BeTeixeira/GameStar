import uuid
import logging
from collections.abc import Awaitable, Callable

from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.models.notification import NotificationType
from app.domain.models.review import Review
from app.domain.models.user import User, UserRole
from app.domain.schemas.review import ReviewCreate, ReviewUpdate
from app.infrastructure.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

ModerationHook = Callable[[Review, User], Awaitable[None]]

_EXPERT_ONLY_FIELDS = ("title", "pros", "cons")


class ReviewService:
    def __init__(
        self,
        repository: AbstractReviewRepository,
        notifications: NotificationService,
        moderation_hook: ModerationHook | None = None,
    ) -> None:
        self._repo = repository
        self._notifications = notifications
        self._moderation_hook = moderation_hook

    async def get_review(self, review_id: uuid.UUID) -> Review:
        review = await self._repo.get_by_id(review_id)
        if not review:
            raise NotFoundError("Review", review_id)
        return review

    async def list_by_game(
        self, game_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        return await self._repo.list_by_game(game_id, skip=skip, limit=limit)

    async def list_by_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        return await self._repo.list_by_user(user_id, skip=skip, limit=limit)

    @staticmethod
    def _ensure_not_muted(user: User) -> None:
        if user.is_muted:
            raise ForbiddenError("Your account is muted.")

    @staticmethod
    def _ensure_expert_fields_allowed(author: User, data: ReviewCreate | ReviewUpdate) -> None:
        if author.is_expert:
            return
        sent = data.model_dump(exclude_unset=True)
        if any(sent.get(field) is not None for field in _EXPERT_ONLY_FIELDS) or sent.get("pinned"):
            raise BadRequestError("Only expert accounts can use title, pros, cons or pinned.")

    async def create_review(self, author: User, data: ReviewCreate) -> Review:
        self._ensure_not_muted(author)
        self._ensure_expert_fields_allowed(author, data)
        if data.pinned:
            await self._repo.unpin_all(author.id)
        review = await self._repo.create(author.id, data)
        logger.info("Review created: id=%s user=%s game=%s", review.id, author.id, data.game_id)
        return review

    async def update_review(
        self, review_id: uuid.UUID, author: User, data: ReviewUpdate
    ) -> Review:
        self._ensure_not_muted(author)
        review = await self.get_review(review_id)
        if review.user_id != author.id:
            raise ForbiddenError("You can only edit your own reviews.")
        self._ensure_expert_fields_allowed(author, data)
        if data.pinned:
            await self._repo.unpin_all(author.id)
        updated = await self._repo.update(review, data)
        logger.info("Review updated: id=%s", review_id)
        return updated

    async def delete_review(self, review_id: uuid.UUID, requester: User) -> None:
        """O autor apaga a própria avaliação; admin/moderador apaga qualquer uma (moderação)."""
        review = await self.get_review(review_id)
        is_author = review.user_id == requester.id
        if is_author:
            self._ensure_not_muted(requester)
        else:
            if not requester.can_moderate:
                raise ForbiddenError("You can only delete your own reviews.")
            if requester.role != UserRole.admin and review.user.can_moderate:
                raise ForbiddenError("Moderators cannot remove reviews of admins or moderators.")
        await self._repo.delete(review)
        logger.info("Review deleted: id=%s", review_id)
        if not is_author:
            await self._on_removed_by_moderation(review, requester)

    async def _on_removed_by_moderation(self, review: Review, moderator: User) -> None:
        if self._moderation_hook is not None:
            await self._moderation_hook(review, moderator)
            return
        await self._notifications.notify(
            review.user_id,
            NotificationType.review_removed,
            "Comentário removido",
            f"Seu comentário em {review.game.title} foi removido pela moderação.",
            f"/jogo/{review.game_id}",
        )
