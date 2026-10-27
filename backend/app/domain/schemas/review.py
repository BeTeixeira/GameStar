import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.models.user import ExpertArea


class ReviewCreate(BaseModel):
    game_id: uuid.UUID
    rating: int = Field(..., ge=1, le=10)
    body: str | None = Field(None, max_length=5000)
    title: str | None = Field(None, max_length=120)
    pros: str | None = Field(None, max_length=500)
    cons: str | None = Field(None, max_length=500)
    pinned: bool = False


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=10)
    body: str | None = Field(None, max_length=5000)
    title: str | None = Field(None, max_length=120)
    pros: str | None = Field(None, max_length=500)
    cons: str | None = Field(None, max_length=500)
    pinned: bool | None = None


class ReviewResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    game_id: uuid.UUID
    rating: int
    body: str | None
    title: str | None = None
    pros: str | None = None
    cons: str | None = None
    pinned: bool = False
    game_title: str | None = None
    game_cover_url: str | None = None
    username: str | None = None
    # Autor: conta especialista ganha selo e entra na "Nota especialista" do jogo
    display_name: str | None = None
    is_expert: bool = False
    expertise_area: ExpertArea | None = None
    created_at: datetime
    updated_at: datetime
