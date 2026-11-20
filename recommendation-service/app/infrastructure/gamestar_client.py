import asyncio
from collections.abc import Awaitable, Callable, Iterable
from datetime import datetime
from typing import Any, TypeVar

import httpx

from app.domain.models import Game, LibraryEntry, LibraryStatus, Review

PAGE_SIZE = 100

Item = TypeVar("Item")


class UpstreamError(Exception):
    pass


class UpstreamUnauthorizedError(UpstreamError):
    pass


class UpstreamNotFoundError(UpstreamError):
    pass


class UpstreamUnavailableError(UpstreamError):
    pass


def parse_game(payload: dict[str, Any]) -> Game:
    return Game(
        id=str(payload["id"]),
        title=payload["title"],
        genre=payload.get("genre"),
        developer=payload.get("developer"),
        cover_image_url=payload.get("cover_image_url"),
    )


def parse_review(payload: dict[str, Any]) -> Review:
    return Review(
        user_id=str(payload["user_id"]),
        game_id=str(payload["game_id"]),
        rating=int(payload["rating"]),
        created_at=datetime.fromisoformat(payload["created_at"]),
    )


def parse_library_entry(payload: dict[str, Any]) -> LibraryEntry:
    return LibraryEntry(game_id=str(payload["game_id"]), status=LibraryStatus(payload["status"]))


class GamestarClient:
    def __init__(self, http: httpx.AsyncClient, max_concurrent_requests: int = 10) -> None:
        self._http = http
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)

    async def _get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        authorization: str | None = None,
    ) -> Any:
        headers = {"Authorization": authorization} if authorization else {}
        try:
            async with self._semaphore:
                response = await self._http.get(path, params=params, headers=headers)
        except httpx.HTTPError as error:
            raise UpstreamUnavailableError(f"Gamestar API unreachable: {error}") from error

        if response.status_code in (401, 403):
            raise UpstreamUnauthorizedError("Token rejected by Gamestar API")
        if response.status_code == 404:
            raise UpstreamNotFoundError(f"Resource not found: {path}")
        if response.is_error:
            raise UpstreamUnavailableError(f"Gamestar API answered {response.status_code}")
        return response.json()

    async def _paginate(self, path: str, parse: Callable[[dict[str, Any]], Item]) -> list[Item]:
        items: list[Item] = []
        skip = 0
        while True:
            page = await self._get(path, params={"skip": skip, "limit": PAGE_SIZE})
            items.extend(parse(payload) for payload in page)
            if len(page) < PAGE_SIZE:
                return items
            skip += PAGE_SIZE

    async def list_games(self) -> list[Game]:
        return await self._paginate("/games", parse_game)

    async def get_game(self, game_id: str) -> Game:
        return parse_game(await self._get(f"/games/{game_id}"))

    async def list_reviews_by_game(self, game_id: str) -> list[Review]:
        return await self._paginate(f"/reviews/game/{game_id}", parse_review)

    async def list_reviews_by_user(self, user_id: str) -> list[Review]:
        return await self._paginate(f"/reviews/user/{user_id}", parse_review)

    async def list_reviews_for_games(self, game_ids: Iterable[str]) -> list[Review]:
        return await self._gather_flat(self.list_reviews_by_game(game_id) for game_id in game_ids)

    async def list_reviews_for_users(self, user_ids: Iterable[str]) -> list[Review]:
        return await self._gather_flat(self.list_reviews_by_user(user_id) for user_id in user_ids)

    async def list_my_library(self, authorization: str) -> list[LibraryEntry]:
        payload = await self._get("/library", authorization=authorization)
        return [parse_library_entry(entry) for entry in payload]

    async def list_my_friend_ids(self, authorization: str) -> list[str]:
        payload = await self._get("/friends", authorization=authorization)
        return [str(friendship["user"]["id"]) for friendship in payload]

    @staticmethod
    async def _gather_flat(calls: Iterable[Awaitable[list[Review]]]) -> list[Review]:
        results = await asyncio.gather(*calls)
        return [review for reviews in results for review in reviews]
