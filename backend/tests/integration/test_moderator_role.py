from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import (
    API,
    make_admin,
    make_expert,
    make_moderator,
    register_and_login,
)


async def _admin(client: AsyncClient, db_session: AsyncSession) -> dict[str, str]:
    admin_id, headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    return headers


async def test_admin_can_make_and_unmake_moderator(client, db_session):
    admin_headers = await _admin(client, db_session)
    target_id, _ = await register_and_login(client)

    resp = await client.put(
        f"{API}/users/{target_id}/role", json={"role": "moderator"}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "moderator"

    resp = await client.put(
        f"{API}/users/{target_id}/role", json={"role": "user"}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "user"


async def test_non_admin_cannot_set_role(client, db_session):
    mod_id, mod_headers = await register_and_login(client)
    await make_moderator(db_session, mod_id)
    target_id, _ = await register_and_login(client)

    resp = await client.put(
        f"{API}/users/{target_id}/role", json={"role": "moderator"}, headers=mod_headers
    )
    assert resp.status_code == 403


async def test_cannot_make_expert_moderator(client, db_session):
    admin_headers = await _admin(client, db_session)
    expert_id, _ = await register_and_login(client)
    await make_expert(db_session, expert_id)

    resp = await client.put(
        f"{API}/users/{expert_id}/role", json={"role": "moderator"}, headers=admin_headers
    )
    assert resp.status_code == 400


async def test_cannot_set_admin_role_via_api(client, db_session):
    admin_headers = await _admin(client, db_session)
    target_id, _ = await register_and_login(client)

    resp = await client.put(
        f"{API}/users/{target_id}/role", json={"role": "admin"}, headers=admin_headers
    )
    assert resp.status_code == 422


async def test_admin_deactivate_records_origin(client, db_session):
    admin_headers = await _admin(client, db_session)
    target_id, _ = await register_and_login(client)

    resp = await client.patch(
        f"{API}/users/{target_id}/status", json={"is_active": False}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["deactivated_by_role"] == "admin"

    resp = await client.patch(
        f"{API}/users/{target_id}/status", json={"is_active": True}, headers=admin_headers
    )
    assert resp.json()["deactivated_by_role"] is None


async def test_cannot_make_moderator_expert(client, db_session):
    admin_headers = await _admin(client, db_session)
    mod_id, _ = await register_and_login(client)
    await make_moderator(db_session, mod_id)

    resp = await client.put(
        f"{API}/users/{mod_id}/account-type",
        json={"account_type": "especialista", "expertise_area": "dev"},
        headers=admin_headers,
    )
    assert resp.status_code == 400
