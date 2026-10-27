from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ActivityItem(BaseModel):
    kind: Literal["expert_request", "report"]
    title: str
    created_at: datetime
    route: str


class AdminStats(BaseModel):
    users: int
    experts: int
    moderators: int
    banned: int
    muted: int
    games: int
    reviews: int
    pending_expert_requests: int
    pending_reports: int
    recent_activity: list[ActivityItem]
