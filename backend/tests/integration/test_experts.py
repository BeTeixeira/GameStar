"""Conta especialista: perfil, selo nas avaliações e seguidores.

O cadastro público só cria conta normal; aqui a conta vira especialista direto no
banco (make_expert), já que o fluxo de criação de especialista ainda vai ser definido.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.user import ExpertArea
from tests.integration.helpers import (
    API,
    PASSWORD,
    create_game,
    make_admin,
    make_expert,
    register_and_login,
)


async def _register_expert(
    client: AsyncClient,
    db_session: AsyncSession,
    username: str = "critica",
    area: ExpertArea = ExpertArea.jornalista,
) -> tuple[str, dict[str, str]]:
    user_id, headers = await register_and_login(client, username)
    await make_expert(db_session, user_id, area)
    return user_id, headers


async def test_normal_account_is_default(client: AsyncClient) -> None:
    _, headers = await register_and_login(client, "comum")
    me = (await client.get(f"{API}/users/me", headers=headers)).json()
    assert me["account_type"] == "normal"
    assert me["expertise_area"] is None
    assert me["company"] is None
    assert me["followers_count"] == 0


async def test_public_signup_cannot_create_expert(client: AsyncClient) -> None:
    resp = await client.post(
        f"{API}/users",
        json={
            "username": "espertinho",
            "email": "espertinho@example.com",
            "password": PASSWORD,
            "account_type": "especialista",
            "expertise_area": "dev",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["account_type"] == "normal"
    assert resp.json()["expertise_area"] is None


async def test_expert_fields_are_returned(client: AsyncClient, db_session: AsyncSession) -> None:
    expert_id, headers = await _register_expert(client, db_session)
    me = (await client.get(f"{API}/users/me", headers=headers)).json()
    assert me["account_type"] == "especialista"
    assert me["expertise_area"] == "jornalista"
    public = (await client.get(f"{API}/users/{expert_id}")).json()
    assert public["account_type"] == "especialista"


async def test_expert_profile_fields_are_saved(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, headers = await _register_expert(client, db_session)

    resp = await client.patch(
        f"{API}/users/me",
        json={"company": "  Revista Gamer  ", "expertise_area": "influencer"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["company"] == "Revista Gamer"
    assert resp.json()["expertise_area"] == "influencer"

    # persistiu: um novo GET devolve os mesmos valores
    me = (await client.get(f"{API}/users/me", headers=headers)).json()
    assert (me["company"], me["expertise_area"]) == ("Revista Gamer", "influencer")

    # área não pode ser apagada; empresa pode
    resp = await client.patch(f"{API}/users/me", json={"expertise_area": None}, headers=headers)
    assert resp.status_code == 400
    resp = await client.patch(f"{API}/users/me", json={"company": ""}, headers=headers)
    assert resp.json()["company"] is None


async def test_normal_account_cannot_set_expert_fields(client: AsyncClient) -> None:
    _, headers = await register_and_login(client, "curioso")
    resp = await client.patch(f"{API}/users/me", json={"company": "ACME"}, headers=headers)
    assert resp.status_code == 400
    resp = await client.patch(f"{API}/users/me", json={"expertise_area": "dev"}, headers=headers)
    assert resp.status_code == 400


async def test_follow_and_unfollow_expert(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers = await _register_expert(client, db_session)
    fan_id, fan_headers = await register_and_login(client, "fa1")

    resp = await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"user_id": expert_id, "following": True, "followers_count": 1}

    # repetir não duplica nem dá erro
    resp = await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    assert resp.json()["followers_count"] == 1

    me = (await client.get(f"{API}/users/me", headers=expert_headers)).json()
    assert me["followers_count"] == 1
    public = (await client.get(f"{API}/users/{expert_id}")).json()
    assert public["followers_count"] == 1

    following = (await client.get(f"{API}/users/me/following", headers=fan_headers)).json()
    assert [u["id"] for u in following] == [expert_id]

    resp = await client.delete(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    assert resp.json() == {"user_id": expert_id, "following": False, "followers_count": 0}
    following = (await client.get(f"{API}/users/me/following", headers=fan_headers)).json()
    assert following == []


async def test_follow_rules(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers = await _register_expert(client, db_session)
    normal_id, normal_headers = await register_and_login(client, "normal")

    # só especialista pode ser seguido
    resp = await client.post(f"{API}/users/{normal_id}/follow", headers=expert_headers)
    assert resp.status_code == 400
    # ninguém segue a si mesmo
    resp = await client.post(f"{API}/users/{expert_id}/follow", headers=expert_headers)
    assert resp.status_code == 400
    # usuário inexistente
    resp = await client.post(
        f"{API}/users/00000000-0000-0000-0000-000000000000/follow", headers=normal_headers
    )
    assert resp.status_code == 404
    # precisa estar logado
    resp = await client.post(f"{API}/users/{expert_id}/follow")
    assert resp.status_code == 401


async def test_deleting_expert_removes_follows(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers = await _register_expert(client, db_session)
    _, fan_headers = await register_and_login(client, "fa_2")
    await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)

    resp = await client.request(
        "DELETE", f"{API}/users/me", json={"password": PASSWORD}, headers=expert_headers
    )
    assert resp.status_code == 204
    following = (await client.get(f"{API}/users/me/following", headers=fan_headers)).json()
    assert following == []


async def test_reviews_carry_expert_badge(client: AsyncClient, db_session: AsyncSession) -> None:
    admin_id, admin_headers = await register_and_login(client, "chefe")
    await make_admin(db_session, admin_id)
    game_id = await create_game(client, admin_headers)

    _, expert_headers = await _register_expert(client, db_session, "especialista1", ExpertArea.dev)
    _, normal_headers = await register_and_login(client, "jogador1")
    for headers, rating in ((expert_headers, 9), (normal_headers, 6)):
        resp = await client.post(
            f"{API}/reviews",
            json={"game_id": game_id, "rating": rating, "body": "Comentário de teste"},
            headers=headers,
        )
        assert resp.status_code == 201, resp.text

    reviews = (await client.get(f"{API}/reviews/game/{game_id}")).json()
    by_user = {r["username"]: r for r in reviews}
    assert by_user["especialista1"]["is_expert"] is True
    assert by_user["especialista1"]["expertise_area"] == "dev"
    assert by_user["especialista1"]["display_name"] == "Ana Crítica"
    assert by_user["jogador1"]["is_expert"] is False
    assert by_user["jogador1"]["expertise_area"] is None
