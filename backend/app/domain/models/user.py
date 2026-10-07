import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, String, Uuid, false, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", native_enum=False, length=10),
        nullable=False,
        default=UserRole.user,
        index=True,
    )
    github_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Perfil público
    display_name: Mapped[str | None] = mapped_column(String(60), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(160), nullable=True)
    # Caminho relativo servido pela API (ex: "/uploads/avatars/<uuid>.gif"); GIFs ficam animados
    avatar_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Preferências (só o próprio usuário vê)
    notify_friend_requests: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )
    notify_comments: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )
    notify_recommendations: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    private_profile: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    reviews: Mapped[list["Review"]] = relationship(  # noqa: F821
        "Review", back_populates="user", cascade="all, delete-orphan"
    )
