"""Pedidos para virar conta especialista: criação, decisão do admin e notificações."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.expert_request import ExpertRequest
from app.domain.models.user import User
from tests.integration.helpers import (
    API,
    make_admin,
    make_expert,
    make_moderator,
    register_and_login,
)

REQUESTS = f"{API}/expert-requests"
PAYLOAD = {
    "expertise_area": "jornalista",
    "company": "Revista Pixel",
    "link": "https://example.com/portfolio",
    "message": "Escrevo sobre jogos há dez anos.",
}


async def _admin(client: AsyncClient, db_session: AsyncSession) -> dict[str, str]:
    admin_id, headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    return headers


async def _notifications(client: AsyncClient, headers: dict[str, str]) -> list[dict]:
    resp = await client.get(f"{API}/notifications", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_user_creates_request_and_sees_it(client: AsyncClient):
    user_id, headers = await register_and_login(client)
    assert (await client.get(f"{REQUESTS}/me", headers=headers)).json() is None

    resp = await client.post(REQUESTS, json=PAYLOAD, headers=headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["user_id"] == user_id
    assert body["expertise_area"] == "jornalista"
    assert body["company"] == "Revista Pixel"
    assert body["username"]

    mine = (await client.get(f"{REQUESTS}/me", headers=headers)).json()
    assert mine["id"] == body["id"]


async def test_only_one_pending_request(client: AsyncClient):
    _, headers = await register_and_login(client)
    assert (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).status_code == 201
    resp = await client.post(REQUESTS, json=PAYLOAD, headers=headers)
    assert resp.status_code == 409


async def test_moderator_cannot_request(client: AsyncClient, db_session: AsyncSession):
    mod_id, headers = await register_and_login(client)
    await make_moderator(db_session, mod_id)
    resp = await client.post(REQUESTS, json=PAYLOAD, headers=headers)
    assert resp.status_code == 400


async def test_expert_cannot_request(client: AsyncClient, db_session: AsyncSession):
    expert_id, headers = await register_and_login(client)
    await make_expert(db_session, expert_id)
    assert (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).status_code == 400


async def test_admin_approves_and_user_becomes_expert(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _admin(client, db_session)
    user_id, headers = await register_and_login(client)
    request_id = (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).json()["id"]

    resp = await client.post(f"{REQUESTS}/{request_id}/approve", headers=admin)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "approved"
    assert resp.json()["decided_at"] is not None

    me = (await client.get(f"{API}/users/me", headers=headers)).json()
    assert me["account_type"] == "especialista"
    assert me["expertise_area"] == "jornalista"
    assert me["company"] == "Revista Pixel"

    notifications = await _notifications(client, headers)
    approved = [n for n in notifications if n["type"] == "expert_request_approved"]
    assert len(approved) == 1
    assert approved[0]["title"] == "Pedido aprovado"
    assert approved[0]["body"] == "Agora você é especialista no GameStar."
    assert approved[0]["data"] == {"route": "/perfil"}

    again = await client.post(f"{REQUESTS}/{request_id}/approve", headers=admin)
    assert again.status_code == 409
    assert (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).status_code == 400


async def test_reject_requires_reason(client: AsyncClient, db_session: AsyncSession):
    admin = await _admin(client, db_session)
    _, headers = await register_and_login(client)
    request_id = (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).json()["id"]

    short = await client.post(
        f"{REQUESTS}/{request_id}/reject", json={"reason": "no"}, headers=admin
    )
    assert short.status_code == 422

    resp = await client.post(
        f"{REQUESTS}/{request_id}/reject", json={"reason": "Sem comprovação"}, headers=admin
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"
    assert resp.json()["rejection_reason"] == "Sem comprovação"

    mine = (await client.get(f"{REQUESTS}/me", headers=headers)).json()
    assert mine["rejection_reason"] == "Sem comprovação"

    notifications = await _notifications(client, headers)
    rejected = [n for n in notifications if n["type"] == "expert_request_rejected"]
    assert len(rejected) == 1
    assert rejected[0]["title"] == "Pedido recusado"
    assert rejected[0]["body"] == "Motivo: Sem comprovação"

    again = await client.post(
        f"{REQUESTS}/{request_id}/reject", json={"reason": "Outra vez"}, headers=admin
    )
    assert again.status_code == 409
    assert (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).status_code == 201


async def test_non_admin_cannot_list_requests(client: AsyncClient):
    _, headers = await register_and_login(client)
    request_id = (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).json()["id"]
    assert (await client.get(REQUESTS, headers=headers)).status_code == 403
    assert (await client.get(f"{REQUESTS}/{request_id}", headers=headers)).status_code == 403
    assert (await client.post(f"{REQUESTS}/{request_id}/approve", headers=headers)).status_code == 403
    rejected = await client.post(
        f"{REQUESTS}/{request_id}/reject", json={"reason": "abc"}, headers=headers
    )
    assert rejected.status_code == 403


async def test_admin_lists_filters_and_gets_request(client: AsyncClient, db_session: AsyncSession):
    admin = await _admin(client, db_session)
    _, first_headers = await register_and_login(client)
    _, second_headers = await register_and_login(client)
    first = (await client.post(REQUESTS, json=PAYLOAD, headers=first_headers)).json()["id"]
    second = (await client.post(REQUESTS, json=PAYLOAD, headers=second_headers)).json()["id"]
    older = await db_session.get(ExpertRequest, uuid.UUID(first))
    older.created_at = datetime.now(timezone.utc) - timedelta(days=1)
    await db_session.flush()
    await client.post(f"{REQUESTS}/{first}/approve", headers=admin)

    everything = (await client.get(REQUESTS, headers=admin)).json()
    assert [item["id"] for item in everything] == [second, first]
    pending = (await client.get(f"{REQUESTS}?status=pending", headers=admin)).json()
    assert [item["id"] for item in pending] == [second]
    assert (await client.get(f"{REQUESTS}?limit=0", headers=admin)).status_code == 422

    detail = await client.get(f"{REQUESTS}/{first}", headers=admin)
    assert detail.status_code == 200
    assert detail.json()["status"] == "approved"
    assert (await client.get(f"{REQUESTS}/{uuid.uuid4()}", headers=admin)).status_code == 404


async def test_approve_refused_when_user_no_longer_eligible(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _admin(client, db_session)
    expert_id, expert_headers = await register_and_login(client)
    banned_id, banned_headers = await register_and_login(client)
    mod_id, mod_headers = await register_and_login(client)
    expert_request = (await client.post(REQUESTS, json=PAYLOAD, headers=expert_headers)).json()["id"]
    banned_request = (await client.post(REQUESTS, json=PAYLOAD, headers=banned_headers)).json()["id"]
    mod_request = (await client.post(REQUESTS, json=PAYLOAD, headers=mod_headers)).json()["id"]

    await make_expert(db_session, expert_id)
    await make_moderator(db_session, mod_id)
    banned = await db_session.get(User, uuid.UUID(banned_id))
    banned.is_active = False
    await db_session.flush()

    for request_id in (expert_request, banned_request, mod_request):
        resp = await client.post(f"{REQUESTS}/{request_id}/approve", headers=admin)
        assert resp.status_code == 400, resp.text


async def test_long_rejection_reason_fits_notification_body(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _admin(client, db_session)
    _, headers = await register_and_login(client)
    request_id = (await client.post(REQUESTS, json=PAYLOAD, headers=headers)).json()["id"]

    resp = await client.post(
        f"{REQUESTS}/{request_id}/reject", json={"reason": "x" * 300}, headers=admin
    )
    assert resp.status_code == 200, resp.text

    rejected = [
        n for n in await _notifications(client, headers) if n["type"] == "expert_request_rejected"
    ]
    assert len(rejected) == 1
    assert len(rejected[0]["body"]) <= 300
