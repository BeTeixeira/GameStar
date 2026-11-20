from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class LibraryStatus(StrEnum):
    COMPLETED = "completed"
    PLAYING = "playing"
    PLAN_TO_PLAY = "plan_to_play"
    DISLIKED = "disliked"


@dataclass(frozen=True)
class Game:
    id: str
    title: str
    genre: str | None = None
    developer: str | None = None
    cover_image_url: str | None = None


@dataclass(frozen=True)
class Review:
    user_id: str
    game_id: str
    rating: int
    created_at: datetime


@dataclass(frozen=True)
class LibraryEntry:
    game_id: str
    status: LibraryStatus


@dataclass(frozen=True)
class ScoringWeights:
    genre: float = 0.4
    friends: float = 0.4
    global_rating: float = 0.2


@dataclass(frozen=True)
class ScoredGame:
    game: Game
    score: float
    reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class RankedGame:
    game: Game
    average_rating: float
    weighted_rating: float
    review_count: int
