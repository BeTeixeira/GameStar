"""Fluxo completo pela API HTTP: cadastro, login, jogo (admin) e reviews."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import API, create_game, make_admin, register_and_login


async def test_full_review_flow(client: AsyncClient, db_session: AsyncSession) -> None:
    admin_id, admin_headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    game_id = await create_game(client, admin_headers)

    user_id, headers = await register_and_login(client)

    # usuário comum não cria jogo
    resp = await client.post(f"{API}/games", json={"title": "Proibido"}, headers=headers)
    assert resp.status_code == 403

    # cria, edita, lista e apaga a própria review
    resp = await client.post(
        f"{API}/reviews",
        json={"game_id": game_id, "rating": 8, "body": "Muito bom"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    review = resp.json()
    assert review["user_id"] == user_id
    assert review["username"] is not None

    resp = await client.patch(f"{API}/reviews/{review['id']}", json={"rating": 10}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["rating"] == 10

    resp = await client.get(f"{API}/reviews/game/{game_id}")
    assert [r["id"] for r in resp.json()] == [review["id"]]

    resp = await client.get(f"{API}/reviews/user/{user_id}")
    assert [r["game_id"] for r in resp.json()] == [game_id]

    # outro usuário não mexe na review alheia
    _, other_headers = await register_and_login(client)
    resp = await client.delete(f"{API}/reviews/{review['id']}", headers=other_headers)
    assert resp.status_code == 403

    resp = await client.delete(f"{API}/reviews/{review['id']}", headers=headers)
    assert resp.status_code == 204


async def test_requires_auth(client: AsyncClient) -> None:
    resp = await client.post(f"{API}/reviews", json={"game_id": str(uuid.uuid4()), "rating": 5})
    assert resp.status_code == 401


async def test_duplicate_review_returns_409(client: AsyncClient, db_session: AsyncSession) -> None:
    admin_id, admin_headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    game_id = await create_game(client, admin_headers)
    _, headers = await register_and_login(client)

    body = {"game_id": game_id, "rating": 6}
    assert (await client.post(f"{API}/reviews", json=body, headers=headers)).status_code == 201
    resp = await client.post(f"{API}/reviews", json=body, headers=headers)
    assert resp.status_code == 409
