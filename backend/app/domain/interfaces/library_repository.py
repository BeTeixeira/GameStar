import uuid
from abc import ABC, abstractmethod

from app.domain.models.library_entry import LibraryEntry, LibraryStatus


class AbstractLibraryRepository(ABC):
    @abstractmethod
    async def get(self, user_id: uuid.UUID, game_id: uuid.UUID) -> LibraryEntry | None: ...

    @abstractmethod
    async def list_by_user(self, user_id: uuid.UUID) -> list[LibraryEntry]: ...

    @abstractmethod
    async def create(
        self, user_id: uuid.UUID, game_id: uuid.UUID, status: LibraryStatus
    ) -> LibraryEntry: ...

    @abstractmethod
    async def update_status(self, entry: LibraryEntry, status: LibraryStatus) -> LibraryEntry: ...

    @abstractmethod
    async def delete(self, entry: LibraryEntry) -> None: ...
