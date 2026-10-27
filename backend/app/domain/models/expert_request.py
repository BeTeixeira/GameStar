import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.models.user import ExpertArea, User
from app.infrastructure.database import Base


class ExpertRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ExpertRequest(Base):
    """Pedido de um usuário comum para virar conta especialista; o admin aprova ou recusa."""

    __tablename__ = "expert_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    expertise_area: Mapped[ExpertArea] = mapped_column(
        Enum(ExpertArea, name="expertarea", native_enum=False, length=15), nullable=False
    )
    company: Mapped[str | None] = mapped_column(String(80), nullable=True)
    link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[ExpertRequestStatus] = mapped_column(
        Enum(ExpertRequestStatus, native_enum=False, length=10),
        nullable=False,
        default=ExpertRequestStatus.pending,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="joined")

    @property
    def username(self) -> str:
        return self.user.username

    @property
    def display_name(self) -> str | None:
        return self.user.display_name

    @property
    def avatar_url(self) -> str | None:
        return self.user.avatar_url
