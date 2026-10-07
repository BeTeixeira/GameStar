"""Helpers para testes de integração: criar usuários autenticados, admin e jogos.

Use junto com os fixtures `client` e `db_session` do tests/conftest.py.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.user import User, UserRole

API = "/api/v1"
PASSWORD = "Senha12345"

async def register_and_login(
    client: AsyncClient, username: str | None = None
) -> tuple[str, dict[str, str]]:
    """Cria um usuário e devolve (id, headers com o token)."""
    username = username or f"user_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"
    resp = await client.post(
        f"{API}/users", json={"username": username, "email": email, "password": PASSWORD}
    )
    assert resp.status_code == 201, resp.text
    user_id = resp.json()["id"]

    resp = await client.post(f"{API}/auth/token", data={"username": email, "password": PASSWORD})
    assert resp.status_code == 200, resp.text
    return user_id, {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def make_admin(db_session: AsyncSession, user_id: str) -> None:
    user = await db_session.get(User, uuid.UUID(user_id))
    user.role = UserRole.admin
    await db_session.flush()


async def create_game(
    client: AsyncClient, admin_headers: dict[str, str], title: str = "Jogo de Teste"
) -> str:
    resp = await client.post(
        f"{API}/games", json={"title": title, "genre": "RPG"}, headers=admin_headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]

