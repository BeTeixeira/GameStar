from app.domain.schemas.friendship import (
    FriendRequestCreate,
    FriendRequestResponse,
    FriendRequestResult,
    FriendResponse,
    FriendUser,
)
from app.domain.schemas.game import GameCreate, GameResponse, GameUpdate
from app.domain.schemas.library import LibraryEntryResponse, LibraryEntrySet
from app.domain.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from app.domain.schemas.user import UserCreate, UserResponse, UserUpdate

__all__ = [
    "UserCreate", "UserUpdate", "UserResponse",
    "GameCreate", "GameUpdate", "GameResponse",
    "ReviewCreate", "ReviewUpdate", "ReviewResponse",
    "LibraryEntrySet", "LibraryEntryResponse",
    "FriendRequestCreate", "FriendRequestResponse", "FriendRequestResult",
    "FriendResponse", "FriendUser",
]
