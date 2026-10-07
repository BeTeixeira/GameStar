"""Amigos: /api/v1/friends (pedido precisa ser aceito)."""

from httpx import AsyncClient

from tests.integration.helpers import API, register_and_login


async def _users(client: AsyncClient) -> tuple[dict, dict]:
    """Dois usuários: devolve {id, username, headers} de cada um."""
    result = []
    for name in ("alice", "bruno"):
        user_id, headers = await register_and_login(client, name)
        result.append({"id": user_id, "username": name, "headers": headers})
    return result[0], result[1]


async def _request(client: AsyncClient, frm: dict, to: dict):
    return await client.post(
        f"{API}/friends/requests", json={"username": to["username"]}, headers=frm["headers"]
    )


async def test_request_accept_and_remove(client: AsyncClient) -> None:
    alice, bruno = await _users(client)

    resp = await _request(client, alice, bruno)
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "pending"
    request_id = resp.json()["id"]

    # cada lado vê o pedido na direção certa
    resp = await client.get(f"{API}/friends/requests", headers=alice["headers"])
    assert [(r["direction"], r["user"]["username"]) for r in resp.json()] == [
        ("outgoing", "bruno")
    ]
    resp = await client.get(f"{API}/friends/requests", headers=bruno["headers"])
    assert [(r["direction"], r["user"]["username"]) for r in resp.json()] == [
        ("incoming", "alice")
    ]

    # pendente ainda não é amizade
    resp = await client.get(f"{API}/friends", headers=alice["headers"])
    assert resp.json() == []

    # só quem recebeu pode aceitar
    resp = await client.post(
        f"{API}/friends/requests/{request_id}/accept", headers=alice["headers"]
    )
    assert resp.status_code == 403
    resp = await client.post(
        f"{API}/friends/requests/{request_id}/accept", headers=bruno["headers"]
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["username"] == "alice"

    for me, other in ((alice, "bruno"), (bruno, "alice")):
        resp = await client.get(f"{API}/friends", headers=me["headers"])
        assert [f["user"]["username"] for f in resp.json()] == [other]
        resp = await client.get(f"{API}/friends/requests", headers=me["headers"])
        assert resp.json() == []

    resp = await client.delete(f"{API}/friends/{bruno['id']}", headers=alice["headers"])
    assert resp.status_code == 204
    resp = await client.get(f"{API}/friends", headers=bruno["headers"])
    assert resp.json() == []


async def test_decline_and_cancel(client: AsyncClient) -> None:
    alice, bruno = await _users(client)

    request_id = (await _request(client, alice, bruno)).json()["id"]
    resp = await client.delete(f"{API}/friends/requests/{request_id}", headers=bruno["headers"])
    assert resp.status_code == 204  # bruno recusou

    request_id = (await _request(client, alice, bruno)).json()["id"]
    resp = await client.delete(f"{API}/friends/requests/{request_id}", headers=alice["headers"])
    assert resp.status_code == 204  # alice cancelou

    for me in (alice, bruno):
        resp = await client.get(f"{API}/friends/requests", headers=me["headers"])
        assert resp.json() == []


async def test_reverse_request_auto_accepts(client: AsyncClient) -> None:
    alice, bruno = await _users(client)
    await _request(client, alice, bruno)

    resp = await _request(client, bruno, alice)
    assert resp.status_code == 201
    assert resp.json()["status"] == "accepted"

    resp = await client.get(f"{API}/friends", headers=alice["headers"])
    assert [f["user"]["username"] for f in resp.json()] == ["bruno"]


async def test_request_errors(client: AsyncClient) -> None:
    alice, bruno = await _users(client)

    resp = await client.post(
        f"{API}/friends/requests", json={"username": "ninguem"}, headers=alice["headers"]
    )
    assert resp.status_code == 404

    resp = await _request(client, alice, alice)
    assert resp.status_code == 409

    await _request(client, alice, bruno)
    resp = await _request(client, alice, bruno)
    assert resp.status_code == 409  # pedido repetido

    request_id = (
        await client.get(f"{API}/friends/requests", headers=bruno["headers"])
    ).json()[0]["id"]
    await client.post(f"{API}/friends/requests/{request_id}/accept", headers=bruno["headers"])
    resp = await _request(client, alice, bruno)
    assert resp.status_code == 409  # já são amigos

    # desfazer amizade que não existe
    _, carla_headers = await register_and_login(client, "carla")
    resp = await client.delete(f"{API}/friends/{alice['id']}", headers=carla_headers)
    assert resp.status_code == 404

    resp = await client.get(f"{API}/friends")
    assert resp.status_code == 401
