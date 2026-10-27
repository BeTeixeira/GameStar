"""Denúncias de comentários, log de moderação e ações de moderação sobre usuários."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import (
    API,
    PASSWORD,
    create_game,
    make_admin,
    make_moderator,
    register_and_login,
)

MOD = f"{API}/moderation"
MISSING_ID = "00000000-0000-0000-0000-000000000000"


async def _admin(client: AsyncClient, db_session: AsyncSession) -> tuple[str, dict[str, str]]:
    admin_id, headers = await register_and_login(client)
    await make_admin(db_session, admin_id)
    return admin_id, headers


async def _moderator(client: AsyncClient, db_session: AsyncSession) -> tuple[str, dict[str, str]]:
    mod_id, headers = await register_and_login(client)
    await make_moderator(db_session, mod_id)
    return mod_id, headers


async def _review(
    client: AsyncClient, headers: dict[str, str], game_id: str, body: str = "Chato"
) -> str:
    resp = await client.post(
        f"{API}/reviews", json={"game_id": game_id, "rating": 3, "body": body}, headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _report(client: AsyncClient, headers: dict[str, str], review_id: str, reason="spam"):
    return await client.post(
        f"{API}/reviews/{review_id}/report", json={"reason": reason}, headers=headers
    )


async def _scenario(client: AsyncClient, db_session: AsyncSession):
    """Devolve (admin_headers, game_id, author_id, author_headers, reporter_id,
    reporter_headers, review_id)."""
    _, admin_headers = await _admin(client, db_session)
    game_id = await create_game(client, admin_headers)
    author_id, author_headers = await register_and_login(client)
    reporter_id, reporter_headers = await register_and_login(client)
    review_id = await _review(client, author_headers, game_id)
    return (
        admin_headers,
        game_id,
        author_id,
        author_headers,
        reporter_id,
        reporter_headers,
        review_id,
    )


async def test_cannot_report_own_review(client, db_session):
    _, _, _, author_headers, _, _, review_id = await _scenario(client, db_session)
    resp = await _report(client, author_headers, review_id)
    assert resp.status_code == 400


async def test_report_missing_review_is_404(client, db_session):
    _, _, _, _, _, reporter_headers, _ = await _scenario(client, db_session)
    resp = await _report(client, reporter_headers, MISSING_ID)
    assert resp.status_code == 404


async def test_duplicate_report_counts_once(client, db_session):
    admin_headers, _, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    assert (await _report(client, reporter_headers, review_id)).status_code == 204
    assert (await _report(client, reporter_headers, review_id)).status_code == 204

    groups = (await client.get(f"{MOD}/reports", headers=admin_headers)).json()
    assert len(groups) == 1
    assert groups[0]["reporters_count"] == 1
    assert groups[0]["reasons"] == ["spam"]
    assert groups[0]["review_exists"] is True


async def test_muted_user_cannot_report(client, db_session):
    admin_headers, _, _, _, reporter_id, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    resp = await client.post(f"{MOD}/users/{reporter_id}/mute", headers=admin_headers)
    assert resp.status_code == 200
    resp = await _report(client, reporter_headers, review_id)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Your account is muted."


async def test_my_reports_lists_reported_ids(client, db_session):
    _, game_id, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    _, other_headers = await register_and_login(client)
    await _review(client, other_headers, game_id)
    await _report(client, reporter_headers, review_id)

    resp = await client.get(f"{API}/reviews/game/{game_id}/my-reports", headers=reporter_headers)
    assert resp.status_code == 200
    assert resp.json() == [review_id]


async def test_reports_visible_only_to_moderators_and_admin(client, db_session):
    _, _, _, _, _, reporter_headers, _ = await _scenario(client, db_session)
    assert (await client.get(f"{MOD}/reports", headers=reporter_headers)).status_code == 403
    resp = await client.get(f"{MOD}/reports/pending-count", headers=reporter_headers)
    assert resp.status_code == 403
    _, mod_headers = await _moderator(client, db_session)
    assert (await client.get(f"{MOD}/reports", headers=mod_headers)).status_code == 200


async def test_pending_count(client, db_session):
    admin_headers, _, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    await _report(client, reporter_headers, review_id)
    resp = await client.get(f"{MOD}/reports/pending-count", headers=admin_headers)
    assert resp.json() == {"count": 1}


async def test_keep_resolves_pending_reports(client, db_session):
    admin_headers, _, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    await _report(client, reporter_headers, review_id)

    resp = await client.post(f"{MOD}/reviews/{review_id}/keep", headers=admin_headers)
    assert resp.status_code == 204

    assert (await client.get(f"{MOD}/reports", headers=admin_headers)).json() == []
    kept = (await client.get(f"{MOD}/reports?status=kept", headers=admin_headers)).json()
    assert [g["review_id"] for g in kept] == [review_id]
    assert kept[0]["status"] == "kept"
    count = await client.get(f"{MOD}/reports/pending-count", headers=admin_headers)
    assert count.json() == {"count": 0}


async def test_remove_review_marks_removed_and_notifies_author(client, db_session):
    admin_headers, _, _, author_headers, _, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    await _report(client, reporter_headers, review_id)

    resp = await client.delete(f"{MOD}/reviews/{review_id}", headers=admin_headers)
    assert resp.status_code == 204

    assert (await client.get(f"{API}/reviews/{review_id}")).status_code == 404
    removed = (await client.get(f"{MOD}/reports?status=removed", headers=admin_headers)).json()
    assert [g["review_id"] for g in removed] == [review_id]
    assert removed[0]["review_exists"] is False
    items = (await client.get(f"{API}/notifications", headers=author_headers)).json()
    assert [i["type"] for i in items] == ["review_removed"]


async def test_old_review_delete_by_moderator_resolves_reports_and_notifies_once(
    client, db_session
):
    admin_headers, _, _, author_headers, _, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    await _report(client, reporter_headers, review_id)

    resp = await client.delete(f"{API}/reviews/{review_id}", headers=admin_headers)
    assert resp.status_code == 204

    removed = (await client.get(f"{MOD}/reports?status=removed", headers=admin_headers)).json()
    assert len(removed) == 1
    items = (await client.get(f"{API}/notifications", headers=author_headers)).json()
    assert len(items) == 1


async def test_log_survives_author_deleting_review(client, db_session):
    admin_headers, _, _, author_headers, _, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    await _report(client, reporter_headers, review_id)

    resp = await client.delete(f"{API}/reviews/{review_id}", headers=author_headers)
    assert resp.status_code == 204

    groups = (await client.get(f"{MOD}/reports", headers=admin_headers)).json()
    assert len(groups) == 1
    assert groups[0]["status"] == "pending"
    assert groups[0]["review_exists"] is False
    assert groups[0]["current_body"] is None
    assert groups[0]["review_body"] == "Chato"


async def test_log_survives_author_account_deletion(client, db_session):
    admin_headers, _, _, author_headers, _, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    await _report(client, reporter_headers, review_id)
    username = (await client.get(f"{API}/users/me", headers=author_headers)).json()["username"]

    resp = await client.request(
        "DELETE", f"{API}/users/me", json={"password": PASSWORD}, headers=author_headers
    )
    assert resp.status_code == 204

    groups = (await client.get(f"{MOD}/reports", headers=admin_headers)).json()
    assert len(groups) == 1
    assert groups[0]["author_id"] is None
    assert groups[0]["author_name"] == username
    assert groups[0]["review_exists"] is False
    assert groups[0]["author_is_active"] is None


async def test_moderator_cannot_remove_review_of_admin(client, db_session):
    admin_headers, game_id, *_ = await _scenario(client, db_session)
    admin_review = await _review(client, admin_headers, game_id, "do admin")
    _, mod_headers = await _moderator(client, db_session)
    resp = await client.delete(f"{MOD}/reviews/{admin_review}", headers=mod_headers)
    assert resp.status_code == 403


async def test_ban_and_unban_by_admin(client, db_session):
    admin_headers, _, author_id, author_headers, *_ = await _scenario(client, db_session)
    resp = await client.post(f"{MOD}/users/{author_id}/ban", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    assert resp.json()["deactivated_by_role"] == "admin"
    assert (await client.get(f"{API}/users/me", headers=author_headers)).status_code == 401

    resp = await client.post(f"{MOD}/users/{author_id}/unban", headers=admin_headers)
    assert resp.json()["is_active"] is True
    assert resp.json()["deactivated_by_role"] is None


async def test_moderator_cannot_unban_admin_deactivation(client, db_session):
    admin_headers, _, author_id, *_ = await _scenario(client, db_session)
    _, mod_headers = await _moderator(client, db_session)
    await client.post(f"{MOD}/users/{author_id}/ban", headers=admin_headers)

    resp = await client.post(f"{MOD}/users/{author_id}/unban", headers=mod_headers)
    assert resp.status_code == 403


async def test_moderator_can_unban_own_ban(client, db_session):
    _, _, author_id, *_ = await _scenario(client, db_session)
    _, mod_headers = await _moderator(client, db_session)
    resp = await client.post(f"{MOD}/users/{author_id}/ban", headers=mod_headers)
    assert resp.json()["deactivated_by_role"] == "moderator"
    resp = await client.post(f"{MOD}/users/{author_id}/unban", headers=mod_headers)
    assert resp.status_code == 200


async def test_admin_can_unban_moderator_ban(client, db_session):
    admin_headers, _, author_id, *_ = await _scenario(client, db_session)
    _, mod_headers = await _moderator(client, db_session)
    await client.post(f"{MOD}/users/{author_id}/ban", headers=mod_headers)

    resp = await client.post(f"{MOD}/users/{author_id}/unban", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


async def test_moderator_cannot_act_on_moderator_or_admin(client, db_session):
    admin_id, _ = await _admin(client, db_session)
    other_mod_id, _ = await _moderator(client, db_session)
    _, mod_headers = await _moderator(client, db_session)
    for target in (admin_id, other_mod_id):
        for action in ("ban", "unban", "mute", "unmute"):
            resp = await client.post(f"{MOD}/users/{target}/{action}", headers=mod_headers)
            assert resp.status_code == 403, (target, action)


async def test_cannot_act_on_self_or_other_admin(client, db_session):
    admin_id, admin_headers = await _admin(client, db_session)
    other_admin_id, _ = await _admin(client, db_session)
    for target in (admin_id, other_admin_id):
        resp = await client.post(f"{MOD}/users/{target}/ban", headers=admin_headers)
        assert resp.status_code == 403


async def test_action_on_missing_user_is_404(client, db_session):
    _, admin_headers = await _admin(client, db_session)
    for action in ("ban", "unban", "mute", "unmute"):
        resp = await client.post(f"{MOD}/users/{MISSING_ID}/{action}", headers=admin_headers)
        assert resp.status_code == 404, action


async def test_mute_notifies_user(client, db_session):
    _, mod_headers = await _moderator(client, db_session)
    user_id, user_headers = await register_and_login(client)

    resp = await client.post(f"{MOD}/users/{user_id}/mute", headers=mod_headers)
    assert resp.status_code == 200
    assert resp.json()["is_muted"] is True
    items = (await client.get(f"{API}/notifications", headers=user_headers)).json()
    assert items[0]["type"] == "muted"
    assert items[0]["title"] == "Conta silenciada"
    assert items[0]["data"] == {"route": "/avisos"}

    resp = await client.post(f"{MOD}/users/{user_id}/unmute", headers=mod_headers)
    assert resp.json()["is_muted"] is False
    items = (await client.get(f"{API}/notifications", headers=user_headers)).json()
    assert items[0]["type"] == "unmuted"
    assert items[0]["title"] == "Silêncio retirado"


async def test_recent_reviews_for_moderators(client, db_session):
    admin_headers, _, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    resp = await client.get(f"{MOD}/reviews/recent", headers=admin_headers)
    assert [r["id"] for r in resp.json()] == [review_id]
    assert resp.json()[0]["game_title"] == "Jogo de Teste"
    resp = await client.get(f"{MOD}/reviews/recent?q=inexistente", headers=admin_headers)
    assert resp.json() == []
    assert (await client.get(f"{MOD}/reviews/recent", headers=reporter_headers)).status_code == 403


async def test_search_reports_by_query(client, db_session):
    admin_headers, _, _, _, _, reporter_headers, review_id = await _scenario(client, db_session)
    await _report(client, reporter_headers, review_id)
    assert len((await client.get(f"{MOD}/reports?q=chat", headers=admin_headers)).json()) == 1
    assert (await client.get(f"{MOD}/reports?q=zzz", headers=admin_headers)).json() == []


async def test_moderator_cannot_launder_admin_ban(client, db_session):
    admin_headers, _, author_id, *_ = await _scenario(client, db_session)
    _, mod_headers = await _moderator(client, db_session)
    await client.post(f"{MOD}/users/{author_id}/ban", headers=admin_headers)

    resp = await client.post(f"{MOD}/users/{author_id}/ban", headers=mod_headers)
    assert resp.status_code == 200
    resp = await client.post(f"{MOD}/users/{author_id}/unban", headers=mod_headers)
    assert resp.status_code == 403

    user = (await client.get(f"{API}/users/{author_id}", headers=admin_headers)).json()
    assert user["is_active"] is False
    assert user["deactivated_by_role"] == "admin"


async def test_log_survives_deleting_two_reporters(client, db_session):
    admin_headers, game_id, _, _, _, reporter_headers, review_id = await _scenario(
        client, db_session
    )
    _, second_headers = await register_and_login(client)
    await _report(client, reporter_headers, review_id)
    await _report(client, second_headers, review_id, "outro")

    for headers in (reporter_headers, second_headers):
        resp = await client.request(
            "DELETE", f"{API}/users/me", json={"password": PASSWORD}, headers=headers
        )
        assert resp.status_code == 204

    groups = (await client.get(f"{MOD}/reports", headers=admin_headers)).json()
    assert len(groups) == 1
    assert groups[0]["reporters_count"] == 2
