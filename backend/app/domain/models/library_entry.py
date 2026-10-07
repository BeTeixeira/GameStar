import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class LibraryStatus(str, enum.Enum):
    completed = "completed"
    playing = "playing"
    plan_to_play = "plan_to_play"
    disliked = "disliked"


class LibraryEntry(Base):
    """Jogo na "Minha lista" de um usuário, com o status escolhido."""

    __tablename__ = "library_entries"
    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_user_game_library"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[LibraryStatus] = mapped_column(
        Enum(LibraryStatus, name="librarystatus", native_enum=False, length=20),
        nullable=False,
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

    user: Mapped["User"] = relationship("User")  # noqa: F821
    game: Mapped["Game"] = relationship("Game")  # noqa: F821
