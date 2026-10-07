import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.domain.models.user import UserRole


class UserCreate(BaseModel):
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

    @field_validator("username", "display_name", "bio", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        # "" ou só espaços em nome de exibição/bio = apagar o campo
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


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

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.admin


class UserMeResponse(UserResponse):
    """Usuário logado: perfil + preferências que só ele vê."""

    notify_friend_requests: bool = True
    notify_comments: bool = True
    notify_recommendations: bool = False
