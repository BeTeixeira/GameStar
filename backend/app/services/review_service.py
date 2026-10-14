import uuid
import logging

from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.models.review import Review
from app.domain.schemas.review import ReviewCreate, ReviewUpdate
from app.infrastructure.exceptions import ForbiddenError, NotFoundError

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self, repository: AbstractReviewRepository) -> None:
        self._repo = repository

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

    async def create_review(self, user_id: uuid.UUID, data: ReviewCreate) -> Review:
        review = await self._repo.create(user_id, data)
        logger.info("Review created: id=%s user=%s game=%s", review.id, user_id, data.game_id)
        return review

    async def update_review(
        self, review_id: uuid.UUID, requester_id: uuid.UUID, data: ReviewUpdate
    ) -> Review:
        review = await self.get_review(review_id)
        if review.user_id != requester_id:
            raise ForbiddenError("You can only edit your own reviews.")
        updated = await self._repo.update(review, data)
        logger.info("Review updated: id=%s", review_id)
        return updated

    async def delete_review(
        self, review_id: uuid.UUID, requester_id: uuid.UUID, *, is_admin: bool = False
    ) -> None:
        """O autor apaga a própria avaliação; o admin apaga qualquer uma (moderação)."""
        review = await self.get_review(review_id)
        if review.user_id != requester_id and not is_admin:
            raise ForbiddenError("You can only delete your own reviews.")
        await self._repo.delete(review)
        logger.info("Review deleted: id=%s", review_id)
