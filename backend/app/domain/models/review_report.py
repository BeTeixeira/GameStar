import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class ReportReason(str, enum.Enum):
    ofensivo = "ofensivo"
    spam = "spam"
    spoiler = "spoiler"
    outro = "outro"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    kept = "kept"
    removed = "removed"


class ReviewReport(Base):
    """Denúncia de um comentário. Guarda uma cópia do comentário, do autor e do jogo e não
    tem FK para a avaliação: o registro sobrevive se o autor apagar o comentário ou a conta."""

    __tablename__ = "review_reports"
    __table_args__ = (
        UniqueConstraint("review_id", "reporter_id", name="uq_report_review_reporter"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), index=True, nullable=False)
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[ReportReason] = mapped_column(
        Enum(ReportReason, native_enum=False, length=15), nullable=False
    )
    review_body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    review_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    review_author_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_author_name: Mapped[str] = mapped_column(String(60), nullable=False)
    game_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("games.id", ondelete="SET NULL"), nullable=True
    )
    game_title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False, length=10),
        nullable=False,
        default=ReportStatus.pending,
        index=True,
    )
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
