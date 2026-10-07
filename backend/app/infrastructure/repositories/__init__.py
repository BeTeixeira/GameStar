from app.infrastructure.repositories.friendship_repository import FriendshipRepository
from app.infrastructure.repositories.game_repository import GameRepository
from app.infrastructure.repositories.library_repository import LibraryRepository
from app.infrastructure.repositories.review_repository import ReviewRepository
from app.infrastructure.repositories.user_repository import UserRepository

__all__ = [
    "UserRepository",
    "GameRepository",
    "ReviewRepository",
    "LibraryRepository",
    "FriendshipRepository",
]
