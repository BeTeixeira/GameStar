import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    game_id: uuid.UUID
    rating: int = Field(..., ge=1, le=10)
    body: str | None = Field(None, max_length=5000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=10)
    body: str | None = Field(None, max_length=5000)


class ReviewResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    game_id: uuid.UUID
    rating: int
    body: str | None
    username: str | None = None
    created_at: datetime
    updated_at: datetime
