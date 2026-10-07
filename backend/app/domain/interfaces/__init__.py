from app.domain.interfaces.friendship_repository import AbstractFriendshipRepository
from app.domain.interfaces.game_repository import AbstractGameRepository
from app.domain.interfaces.library_repository import AbstractLibraryRepository
from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.interfaces.user_repository import AbstractUserRepository

__all__ = [
    "AbstractUserRepository",
    "AbstractGameRepository",
    "AbstractReviewRepository",
    "AbstractLibraryRepository",
    "AbstractFriendshipRepository",
]
