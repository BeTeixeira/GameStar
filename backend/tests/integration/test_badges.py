"""Loja de badges: resgate gratuito (fase de testes) e badges equipadas no perfil."""

from httpx import AsyncClient

from tests.integration.helpers import API, register_and_login

FIRST = "01_conta_1mes"
SECOND = "16_fundador"
THIRD = "43_genero_rpg"
OWNED_SIX = [
    "01_conta_1mes",
    "02_conta_3meses",
    "15_beta_tester",
    "16_fundador",
    "30_primeira_avaliacao",
    "31_primeiro_amigo",
]


async def _redeem(client: AsyncClient, headers: dict[str, str], badge_id: str) -> None:
    resp = await client.post(f"{API}/badges/{badge_id}/redeem", headers=headers)
    assert resp.status_code == 201, resp.text


async def test_new_account_has_no_badges_and_six_empty_slots(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)

    resp = await client.get(f"{API}/badges/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json() == {"owned": [], "equipped": [None] * 6, "max_equipped": 6}


async def test_redeem_adds_badge_to_collection(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)

    resp = await client.post(f"{API}/badges/{FIRST}/redeem", headers=headers)

    assert resp.status_code == 201, resp.text
    assert resp.json()["badge_id"] == FIRST
    collection = (await client.get(f"{API}/badges/me", headers=headers)).json()
    assert [b["badge_id"] for b in collection["owned"]] == [FIRST]


async def test_redeeming_twice_conflicts(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    await _redeem(client, headers, FIRST)

    resp = await client.post(f"{API}/badges/{FIRST}/redeem", headers=headers)

    assert resp.status_code == 409


async def test_redeeming_unknown_badge_returns_404(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)

    resp = await client.post(f"{API}/badges/nao_existe/redeem", headers=headers)

    assert resp.status_code == 404


async def test_badges_require_login(client: AsyncClient) -> None:
    assert (await client.get(f"{API}/badges/me")).status_code == 401
    assert (await client.post(f"{API}/badges/{FIRST}/redeem")).status_code == 401


async def test_equip_keeps_slot_positions(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    for badge_id in (FIRST, SECOND, THIRD):
        await _redeem(client, headers, badge_id)

    resp = await client.put(
        f"{API}/badges/me/equipped",
        json={"slots": [SECOND, None, FIRST]},
        headers=headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["equipped"] == [SECOND, None, FIRST, None, None, None]
    again = (await client.get(f"{API}/badges/me", headers=headers)).json()
    assert again["equipped"] == [SECOND, None, FIRST, None, None, None]


async def test_equip_replaces_previous_selection(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    for badge_id in (FIRST, SECOND):
        await _redeem(client, headers, badge_id)
    await client.put(f"{API}/badges/me/equipped", json={"slots": [FIRST, SECOND]}, headers=headers)

    resp = await client.put(f"{API}/badges/me/equipped", json={"slots": [SECOND]}, headers=headers)

    assert resp.json()["equipped"] == [SECOND, None, None, None, None, None]


async def test_equip_accepts_six_badges(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    for badge_id in OWNED_SIX:
        await _redeem(client, headers, badge_id)

    resp = await client.put(f"{API}/badges/me/equipped", json={"slots": OWNED_SIX}, headers=headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["equipped"] == OWNED_SIX


async def test_equip_rejects_more_than_six_slots(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    for badge_id in OWNED_SIX:
        await _redeem(client, headers, badge_id)

    resp = await client.put(
        f"{API}/badges/me/equipped", json={"slots": OWNED_SIX + [None]}, headers=headers
    )

    assert resp.status_code == 422


async def test_equip_rejects_badge_not_redeemed(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    await _redeem(client, headers, FIRST)

    resp = await client.put(
        f"{API}/badges/me/equipped", json={"slots": [FIRST, SECOND]}, headers=headers
    )

    assert resp.status_code == 400
    current = (await client.get(f"{API}/badges/me", headers=headers)).json()
    assert current["equipped"] == [None] * 6


async def test_equip_rejects_same_badge_twice(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    await _redeem(client, headers, FIRST)

    resp = await client.put(
        f"{API}/badges/me/equipped", json={"slots": [FIRST, FIRST]}, headers=headers
    )

    assert resp.status_code == 400


async def test_collections_are_per_user(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)
    _, other_headers = await register_and_login(client)
    await _redeem(client, headers, FIRST)

    other = (await client.get(f"{API}/badges/me", headers=other_headers)).json()

    assert other["owned"] == []


async def test_other_users_see_equipped_badges(client: AsyncClient) -> None:
    owner_id, headers = await register_and_login(client)
    _, viewer_headers = await register_and_login(client)
    await _redeem(client, headers, FIRST)
    await client.put(f"{API}/badges/me/equipped", json={"slots": [None, FIRST]}, headers=headers)

    resp = await client.get(f"{API}/badges/users/{owner_id}", headers=viewer_headers)

    assert resp.status_code == 200
    assert resp.json() == {"equipped": [None, FIRST, None, None, None, None]}


async def test_equipped_badges_of_unknown_user_returns_404(client: AsyncClient) -> None:
    _, headers = await register_and_login(client)

    resp = await client.get(
        f"{API}/badges/users/00000000-0000-0000-0000-000000000000", headers=headers
    )

    assert resp.status_code == 404
