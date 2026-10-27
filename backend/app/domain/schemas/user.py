import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.domain.models.user import AccountType, ExpertArea, UserRole


def _blank_to_none(value: object) -> object:
    """"" ou só espaços = campo vazio (None)."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


class UserCreate(BaseModel):
    """Cadastro público: cria sempre conta normal. Conta especialista não é criada
    por aqui (terá um fluxo próprio, com confirmação)."""

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    display_name: str | None = Field(None, max_length=60)
    bio: str | None = Field(None, max_length=160)
    notify_friend_requests: bool | None = None
    notify_comments: bool | None = None
    notify_recommendations: bool | None = None
    private_profile: bool | None = None
    # Só conta especialista (o service recusa para conta normal)
    company: str | None = Field(None, max_length=80)
    expertise_area: ExpertArea | None = None

    # "" ou só espaços em nome de exibição/bio/empresa = apagar o campo
    _strip = field_validator("username", "display_name", "bio", "company", mode="before")(
        _blank_to_none
    )


class AccountTypeUpdate(BaseModel):
    """Admin define o tipo de conta (pelo id). Especialista exige área de atuação."""

    account_type: AccountType
    expertise_area: ExpertArea | None = None

    @model_validator(mode="after")
    def _check_area(self) -> "AccountTypeUpdate":
        if self.account_type == AccountType.especialista and self.expertise_area is None:
            raise ValueError("Expert accounts require an expertise_area.")
        if self.account_type == AccountType.normal:
            self.expertise_area = None
        return self


class UserStatusUpdate(BaseModel):
    """Admin ativa/desativa uma conta (conta desativada não consegue entrar)."""

    is_active: bool


class RoleUpdate(BaseModel):
    """Admin promove a moderador ou volta para usuário (admin não é definido pela API)."""

    role: Literal["user", "moderator"]


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class AccountDelete(BaseModel):
    password: str


class UserResponse(BaseModel):
    """Perfil público de um usuário."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    private_profile: bool = False
    account_type: AccountType = AccountType.normal
    expertise_area: ExpertArea | None = None
    company: str | None = None
    followers_count: int = 0
    is_muted: bool = False
    deactivated_by_role: str | None = None

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.admin


class UserMeResponse(UserResponse):
    """Usuário logado: perfil + preferências que só ele vê."""

    notify_friend_requests: bool = True
    notify_comments: bool = True
    notify_recommendations: bool = False
