"""Estatísticas do painel do administrador."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import (
    API,
    create_game,
    make_admin,
    make_expert,
    make_moderator,
    register_and_login,
)

STATS = f"{API}/admin/stats"


async def test_stats_counts_and_activity(client: AsyncClient, db_session: AsyncSession):
    admin_id, admin_headers = await register_and_login(client)
    await make_admin(db_session, admin_id)

    expert_id, _ = await register_and_login(client)
    await make_expert(db_session, expert_id)
    moderator_id, _ = await register_and_login(client)
    await make_moderator(db_session, moderator_id)
    banned_id, _ = await register_and_login(client)
    muted_id, _ = await register_and_login(client)
    for action, target in (("ban", banned_id), ("mute", muted_id)):
        resp = await client.post(
            f"{API}/moderation/users/{target}/{action}", headers=admin_headers
        )
        assert resp.status_code == 200, resp.text

    game_id = await create_game(client, admin_headers, "Zelda")
    author_id, author_headers = await register_and_login(client, "autor")
    resp = await client.post(
        f"{API}/reviews",
        json={"game_id": game_id, "rating": 3, "body": "Chato"},
        headers=author_headers,
    )
    assert resp.status_code == 201, resp.text
    review_id = resp.json()["id"]

    requester_id, requester_headers = await register_and_login(client, "pedinte")
    resp = await client.post(
        f"{API}/expert-requests",
        json={"expertise_area": "dev", "message": "Quero ser especialista"},
        headers=requester_headers,
    )
    assert resp.status_code == 201, resp.text
    request_id = resp.json()["id"]

    _, reporter_headers = await register_and_login(client)
    _, other_reporter_headers = await register_and_login(client)
    for headers in (reporter_headers, other_reporter_headers):
        resp = await client.post(
            f"{API}/reviews/{review_id}/report", json={"reason": "spam"}, headers=headers
        )
        assert resp.status_code == 204, resp.text

    resp = await client.get(STATS, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["users"] == 9
    assert body["experts"] == 1
    assert body["moderators"] == 1
    assert body["banned"] == 1
    assert body["muted"] == 1
    assert body["games"] == 1
    assert body["reviews"] == 1
    assert body["pending_expert_requests"] == 1
    assert body["pending_reports"] == 1

    activity = body["recent_activity"]
    assert len(activity) == 2
    by_kind = {item["kind"]: item for item in activity}
    assert by_kind["report"]["title"] == "Denúncia: comentário de autor em Zelda"
    assert by_kind["report"]["route"] == "/admin/moderacao"
    assert by_kind["expert_request"]["title"] == "Pedido de especialista de @pedinte"
    assert by_kind["expert_request"]["route"] == f"/admin/pedido/{request_id}"
    assert activity[0]["created_at"] >= activity[1]["created_at"]


async def test_stats_admin_only(client: AsyncClient, db_session: AsyncSession):
    moderator_id, headers = await register_and_login(client)
    await make_moderator(db_session, moderator_id)
    resp = await client.get(STATS, headers=headers)
    assert resp.status_code == 403
