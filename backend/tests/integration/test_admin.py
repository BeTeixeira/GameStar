"""Funções de admin: usuários (busca, status, exclusão), tipo de conta e moderação."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import (
    API,
    PASSWORD,
    create_game,
    make_admin,
    register_and_login,
)


async def _admin(client: AsyncClient, db_session: AsyncSession) -> tuple[str, dict[str, str]]:
    admin_id, headers = await register_and_login(client, "chefe")
    await make_admin(db_session, admin_id)
    return admin_id, headers


async def test_user_list_is_admin_only_and_searchable(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, admin_headers = await _admin(client, db_session)
    _, user_headers = await register_and_login(client, "maria_silva")
    await register_and_login(client, "joao")

    assert (await client.get(f"{API}/users")).status_code == 401
    assert (await client.get(f"{API}/users", headers=user_headers)).status_code == 403

    resp = await client.get(f"{API}/users", params={"q": "MARIA"}, headers=admin_headers)
    assert resp.status_code == 200
    assert [u["username"] for u in resp.json()] == ["maria_silva"]
    # busca também por e-mail
    resp = await client.get(f"{API}/users", params={"q": "joao@"}, headers=admin_headers)
    assert [u["username"] for u in resp.json()] == ["joao"]


async def test_deactivate_and_reactivate_account(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    admin_id, admin_headers = await _admin(client, db_session)
    user_id, user_headers = await register_and_login(client, "suspenso")
    login = {"username": "suspenso@example.com", "password": PASSWORD}

    resp = await client.patch(
        f"{API}/users/{user_id}/status", json={"is_active": False}, headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    # conta desativada não entra nem usa o token antigo
    assert (await client.post(f"{API}/auth/token", data=login)).status_code == 403
    assert (await client.get(f"{API}/users/me", headers=user_headers)).status_code == 401

    await client.patch(
        f"{API}/users/{user_id}/status", json={"is_active": True}, headers=admin_headers
    )
    assert (await client.post(f"{API}/auth/token", data=login)).status_code == 200

    # admin não desativa a si mesmo; usuário comum não desativa ninguém
    resp = await client.patch(
        f"{API}/users/{admin_id}/status", json={"is_active": False}, headers=admin_headers
    )
    assert resp.status_code == 400
    resp = await client.patch(
        f"{API}/users/{admin_id}/status", json={"is_active": False}, headers=user_headers
    )
    assert resp.status_code == 403


async def test_admin_deletes_user_but_not_self(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    admin_id, admin_headers = await _admin(client, db_session)
    user_id, _ = await register_and_login(client, "apagado")

    resp = await client.delete(f"{API}/users/{admin_id}", headers=admin_headers)
    assert resp.status_code == 400
    assert (await client.delete(f"{API}/users/{user_id}", headers=admin_headers)).status_code == 204
    assert (await client.get(f"{API}/users/{user_id}")).status_code == 404


async def test_admin_sets_account_type_by_id(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, admin_headers = await _admin(client, db_session)
    user_id, user_headers = await register_and_login(client, "futura_critica")
    url = f"{API}/users/{user_id}/account-type"

    # especialista exige área
    resp = await client.put(url, json={"account_type": "especialista"}, headers=admin_headers)
    assert resp.status_code == 422

    resp = await client.put(
        url, json={"account_type": "especialista", "expertise_area": "dev"}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text
    assert (resp.json()["account_type"], resp.json()["expertise_area"]) == ("especialista", "dev")

    # agora a conta pode preencher empresa
    resp = await client.patch(f"{API}/users/me", json={"company": "Estúdio"}, headers=user_headers)
    assert resp.status_code == 200

    # voltar para normal limpa área e empresa
    resp = await client.put(
        url, json={"account_type": "normal", "expertise_area": "dev"}, headers=admin_headers
    )
    me = (await client.get(f"{API}/users/me", headers=user_headers)).json()
    assert (me["account_type"], me["expertise_area"], me["company"]) == ("normal", None, None)

    # só admin; id inexistente dá 404
    resp = await client.put(
        url, json={"account_type": "especialista", "expertise_area": "dev"}, headers=user_headers
    )
    assert resp.status_code == 403
    resp = await client.put(
        f"{API}/users/00000000-0000-0000-0000-000000000000/account-type",
        json={"account_type": "normal"},
        headers=admin_headers,
    )
    assert resp.status_code == 404


async def test_admin_moderates_any_review(client: AsyncClient, db_session: AsyncSession) -> None:
    _, admin_headers = await _admin(client, db_session)
    game_id = await create_game(client, admin_headers)
    _, author_headers = await register_and_login(client, "autor")
    _, other_headers = await register_and_login(client, "outro")

    review_id = (
        await client.post(
            f"{API}/reviews",
            json={"game_id": game_id, "rating": 2, "body": "Comentário ofensivo"},
            headers=author_headers,
        )
    ).json()["id"]

    resp = await client.delete(f"{API}/reviews/{review_id}", headers=other_headers)
    assert resp.status_code == 403
    resp = await client.delete(f"{API}/reviews/{review_id}", headers=admin_headers)
    assert resp.status_code == 204
    assert (await client.get(f"{API}/reviews/{review_id}")).status_code == 404
