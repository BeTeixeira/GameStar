import uuid

from pydantic import BaseModel


class FollowStatus(BaseModel):
    """Resultado de seguir/deixar de seguir um especialista."""

    user_id: uuid.UUID
    following: bool
    followers_count: int
