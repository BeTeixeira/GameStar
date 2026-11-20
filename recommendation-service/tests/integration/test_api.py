from collections.abc import Iterator
from datetime import UTC, datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_clock, get_gamestar_client
from app.core.config import Settings
from app.infrastructure.gamestar_client import GamestarClient
from app.main import create_app
from tests.fakes import VALID_TOKEN, FakeGamestarApi, game_payload, review_payload

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)
RECENT = "2026-11-15T10:00:00Z"
OLD = "2026-09-01T10:00:00Z"


@pytest.fixture
def api() -> FakeGamestarApi:
    fake = FakeGamestarApi()
    fake.games = [
        game_payload("rpg-a", "Alpha Quest", "RPG", "Studio X"),
        game_payload("rpg-b", "Beta Saga", "RPG", "Studio Y"),
        game_payload("rpg-c", "Gamma Tales", "RPG", "Studio X"),
        game_payload("shooter", "Crossfire", "Shooter", "Studio Z"),
    ]
    fake.reviews = [
        review_payload("friend", "rpg-b", 10, RECENT),
        review_payload("stranger", "rpg-b", 8, RECENT),
        review_payload("stranger", "shooter", 9, OLD),
        review_payload("stranger", "rpg-c", 6, RECENT),
    ]
    fake.library = [
        {
            "game_id": "rpg-a",
            "status": "completed",
            "created_at": RECENT,
            "updated_at": RECENT,
        }
    ]
    fake.friend_ids = ["friend"]
    return fake


@pytest.fixture
def client(api: FakeGamestarApi) -> Iterator[TestClient]:
    app = create_app(Settings(eureka_enabled=False, _env_file=None))
    app.dependency_overrides[get_gamestar_client] = api.client
    app.dependency_overrides[get_clock] = lambda: NOW
    yield TestClient(app)


def test_health_reports_up(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "recommendation-service"}


def test_startup_builds_gamestar_client_from_settings() -> None:
    settings = Settings(gamestar_api_url="http://gamestar.test/api/v1", _env_file=None)
    app = create_app(settings)

    with TestClient(app) as running:
        assert running.get("/health").status_code == 200
        gamestar_client = app.state.gamestar_client
        assert isinstance(gamestar_client, GamestarClient)
        assert str(gamestar_client._http.base_url) == "http://gamestar.test/api/v1/"


def test_my_recommendations_require_bearer_token(client: TestClient) -> None:
    response = client.get("/recommendations/me")

    assert response.status_code == 401


def test_my_recommendations_rank_unowned_games_with_reasons(client: TestClient) -> None:
    response = client.get("/recommendations/me", headers={"Authorization": VALID_TOKEN})

    assert response.status_code == 200
    body = response.json()
    assert [item["game_id"] for item in body] == ["rpg-b", "rpg-c", "shooter"]
    assert body[0]["title"] == "Beta Saga"
    assert body[0]["cover_image_url"] == "https://img.test/rpg-b.png"
    assert "Seus amigos deram nota média 10.0" in body[0]["reasons"]


def test_my_recommendations_respect_limit(client: TestClient) -> None:
    response = client.get("/recommendations/me?limit=1", headers={"Authorization": VALID_TOKEN})

    assert [item["game_id"] for item in response.json()] == ["rpg-b"]


def test_my_recommendations_reject_invalid_limit(client: TestClient) -> None:
    response = client.get("/recommendations/me?limit=0", headers={"Authorization": VALID_TOKEN})

    assert response.status_code == 422


def test_token_rejected_upstream_returns_401(client: TestClient) -> None:
    response = client.get("/recommendations/me", headers={"Authorization": "Bearer expired"})

    assert response.status_code == 401


def test_similar_games_prefer_same_genre_and_developer(client: TestClient) -> None:
    response = client.get("/recommendations/games/rpg-a/similar")

    assert response.status_code == 200
    assert [item["game_id"] for item in response.json()] == ["rpg-c", "rpg-b"]


def test_similar_games_of_unknown_game_returns_404(client: TestClient) -> None:
    response = client.get("/recommendations/games/missing/similar")

    assert response.status_code == 404


def test_rankings_only_count_reviews_inside_window(client: TestClient) -> None:
    response = client.get("/recommendations/rankings?days=7&min_votes=0")

    assert response.status_code == 200
    body = response.json()
    assert [item["game_id"] for item in body] == ["rpg-b", "rpg-c"]
    assert body[0]["review_count"] == 2
    assert body[0]["average_rating"] == 9.0


def test_rankings_without_window_include_all_reviews(client: TestClient) -> None:
    response = client.get("/recommendations/rankings?min_votes=0")

    assert [item["game_id"] for item in response.json()] == ["rpg-b", "shooter", "rpg-c"]


def test_unreachable_upstream_returns_503() -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    app = create_app(Settings(eureka_enabled=False, _env_file=None))
    app.dependency_overrides[get_gamestar_client] = lambda: GamestarClient(
        httpx.AsyncClient(base_url="http://down.test", transport=httpx.MockTransport(refuse))
    )

    response = TestClient(app).get("/recommendations/rankings")

    assert response.status_code == 503
