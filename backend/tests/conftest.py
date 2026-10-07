import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.infrastructure.database import Base, get_db_session
from main import app

# Padrão: SQLite em memória (igual ao modo demonstração, sem Docker).
# Para rodar contra Postgres: TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/game_reviews_test
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

# Em memória, cada conexão nova seria um banco vazio: StaticPool reaproveita uma só.
_sqlite_opts = (
    {"poolclass": StaticPool, "connect_args": {"check_same_thread": False}}
    if TEST_DATABASE_URL.startswith("sqlite")
    else {}
)
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, **_sqlite_opts)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
