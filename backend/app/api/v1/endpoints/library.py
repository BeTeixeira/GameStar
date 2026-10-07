import uuid

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, LibraryServiceDep
from app.domain.schemas.library import LibraryEntryResponse, LibraryEntrySet

# "Minha lista" do usuário logado. NotFoundError vira 404 pelo handler global (main.py).
router = APIRouter(prefix="/library", tags=["library"])


@router.get("", response_model=list[LibraryEntryResponse])
async def list_my_library(
    service: LibraryServiceDep, current_user_id: CurrentUser
) -> list[LibraryEntryResponse]:
    entries = await service.list_entries(uuid.UUID(current_user_id))
    return [LibraryEntryResponse.model_validate(e) for e in entries]


@router.put("/{game_id}", response_model=LibraryEntryResponse)
async def set_library_status(
    game_id: uuid.UUID,
    data: LibraryEntrySet,
    service: LibraryServiceDep,
    current_user_id: CurrentUser,
) -> LibraryEntryResponse:
    entry = await service.set_status(uuid.UUID(current_user_id), game_id, data.status)
    return LibraryEntryResponse.model_validate(entry)


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_library(
    game_id: uuid.UUID, service: LibraryServiceDep, current_user_id: CurrentUser
) -> None:
    await service.remove(uuid.UUID(current_user_id), game_id)
