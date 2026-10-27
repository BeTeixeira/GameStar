import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.models.expert_request import ExpertRequestStatus
from app.domain.models.user import ExpertArea


class ExpertRequestCreate(BaseModel):
    expertise_area: ExpertArea
    company: str | None = Field(None, max_length=80)
    link: str | None = Field(None, max_length=300)
    message: str = Field(..., min_length=10, max_length=1000)


class ExpertRequestReject(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


class ExpertRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    display_name: str | None
    avatar_url: str | None
    expertise_area: ExpertArea
    company: str | None
    link: str | None
    message: str
    status: ExpertRequestStatus
    rejection_reason: str | None
    created_at: datetime
    decided_at: datetime | None
