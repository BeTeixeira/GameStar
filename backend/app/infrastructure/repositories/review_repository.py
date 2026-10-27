import uuid

from sqlalchemy import or_, select, true, update as sql_update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.models.game import Game
from app.domain.models.review import Review
from app.domain.models.user import User
from app.domain.schemas.review import ReviewCreate, ReviewUpdate
from app.infrastructure.exceptions import ConflictError

_WITH_USER = selectinload(Review.user)
_WITH_GAME = selectinload(Review.game)


class ReviewRepository(AbstractReviewRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, review_id: uuid.UUID) -> Review | None:
        result = await self._session.execute(
            select(Review).options(_WITH_USER, _WITH_GAME).where(Review.id == review_id)
        )
        return result.scalar_one_or_none()

    async def list_by_game(
        self, game_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        result = await self._session.execute(
            select(Review)
            .options(_WITH_USER, _WITH_GAME)
            .where(Review.game_id == game_id)
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_by_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        result = await self._session.execute(
            select(Review)
            .options(_WITH_USER, _WITH_GAME)
            .where(Review.user_id == user_id)
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_recent(
        self, query: str | None, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        statement = (
            select(Review)
            .join(User, Review.user_id == User.id)
            .join(Game, Review.game_id == Game.id)
            .options(_WITH_USER, _WITH_GAME)
        )
        if query:
            pattern = f"%{query}%"
            statement = statement.where(
                or_(
                    Review.body.ilike(pattern),
                    User.username.ilike(pattern),
                    User.display_name.ilike(pattern),
                    Game.title.ilike(pattern),
                )
            )
        result = await self._session.execute(
            statement.order_by(Review.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, user_id: uuid.UUID, data: ReviewCreate) -> Review:
        review = Review(
            user_id=user_id,
            game_id=data.game_id,
            rating=data.rating,
            body=data.body,
            title=data.title,
            pros=data.pros,
            cons=data.cons,
            pinned=data.pinned,
        )
        self._session.add(review)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            # uq_user_game_review: o usuário já avaliou este jogo (use PATCH para editar)
            raise ConflictError("You have already reviewed this game.") from exc
        result = await self._session.execute(
            select(Review).options(_WITH_USER, _WITH_GAME).where(Review.id == review.id)
        )
        return result.scalar_one()

    async def update(self, review: Review, data: ReviewUpdate) -> Review:
        for field, value in data.model_dump(exclude_unset=True).items():
            if field == "pinned" and value is None:
                continue
            setattr(review, field, value)
        await self._session.flush()
        result = await self._session.execute(
            select(Review).options(_WITH_USER, _WITH_GAME).where(Review.id == review.id)
        )
        return result.scalar_one()

    async def unpin_all(self, user_id: uuid.UUID) -> None:
        await self._session.execute(
            sql_update(Review)
            .where(Review.user_id == user_id, Review.pinned == true())
            .values(pinned=False)
            .execution_options(synchronize_session="fetch")
        )

    async def delete(self, review: Review) -> None:
        await self._session.delete(review)
        await self._session.flush()
