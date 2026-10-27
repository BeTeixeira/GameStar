import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.user import User
from tests.integration.helpers import (
    API,
    create_game,
    make_admin,
    make_expert,
    make_moderator,
    register_and_login,
)


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict[str, str]:
    admin_id, headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    return headers


async def _mute(db_session: AsyncSession, user_id: str) -> None:
    user = await db_session.get(User, uuid.UUID(user_id))
    user.is_muted = True
    await db_session.flush()


async def test_expert_creates_full_analysis(client: AsyncClient, db_session: AsyncSession) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    expert_id, headers = await register_and_login(client)
    await make_expert(db_session, expert_id)
    payload = {
        "game_id": game_id,
        "rating": 9,
        "body": "Texto",
        "title": "Obra-prima",
        "pros": "Mundo vivo",
        "cons": "Final curto",
        "pinned": True,
    }
    resp = await client.post(f"{API}/reviews", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["title"] == "Obra-prima"
    assert data["pros"] == "Mundo vivo"
    assert data["cons"] == "Final curto"
    assert data["pinned"] is True
    assert data["game_title"] == "Jogo de Teste"


async def test_normal_user_cannot_send_expert_fields(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    _, headers = await register_and_login(client)
    resp = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5, "title": "x"}, headers=headers
    )
    assert resp.status_code == 400


async def test_pinning_unpins_previous(client: AsyncClient, db_session: AsyncSession) -> None:
    admin_headers = await _admin_headers(client, db_session)
    game_a = await create_game(client, admin_headers, "Jogo A")
    game_b = await create_game(client, admin_headers, "Jogo B")
    expert_id, headers = await register_and_login(client)
    await make_expert(db_session, expert_id)
    first = await client.post(
        f"{API}/reviews", json={"game_id": game_a, "rating": 8, "pinned": True}, headers=headers
    )
    assert first.json()["pinned"] is True
    second = await client.post(
        f"{API}/reviews", json={"game_id": game_b, "rating": 8, "pinned": True}, headers=headers
    )
    assert second.json()["pinned"] is True
    refreshed = await client.get(f"{API}/reviews/{first.json()['id']}")
    assert refreshed.json()["pinned"] is False


async def test_muted_user_cannot_create_review(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    user_id, headers = await register_and_login(client)
    await _mute(db_session, user_id)
    resp = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5}, headers=headers
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Your account is muted."


async def test_muted_user_cannot_edit_review(client: AsyncClient, db_session: AsyncSession) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    user_id, headers = await register_and_login(client)
    review = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5}, headers=headers
    )
    await _mute(db_session, user_id)
    resp = await client.patch(
        f"{API}/reviews/{review.json()['id']}", json={"rating": 6}, headers=headers
    )
    assert resp.status_code == 403


async def test_muted_user_cannot_delete_own_review(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    user_id, headers = await register_and_login(client)
    review = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5}, headers=headers
    )
    await _mute(db_session, user_id)
    resp = await client.delete(f"{API}/reviews/{review.json()['id']}", headers=headers)
    assert resp.status_code == 403


async def test_moderator_deletes_any_review_and_author_is_notified(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    game_id = await create_game(client, await _admin_headers(client, db_session))
    author_id, author_headers = await register_and_login(client)
    review = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5}, headers=author_headers
    )
    moderator_id, moderator_headers = await register_and_login(client)
    await make_moderator(db_session, moderator_id)
    resp = await client.delete(f"{API}/reviews/{review.json()['id']}", headers=moderator_headers)
    assert resp.status_code == 204
    items = (await client.get(f"{API}/notifications", headers=author_headers)).json()
    assert [item["type"] for item in items] == ["review_removed"]
    assert items[0]["title"] == "Comentário removido"
    assert "Jogo de Teste" in items[0]["body"]


async def test_moderator_cannot_delete_admin_review(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    admin_headers = await _admin_headers(client, db_session)
    game_id = await create_game(client, admin_headers)
    review = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 5}, headers=admin_headers
    )
    moderator_id, moderator_headers = await register_and_login(client)
    await make_moderator(db_session, moderator_id)
    resp = await client.delete(f"{API}/reviews/{review.json()['id']}", headers=moderator_headers)
    assert resp.status_code == 403
