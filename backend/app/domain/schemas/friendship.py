import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FriendRequestCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)


class FriendUser(BaseModel):
    id: uuid.UUID
    username: str


class FriendResponse(BaseModel):
    """Amizade aceita, vista pelo usuário logado."""

    friendship_id: uuid.UUID
    user: FriendUser
    since: datetime


class FriendRequestResponse(BaseModel):
    """Pedido pendente. incoming = recebido (pode aceitar); outgoing = enviado."""

    id: uuid.UUID
    direction: Literal["incoming", "outgoing"]
    user: FriendUser
    created_at: datetime


class FriendRequestResult(BaseModel):
    """Resultado de enviar um pedido: fica pending, ou accepted se o outro já tinha pedido."""

    id: uuid.UUID
    status: Literal["pending", "accepted"]
    user: FriendUser
