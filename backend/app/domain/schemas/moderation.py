import uuid
from datetime import datetime

from pydantic import BaseModel

from app.domain.models.review_report import ReportReason, ReportStatus


class ReportCreate(BaseModel):
    reason: ReportReason


class PendingCount(BaseModel):
    count: int


class ReportGroup(BaseModel):
    """Denúncias de um comentário com o mesmo status, juntas numa linha do log."""

    review_id: uuid.UUID
    review_exists: bool
    current_body: str | None
    review_body: str
    review_rating: int
    author_id: uuid.UUID | None
    author_name: str
    author_is_muted: bool | None
    author_is_active: bool | None
    author_deactivated_by_role: str | None
    game_id: uuid.UUID | None
    game_title: str
    reasons: list[ReportReason]
    reporters_count: int
    last_reported_at: datetime
    status: ReportStatus
