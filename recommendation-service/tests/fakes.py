from collections.abc import Callable
from typing import Any
from urllib.parse import parse_qs

import httpx

from app.infrastructure.gamestar_client import GamestarClient

BASE_URL = "http://gamestar.test/api/v1"
VALID_TOKEN = "Bearer valid-token"


def game_payload(game_id: str, title: str, genre: str | None, developer: str | None = None) -> dict:
    return {
        "id": game_id,
        "title": title,
        "genre": genre,
        "developer": developer,
        "release_date": None,
        "description": None,
        "cover_image_url": f"https://img.test/{game_id}.png",
        "created_at": "2026-01-01T00:00:00Z",
    }


def review_payload(user_id: str, game_id: str, rating: int, created_at: str) -> dict:
    return {
        "id": f"{user_id}-{game_id}",
        "user_id": user_id,
        "game_id": game_id,
        "rating": rating,
        "body": None,
        "created_at": created_at,
        "updated_at": created_at,
    }


class FakeGamestarApi:
    def __init__(self) -> None:
        self.games: list[dict] = []
        self.reviews: list[dict] = []
        self.library: list[dict] = []
        self.friend_ids: list[str] = []
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        path = request.url.path.removeprefix("/api/v1")
        query = {key: values[0] for key, values in parse_qs(request.url.query.decode()).items()}
        skip = int(query.get("skip", 0))
        limit = int(query.get("limit", 20))

        def page(items: list[dict]) -> httpx.Response:
            return httpx.Response(200, json=items[skip : skip + limit])

        if path in ("/library", "/friends"):
            if request.headers.get("Authorization") != VALID_TOKEN:
                return httpx.Response(401, json={"detail": "Not authenticated"})
            if path == "/library":
                return httpx.Response(200, json=self.library)
            return httpx.Response(
                200,
                json=[
                    {
                        "friendship_id": f"f-{friend_id}",
                        "user": {"id": friend_id, "username": friend_id},
                        "since": "2026-01-01T00:00:00Z",
                    }
                    for friend_id in self.friend_ids
                ],
            )

        if path == "/games":
            return page(self.games)

        routes: dict[str, Callable[[str], Any]] = {
            "/games/": lambda key: next((g for g in self.games if g["id"] == key), None),
            "/reviews/game/": lambda key: [r for r in self.reviews if r["game_id"] == key],
            "/reviews/user/": lambda key: [r for r in self.reviews if r["user_id"] == key],
        }
        for prefix, resolve in routes.items():
            if path.startswith(prefix):
                result = resolve(path.removeprefix(prefix))
                if result is None:
                    return httpx.Response(404, json={"detail": "Not found"})
                return (
                    page(result) if isinstance(result, list) else httpx.Response(200, json=result)
                )

        return httpx.Response(404, json={"detail": "Unknown route"})

    def client(self) -> GamestarClient:
        http = httpx.AsyncClient(base_url=BASE_URL, transport=httpx.MockTransport(self.handler))
        return GamestarClient(http, max_concurrent_requests=4)
