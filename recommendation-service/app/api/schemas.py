from pydantic import BaseModel

from app.domain.models import RankedGame, ScoredGame


class RecommendationResponse(BaseModel):
    game_id: str
    title: str
    genre: str | None
    developer: str | None
    cover_image_url: str | None
    score: float
    reasons: list[str]

    @classmethod
    def from_domain(cls, scored: ScoredGame) -> "RecommendationResponse":
        return cls(
            game_id=scored.game.id,
            title=scored.game.title,
            genre=scored.game.genre,
            developer=scored.game.developer,
            cover_image_url=scored.game.cover_image_url,
            score=scored.score,
            reasons=list(scored.reasons),
        )


class RankingResponse(BaseModel):
    game_id: str
    title: str
    genre: str | None
    cover_image_url: str | None
    average_rating: float
    weighted_rating: float
    review_count: int

    @classmethod
    def from_domain(cls, ranked: RankedGame) -> "RankingResponse":
        return cls(
            game_id=ranked.game.id,
            title=ranked.game.title,
            genre=ranked.game.genre,
            cover_image_url=ranked.game.cover_image_url,
            average_rating=ranked.average_rating,
            weighted_rating=ranked.weighted_rating,
            review_count=ranked.review_count,
        )


class HealthResponse(BaseModel):
    status: str
    service: str
