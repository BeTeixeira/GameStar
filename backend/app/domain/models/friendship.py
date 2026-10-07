import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class FriendshipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class Friendship(Base):
    """Pedido de amizade de requester para addressee; vira amizade quando aceito.

    Recusar, cancelar ou desfazer a amizade apaga a linha. O service garante que
    exista no máximo uma linha por par de usuários, em qualquer direção.
    """

    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
        CheckConstraint("requester_id <> addressee_id", name="ck_friendship_not_self"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    addressee_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(FriendshipStatus, name="friendshipstatus", native_enum=False, length=10),
        nullable=False,
        default=FriendshipStatus.pending,
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

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])  # noqa: F821
    addressee: Mapped["User"] = relationship("User", foreign_keys=[addressee_id])  # noqa: F821

    def other_user(self, user_id: uuid.UUID) -> "User":  # noqa: F821
        """O outro lado da amizade, visto por user_id."""
        return self.addressee if self.requester_id == user_id else self.requester
