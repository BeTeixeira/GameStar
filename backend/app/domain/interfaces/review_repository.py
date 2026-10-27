import uuid
from abc import ABC, abstractmethod

from app.domain.models.review import Review
from app.domain.schemas.review import ReviewCreate, ReviewUpdate


class AbstractReviewRepository(ABC):
    @abstractmethod
    async def get_by_id(self, review_id: uuid.UUID) -> Review | None: ...

    @abstractmethod
    async def list_by_game(
        self, game_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]: ...

    @abstractmethod
    async def list_by_user(
        self, user_id: uuid.UUID, *, skip: int = 0, limit: int = 20
    ) -> list[Review]: ...

    @abstractmethod
    async def list_recent(
        self, query: str | None, *, skip: int = 0, limit: int = 20
    ) -> list[Review]:
        """Comentários mais novos primeiro, filtrados por texto, autor ou jogo."""

    @abstractmethod
    async def create(self, user_id: uuid.UUID, data: ReviewCreate) -> Review: ...

    @abstractmethod
    async def update(self, review: Review, data: ReviewUpdate) -> Review: ...

    @abstractmethod
    async def unpin_all(self, user_id: uuid.UUID) -> None: ...

    @abstractmethod
    async def delete(self, review: Review) -> None: ...
