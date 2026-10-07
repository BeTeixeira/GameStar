import uuid
from abc import ABC, abstractmethod

from app.domain.models.friendship import Friendship, FriendshipStatus


class AbstractFriendshipRepository(ABC):
    @abstractmethod
    async def get_by_id(self, friendship_id: uuid.UUID) -> Friendship | None: ...

    @abstractmethod
    async def get_between(self, user_a: uuid.UUID, user_b: uuid.UUID) -> Friendship | None:
        """Amizade/pedido entre os dois usuários, em qualquer direção."""

    @abstractmethod
    async def list_for_user(
        self, user_id: uuid.UUID, status: FriendshipStatus
    ) -> list[Friendship]:
        """Linhas em que o usuário é requester ou addressee, com os dois usuários carregados."""

    @abstractmethod
    async def create(self, requester_id: uuid.UUID, addressee_id: uuid.UUID) -> Friendship: ...

    @abstractmethod
    async def accept(self, friendship: Friendship) -> Friendship: ...

    @abstractmethod
    async def delete(self, friendship: Friendship) -> None: ...
