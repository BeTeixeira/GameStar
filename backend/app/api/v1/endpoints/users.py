import uuid

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.api.dependencies import AdminUser, CurrentUserFull, UserServiceDep
from app.domain.schemas.user import (
    AccountDelete,
    PasswordChange,
    UserCreate,
    UserMeResponse,
    UserResponse,
    UserUpdate,
)
from app.infrastructure.exceptions import ConflictError, NotFoundError
from app.infrastructure.storage import MAX_BYTES

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    service: UserServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[UserResponse]:
    users = await service.list_users(skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


# ── Conta do usuário logado ───────────────────────────────
# Declaradas antes de "/{user_id}": senão "me" seria lido como um id.
# Erros do service (400/404/409) viram resposta pelos handlers globais (main.py).


@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: CurrentUserFull) -> UserMeResponse:
    return UserMeResponse.model_validate(current_user)


@router.patch("/me", response_model=UserMeResponse)
async def update_me(
    data: UserUpdate, service: UserServiceDep, current_user: CurrentUserFull
) -> UserMeResponse:
    user = await service.update_user(current_user.id, data)
    return UserMeResponse.model_validate(user)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    data: PasswordChange, service: UserServiceDep, current_user: CurrentUserFull
) -> None:
    await service.change_password(current_user, data.current_password, data.new_password)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    data: AccountDelete, service: UserServiceDep, current_user: CurrentUserFull
) -> None:
    """Exclui a própria conta (com avaliações, lista e amizades). Pede a senha."""
    await service.delete_own_account(current_user, data.password)


async def _read_upload(file: UploadFile) -> bytes:
    # lê 1 byte além do maior limite, para detectar arquivo grande sem ler tudo
    return await file.read(max(MAX_BYTES.values()) + 1)


@router.put("/me/avatar", response_model=UserMeResponse)
async def upload_my_avatar(
    service: UserServiceDep, current_user: CurrentUserFull, file: UploadFile = File(...)
) -> UserMeResponse:
    """Foto de perfil: PNG, JPG, WebP ou GIF (animado), até 5 MB."""
    user = await service.set_image(current_user, "avatars", await _read_upload(file))
    return UserMeResponse.model_validate(user)


@router.delete("/me/avatar", response_model=UserMeResponse)
async def remove_my_avatar(
    service: UserServiceDep, current_user: CurrentUserFull
) -> UserMeResponse:
    user = await service.remove_image(current_user, "avatars")
    return UserMeResponse.model_validate(user)


@router.put("/me/banner", response_model=UserMeResponse)
async def upload_my_banner(
    service: UserServiceDep, current_user: CurrentUserFull, file: UploadFile = File(...)
) -> UserMeResponse:
    """Fundo do perfil: PNG, JPG, WebP ou GIF (animado), até 10 MB."""
    user = await service.set_image(current_user, "banners", await _read_upload(file))
    return UserMeResponse.model_validate(user)


@router.delete("/me/banner", response_model=UserMeResponse)
async def remove_my_banner(
    service: UserServiceDep, current_user: CurrentUserFull
) -> UserMeResponse:
    user = await service.remove_image(current_user, "banners")
    return UserMeResponse.model_validate(user)


# ── Usuários por id ───────────────────────────────────────


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: uuid.UUID, service: UserServiceDep) -> UserResponse:
    try:
        user = await service.get_user(user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, service: UserServiceDep) -> UserResponse:
    try:
        user = await service.create_user(data)
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    service: UserServiceDep,
    current_user: CurrentUserFull,
) -> UserResponse:
    if current_user.id != user_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile.",
        )
    try:
        user = await service.update_user(user_id, data)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    service: UserServiceDep,
    _admin: AdminUser,
) -> None:
    try:
        await service.delete_user(user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
