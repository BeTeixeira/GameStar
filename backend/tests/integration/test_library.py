"""Minha lista: /api/v1/library."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import API, create_game, make_admin, register_and_login


async def _setup(client: AsyncClient, db_session: AsyncSession) -> tuple[str, str, dict]:
    admin_id, admin_headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    game_a = await create_game(client, admin_headers, "Jogo A")
    game_b = await create_game(client, admin_headers, "Jogo B")
    _, headers = await register_and_login(client)
    return game_a, game_b, headers


async def test_set_update_list_and_remove(client: AsyncClient, db_session: AsyncSession) -> None:
    game_a, game_b, headers = await _setup(client, db_session)

    resp = await client.get(f"{API}/library", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []

    resp = await client.put(f"{API}/library/{game_a}", json={"status": "playing"}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "playing"

    # PUT de novo troca o status em vez de duplicar
    resp = await client.put(
        f"{API}/library/{game_a}", json={"status": "completed"}, headers=headers
    )
    assert resp.json()["status"] == "completed"
    await client.put(f"{API}/library/{game_b}", json={"status": "plan_to_play"}, headers=headers)

    resp = await client.get(f"{API}/library", headers=headers)
    assert {e["game_id"]: e["status"] for e in resp.json()} == {
        game_a: "completed",
        game_b: "plan_to_play",
    }

    resp = await client.delete(f"{API}/library/{game_a}", headers=headers)
    assert resp.status_code == 204
    resp = await client.get(f"{API}/library", headers=headers)
    assert [e["game_id"] for e in resp.json()] == [game_b]


async def test_lists_are_per_user(client: AsyncClient, db_session: AsyncSession) -> None:
    game_a, _, headers = await _setup(client, db_session)
    _, other_headers = await register_and_login(client)

    await client.put(f"{API}/library/{game_a}", json={"status": "disliked"}, headers=headers)

    resp = await client.get(f"{API}/library", headers=other_headers)
    assert resp.json() == []


async def test_errors(client: AsyncClient, db_session: AsyncSession) -> None:
    game_a, _, headers = await _setup(client, db_session)

    resp = await client.put(
        f"{API}/library/{uuid.uuid4()}", json={"status": "playing"}, headers=headers
    )
    assert resp.status_code == 404

    resp = await client.put(f"{API}/library/{game_a}", json={"status": "invalido"}, headers=headers)
    assert resp.status_code == 422

    resp = await client.delete(f"{API}/library/{game_a}", headers=headers)
    assert resp.status_code == 404

    resp = await client.get(f"{API}/library")
    assert resp.status_code == 401
