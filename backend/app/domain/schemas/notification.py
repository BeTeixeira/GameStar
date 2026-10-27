import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    body: str
    data: dict | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int


class PushTokenRegister(BaseModel):
    token: str = Field(..., min_length=1, max_length=200)
    platform: str = Field(..., min_length=1, max_length=10)


class PushTokenRemove(BaseModel):
    token: str = Field(..., min_length=1, max_length=200)
