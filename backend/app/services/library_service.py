import logging
import uuid

from app.domain.interfaces.game_repository import AbstractGameRepository
from app.domain.interfaces.library_repository import AbstractLibraryRepository
from app.domain.models.library_entry import LibraryEntry, LibraryStatus
from app.infrastructure.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class LibraryService:
    def __init__(
        self, repository: AbstractLibraryRepository, game_repository: AbstractGameRepository
    ) -> None:
        self._repo = repository
        self._games = game_repository

    async def list_entries(self, user_id: uuid.UUID) -> list[LibraryEntry]:
        return await self._repo.list_by_user(user_id)

    async def set_status(
        self, user_id: uuid.UUID, game_id: uuid.UUID, status: LibraryStatus
    ) -> LibraryEntry:
        """Adiciona o jogo à lista do usuário ou troca o status, se já estiver nela."""
        if not await self._games.get_by_id(game_id):
            raise NotFoundError("Game", game_id)
        entry = await self._repo.get(user_id, game_id)
        if entry:
            return await self._repo.update_status(entry, status)
        entry = await self._repo.create(user_id, game_id, status)
        logger.info("Library entry added: user=%s game=%s status=%s", user_id, game_id, status)
        return entry

    async def remove(self, user_id: uuid.UUID, game_id: uuid.UUID) -> None:
        entry = await self._repo.get(user_id, game_id)
        if not entry:
            raise NotFoundError("Library entry", game_id)
        await self._repo.delete(entry)
