import httpx
import pytest

from app.domain.models import LibraryStatus
from app.infrastructure.gamestar_client import (
    GamestarClient,
    UpstreamNotFoundError,
    UpstreamUnauthorizedError,
    UpstreamUnavailableError,
)
from tests.fakes import VALID_TOKEN, FakeGamestarApi, game_payload, review_payload


@pytest.fixture
def api() -> FakeGamestarApi:
    return FakeGamestarApi()


async def test_list_games_follows_pagination_until_last_page(api: FakeGamestarApi) -> None:
    api.games = [game_payload(f"g{i}", f"Game {i}", "RPG") for i in range(150)]

    games = await api.client().list_games()

    assert len(games) == 150
    assert games[0].title == "Game 0"
    assert [r.url.params["skip"] for r in api.requests] == ["0", "100"]


async def test_get_game_maps_missing_game_to_not_found(api: FakeGamestarApi) -> None:
    with pytest.raises(UpstreamNotFoundError):
        await api.client().get_game("missing")


async def test_list_reviews_by_game_parses_timestamps(api: FakeGamestarApi) -> None:
    api.reviews = [review_payload("u1", "g1", 8, "2026-11-10T10:00:00Z")]

    reviews = await api.client().list_reviews_by_game("g1")

    assert reviews[0].rating == 8
    assert reviews[0].created_at.year == 2026
    assert reviews[0].created_at.tzinfo is not None


async def test_list_reviews_for_games_merges_all_games(api: FakeGamestarApi) -> None:
    api.reviews = [
        review_payload("u1", "g1", 8, "2026-11-10T10:00:00Z"),
        review_payload("u2", "g2", 6, "2026-11-10T10:00:00Z"),
    ]

    reviews = await api.client().list_reviews_for_games(["g1", "g2"])

    assert sorted(r.game_id for r in reviews) == ["g1", "g2"]


async def test_list_my_library_forwards_authorization(api: FakeGamestarApi) -> None:
    api.library = [
        {
            "game_id": "g1",
            "status": "completed",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
    ]

    library = await api.client().list_my_library(VALID_TOKEN)

    assert library[0].status is LibraryStatus.COMPLETED
    assert api.requests[0].headers["Authorization"] == VALID_TOKEN


async def test_rejected_token_raises_unauthorized(api: FakeGamestarApi) -> None:
    with pytest.raises(UpstreamUnauthorizedError):
        await api.client().list_my_friend_ids("Bearer wrong")


async def test_list_my_friend_ids_returns_other_user_ids(api: FakeGamestarApi) -> None:
    api.friend_ids = ["friend-1", "friend-2"]

    assert await api.client().list_my_friend_ids(VALID_TOKEN) == ["friend-1", "friend-2"]


async def test_connection_failure_raises_unavailable() -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    http = httpx.AsyncClient(base_url="http://down.test", transport=httpx.MockTransport(refuse))

    with pytest.raises(UpstreamUnavailableError):
        await GamestarClient(http).list_games()


async def test_server_error_raises_unavailable() -> None:
    http = httpx.AsyncClient(
        base_url="http://broken.test",
        transport=httpx.MockTransport(lambda request: httpx.Response(500)),
    )

    with pytest.raises(UpstreamUnavailableError):
        await GamestarClient(http).list_games()
