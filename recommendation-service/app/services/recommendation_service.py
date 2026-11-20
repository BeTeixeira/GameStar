import asyncio
from datetime import datetime

from app.domain.models import RankedGame, ScoredGame, ScoringWeights
from app.domain.scoring import rank_games, score_for_user, similar_games
from app.infrastructure.gamestar_client import GamestarClient


class GameNotFoundError(Exception):
    pass


class RecommendationService:
    def __init__(self, client: GamestarClient, weights: ScoringWeights) -> None:
        self._client = client
        self._weights = weights

    async def recommend_for_user(self, authorization: str, limit: int) -> list[ScoredGame]:
        games, library, friend_ids = await asyncio.gather(
            self._client.list_games(),
            self._client.list_my_library(authorization),
            self._client.list_my_friend_ids(authorization),
        )
        friend_reviews, all_reviews = await asyncio.gather(
            self._client.list_reviews_for_users(friend_ids),
            self._client.list_reviews_for_games(game.id for game in games),
        )
        return score_for_user(
            games=games,
            library=library,
            friend_reviews=friend_reviews,
            all_reviews=all_reviews,
            weights=self._weights,
            limit=limit,
        )

    async def similar_to(self, game_id: str, limit: int) -> list[ScoredGame]:
        games = await self._client.list_games()
        target = next((game for game in games if game.id == game_id), None)
        if target is None:
            raise GameNotFoundError(f"Game {game_id} not found")

        reviews = await self._client.list_reviews_for_games(game.id for game in games)
        return similar_games(target=target, games=games, all_reviews=reviews, limit=limit)

    async def ranking(
        self, now: datetime, days: int | None, min_votes: int, limit: int
    ) -> list[RankedGame]:
        games = await self._client.list_games()
        reviews = await self._client.list_reviews_for_games(game.id for game in games)
        return rank_games(
            games=games, reviews=reviews, now=now, days=days, min_votes=min_votes, limit=limit
        )
