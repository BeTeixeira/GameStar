import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.library_repository import AbstractLibraryRepository
from app.domain.models.library_entry import LibraryEntry, LibraryStatus


class LibraryRepository(AbstractLibraryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: uuid.UUID, game_id: uuid.UUID) -> LibraryEntry | None:
        result = await self._session.execute(
            select(LibraryEntry).where(
                LibraryEntry.user_id == user_id, LibraryEntry.game_id == game_id
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[LibraryEntry]:
        result = await self._session.execute(
            select(LibraryEntry)
            .where(LibraryEntry.user_id == user_id)
            .order_by(LibraryEntry.updated_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self, user_id: uuid.UUID, game_id: uuid.UUID, status: LibraryStatus
    ) -> LibraryEntry:
        entry = LibraryEntry(user_id=user_id, game_id=game_id, status=status)
        self._session.add(entry)
        await self._session.flush()
        await self._session.refresh(entry)
        return entry

    async def update_status(self, entry: LibraryEntry, status: LibraryStatus) -> LibraryEntry:
        entry.status = status
        await self._session.flush()
        await self._session.refresh(entry)
        return entry

    async def delete(self, entry: LibraryEntry) -> None:
        await self._session.delete(entry)
        await self._session.flush()
