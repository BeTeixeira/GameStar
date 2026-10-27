import uuid
from typing import Literal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.api.dependencies import AdminUser, CurrentUserFull, FollowServiceDep, UserServiceDep
from app.domain.schemas.follow import FollowStatus
from app.domain.schemas.user import (
    AccountDelete,
    AccountTypeUpdate,
    PasswordChange,
    PublicProfile,
    RoleUpdate,
    UserCreate,
    UserMeResponse,
    UserResponse,
    UserStatusUpdate,
    UserUpdate,
)
from app.domain.models.user import UserRole
from app.infrastructure.exceptions import ConflictError, NotFoundError
from app.infrastructure.storage import MAX_BYTES

AccountFilter = Literal["normais", "especialistas", "moderadores", "banidas", "admins"]

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    service: UserServiceDep,
    _admin: AdminUser,
    q: str | None = Query(None, description="Busca por usuário, nome de exibição ou e-mail"),
    type: AccountFilter | None = Query(None, description="Filtro por tipo de conta"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[UserResponse]:
    """Lista de contas (só admin: inclui e-mails)."""
    users = await service.list_users(query=q, account_filter=type, skip=skip, limit=limit)
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


@router.get("/me/following", response_model=list[UserResponse])
async def list_my_following(
    service: FollowServiceDep, current_user: CurrentUserFull
) -> list[UserResponse]:
    """Especialistas que o usuário logado segue."""
    return [UserResponse.model_validate(u) for u in await service.list_following(current_user.id)]


@router.get("/me/followers", response_model=list[UserResponse])
async def list_my_followers(
    service: FollowServiceDep, current_user: CurrentUserFull
) -> list[UserResponse]:
    """Quem segue a conta especialista logada (mais recentes primeiro)."""
    return [UserResponse.model_validate(u) for u in await service.list_followers(current_user)]


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


@router.get("/{user_id}/profile", response_model=PublicProfile)
async def get_public_profile(
    user_id: uuid.UUID, service: UserServiceDep, current_user: CurrentUserFull
) -> PublicProfile:
    """Perfil público (sem e-mail). Campos de moderação só aparecem para moderador/admin."""
    user = await service.get_public_profile(current_user, user_id)
    profile = PublicProfile.model_validate(user)
    if not current_user.can_moderate:
        profile.is_active = None
        profile.is_muted = None
        profile.deactivated_by_role = None
    return profile


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID, service: UserServiceDep, current_user: CurrentUserFull
) -> UserResponse:
    """Dados completos (com e-mail): só o próprio usuário ou admin."""
    if current_user.id != user_id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own account.",
        )
    try:
        user = await service.get_user(user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return UserResponse.model_validate(user)


@router.post("/{user_id}/follow", response_model=FollowStatus)
async def follow_user(
    user_id: uuid.UUID, service: FollowServiceDep, current_user: CurrentUserFull
) -> FollowStatus:
    """Segue uma conta especialista (repetir não dá erro)."""
    count = await service.follow(current_user.id, user_id)
    return FollowStatus(user_id=user_id, following=True, followers_count=count)


@router.delete("/{user_id}/follow", response_model=FollowStatus)
async def unfollow_user(
    user_id: uuid.UUID, service: FollowServiceDep, current_user: CurrentUserFull
) -> FollowStatus:
    count = await service.unfollow(current_user.id, user_id)
    return FollowStatus(user_id=user_id, following=False, followers_count=count)


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
    admin: AdminUser,
) -> None:
    await service.delete_by_admin(admin, user_id)


# ── Admin ─────────────────────────────────────────────────


@router.patch("/{user_id}/status", response_model=UserResponse)
async def set_user_status(
    user_id: uuid.UUID, data: UserStatusUpdate, service: UserServiceDep, admin: AdminUser
) -> UserResponse:
    """Desativa (não consegue mais entrar) ou reativa uma conta."""
    user = await service.set_active(admin, user_id, data.is_active)
    return UserResponse.model_validate(user)


@router.put("/{user_id}/account-type", response_model=UserResponse)
async def set_user_account_type(
    user_id: uuid.UUID, data: AccountTypeUpdate, service: UserServiceDep, _admin: AdminUser
) -> UserResponse:
    """Torna a conta especialista (exige expertise_area) ou volta para normal."""
    user = await service.set_account_type(user_id, data)
    return UserResponse.model_validate(user)


@router.put("/{user_id}/role", response_model=UserResponse)
async def set_user_role(
    user_id: uuid.UUID, data: RoleUpdate, service: UserServiceDep, _admin: AdminUser
) -> UserResponse:
    """Promove a moderador ou volta para usuário (não vale para admin nem especialista)."""
    user = await service.set_role(user_id, UserRole(data.role))
    return UserResponse.model_validate(user)
