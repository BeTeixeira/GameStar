"""Limite de tentativas no login e no cadastro (evita testar senhas sem parar)."""

import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.rate_limit import login_limiter, register_limiter
from tests.integration.helpers import API, PASSWORD, register_and_login


@pytest.fixture
def rate_limit_on(monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    login_limiter.reset()
    register_limiter.reset()
    yield
    login_limiter.reset()
    register_limiter.reset()


async def _wrong_login(client: AsyncClient, email: str):
    return await client.post(f"{API}/auth/token", data={"username": email, "password": "errada123"})


async def test_login_is_blocked_after_too_many_attempts(client: AsyncClient, rate_limit_on) -> None:
    email = f"alvo_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(login_limiter.max_calls):
        assert (await _wrong_login(client, email)).status_code == 401

    blocked = await _wrong_login(client, email)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    assert "tentativas" in blocked.json()["detail"]


async def test_login_limit_is_per_email(client: AsyncClient, rate_limit_on) -> None:
    email = f"alvo_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(login_limiter.max_calls):
        await _wrong_login(client, email)

    # outra conta na mesma rede (ex.: testers no mesmo wifi) continua entrando
    username = f"outro_{uuid.uuid4().hex[:6]}"
    await client.post(
        f"{API}/users", json={"username": username, "email": f"{username}@example.com", "password": PASSWORD}
    )
    ok = await client.post(
        f"{API}/auth/token", data={"username": f"{username}@example.com", "password": PASSWORD}
    )
    assert ok.status_code == 200


async def test_login_email_is_case_insensitive_for_the_limit(client: AsyncClient, rate_limit_on) -> None:
    email = f"alvo_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(login_limiter.max_calls):
        await _wrong_login(client, email)
    assert (await _wrong_login(client, email.upper())).status_code == 429


async def test_register_is_blocked_after_too_many_accounts(client: AsyncClient, rate_limit_on) -> None:
    for _ in range(register_limiter.max_calls):
        await register_and_login(client)

    username = f"extra_{uuid.uuid4().hex[:6]}"
    blocked = await client.post(
        f"{API}/users", json={"username": username, "email": f"{username}@example.com", "password": PASSWORD}
    )
    assert blocked.status_code == 429


async def test_limits_are_off_when_disabled(client: AsyncClient) -> None:
    email = f"alvo_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(login_limiter.max_calls + 2):
        assert (await _wrong_login(client, email)).status_code == 401
