"""Perfil público (/users/{id}/profile), GET /users/{id} restrito e filtro de contas."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import (
    API,
    make_admin,
    make_moderator,
    register_and_login,
)


async def test_profile_hides_email(client: AsyncClient) -> None:
    target_id, _ = await register_and_login(client, "alvo_perfil")
    _, viewer_headers = await register_and_login(client, "visitante")

    resp = await client.get(f"{API}/users/{target_id}/profile", headers=viewer_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "email" not in body
    assert "bio" in body and "avatar_url" in body


async def test_profile_moderation_fields_only_for_moderators(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    target_id, _ = await register_and_login(client, "alvo_mod")
    _, viewer_headers = await register_and_login(client, "visitante_mod")
    mod_id, mod_headers = await register_and_login(client, "moderadora")
    await make_moderator(db_session, mod_id)

    resp = await client.get(f"{API}/users/{target_id}/profile", headers=viewer_headers)
    assert resp.json()["is_muted"] is None

    resp = await client.get(f"{API}/users/{target_id}/profile", headers=mod_headers)
    assert resp.json()["is_muted"] is False


async def test_profile_missing_and_inactive(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    admin_id, admin_headers = await register_and_login(client, "chefe_perfil")
    await make_admin(db_session, admin_id)
    target_id, _ = await register_and_login(client, "banido_perfil")
    _, viewer_headers = await register_and_login(client, "visitante_ban")

    missing = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{API}/users/{missing}/profile", headers=viewer_headers)
    assert resp.status_code == 404

    await client.patch(
        f"{API}/users/{target_id}/status", json={"is_active": False}, headers=admin_headers
    )
    resp = await client.get(f"{API}/users/{target_id}/profile", headers=viewer_headers)
    assert resp.status_code == 404
    resp = await client.get(f"{API}/users/{target_id}/profile", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


async def test_get_user_by_id_requires_admin_or_self(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    target_id, target_headers = await register_and_login(client, "alvo_id")
    _, other_headers = await register_and_login(client, "outro_id")
    admin_id, admin_headers = await register_and_login(client, "chefe_id")
    await make_admin(db_session, admin_id)
    url = f"{API}/users/{target_id}"

    assert (await client.get(url)).status_code == 401
    assert (await client.get(url, headers=other_headers)).status_code == 403
    assert (await client.get(url, headers=target_headers)).status_code == 200
    assert (await client.get(url, headers=admin_headers)).status_code == 200


async def test_list_users_filter_banidas(client: AsyncClient, db_session: AsyncSession) -> None:
    admin_id, admin_headers = await register_and_login(client, "chefe_filtro")
    await make_admin(db_session, admin_id)
    banned_id, _ = await register_and_login(client, "banida_filtro")
    await register_and_login(client, "normal_filtro")

    await client.patch(
        f"{API}/users/{banned_id}/status", json={"is_active": False}, headers=admin_headers
    )
    resp = await client.get(f"{API}/users?type=banidas", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert [u["id"] for u in resp.json()] == [banned_id]


async def test_list_users_filter_other_types(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    admin_id, admin_headers = await register_and_login(client, "chefe_tipos")
    await make_admin(db_session, admin_id)
    mod_id, _ = await register_and_login(client, "mod_tipos")
    await make_moderator(db_session, mod_id)
    normal_id, _ = await register_and_login(client, "normal_tipos")

    resp = await client.get(f"{API}/users?type=moderadores", headers=admin_headers)
    assert [u["id"] for u in resp.json()] == [mod_id]
    resp = await client.get(f"{API}/users?type=admins", headers=admin_headers)
    assert [u["id"] for u in resp.json()] == [admin_id]
    resp = await client.get(f"{API}/users?type=normais", headers=admin_headers)
    assert [u["id"] for u in resp.json()] == [normal_id]
    resp = await client.get(f"{API}/users?type=especialistas", headers=admin_headers)
    assert resp.json() == []
    resp = await client.get(f"{API}/users?type=invalido", headers=admin_headers)
    assert resp.status_code == 422
