from httpx import AsyncClient


async def test_health_is_ok(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_deep_health_touches_the_database(client: AsyncClient) -> None:
    # Usado pelo ping externo: mantém o servidor (Render) e o banco (Supabase) acordados
    resp = await client.get("/health/db")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "ok"}
