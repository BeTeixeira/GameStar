"""Notificações in-app e push (Expo)."""

import httpx
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.models.notification import PushToken
from app.infrastructure.push import PushSender
from tests.integration.helpers import API, make_expert, register_and_login


async def _expert_and_fan(client: AsyncClient, db_session: AsyncSession):
    expert_id, expert_headers = await register_and_login(client, "especialista1")
    await make_expert(db_session, expert_id)
    fan_id, fan_headers = await register_and_login(client, "fa_notif")
    return expert_id, expert_headers, fan_id, fan_headers


async def test_follow_creates_notification_for_expert(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers, _, fan_headers = await _expert_and_fan(client, db_session)

    await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)

    items = (await client.get(f"{API}/notifications", headers=expert_headers)).json()
    assert len(items) == 1
    assert items[0]["type"] == "new_follower"
    assert items[0]["title"] == "Novo seguidor"
    assert items[0]["body"] == "@fa_notif começou a seguir você"
    assert items[0]["data"] == {"route": "/especialista/seguidores"}
    assert items[0]["read_at"] is None


async def test_friend_request_respects_preference(client: AsyncClient) -> None:
    _, sender_headers = await register_and_login(client, "remetente")
    quiet_id, quiet_headers = await register_and_login(client, "quieto")
    _, loud_headers = await register_and_login(client, "barulhento")
    resp = await client.patch(
        f"{API}/users/me", json={"notify_friend_requests": False}, headers=quiet_headers
    )
    assert resp.status_code == 200, resp.text

    await client.post(f"{API}/friends/requests", json={"username": "quieto"}, headers=sender_headers)
    await client.post(
        f"{API}/friends/requests", json={"username": "barulhento"}, headers=sender_headers
    )

    assert (await client.get(f"{API}/notifications", headers=quiet_headers)).json() == []
    loud = (await client.get(f"{API}/notifications", headers=loud_headers)).json()
    assert [n["type"] for n in loud] == ["friend_request"]
    assert loud[0]["title"] == "Pedido de amizade"
    assert loud[0]["body"] == "@remetente quer ser seu amigo"
    assert loud[0]["data"] == {"route": "/amigos"}


async def test_unread_count_and_mark_all_read(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers, _, fan_headers = await _expert_and_fan(client, db_session)
    _, other_headers = await register_and_login(client, "fa_notif2")
    await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    await client.post(f"{API}/users/{expert_id}/follow", headers=other_headers)

    resp = await client.get(f"{API}/notifications/unread-count", headers=expert_headers)
    assert resp.json() == {"count": 2}

    first = (await client.get(f"{API}/notifications", headers=expert_headers)).json()[0]
    resp = await client.post(f"{API}/notifications/{first['id']}/read", headers=expert_headers)
    assert resp.status_code == 204
    resp = await client.get(f"{API}/notifications/unread-count", headers=expert_headers)
    assert resp.json() == {"count": 1}

    resp = await client.post(f"{API}/notifications/read-all", headers=expert_headers)
    assert resp.status_code == 204
    resp = await client.get(f"{API}/notifications/unread-count", headers=expert_headers)
    assert resp.json() == {"count": 0}


async def test_cannot_mark_other_users_notification(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    expert_id, expert_headers, _, fan_headers = await _expert_and_fan(client, db_session)
    await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    notification = (await client.get(f"{API}/notifications", headers=expert_headers)).json()[0]

    resp = await client.post(f"{API}/notifications/{notification['id']}/read", headers=fan_headers)
    assert resp.status_code == 404


async def test_push_token_moves_between_users(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_a, headers_a = await register_and_login(client, "dono_a")
    user_b, headers_b = await register_and_login(client, "dono_b")
    body = {"token": "ExponentPushToken[abc]", "platform": "android"}

    assert (await client.put(f"{API}/notifications/push-token", json=body, headers=headers_a)).status_code == 204
    assert (await client.put(f"{API}/notifications/push-token", json=body, headers=headers_b)).status_code == 204

    rows = (await db_session.execute(select(PushToken))).scalars().all()
    assert [(str(row.user_id), row.token) for row in rows] == [(user_b, body["token"])]

    resp = await client.request(
        "DELETE", f"{API}/notifications/push-token", json={"token": body["token"]}, headers=headers_b
    )
    assert resp.status_code == 204
    assert (await db_session.execute(select(PushToken))).scalars().all() == []


async def test_push_failure_does_not_break_action(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
) -> None:
    expert_id, expert_headers, _, fan_headers = await _expert_and_fan(client, db_session)
    await client.put(
        f"{API}/notifications/push-token",
        json={"token": "ExponentPushToken[x]", "platform": "ios"},
        headers=expert_headers,
    )

    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    monkeypatch.setattr(settings, "push_enabled", True)
    monkeypatch.setattr(
        "app.api.dependencies.PushSender",
        lambda: PushSender(transport=httpx.MockTransport(refuse)),
    )

    resp = await client.post(f"{API}/users/{expert_id}/follow", headers=fan_headers)
    assert resp.status_code == 200, resp.text
    items = (await client.get(f"{API}/notifications", headers=expert_headers)).json()
    assert len(items) == 1
