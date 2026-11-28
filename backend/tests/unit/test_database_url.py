import pytest

from app.core.config import normalize_database_url


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("postgresql://u:p@host:5432/db", "postgresql+asyncpg://u:p@host:5432/db"),
        ("postgres://u:p@host:5432/db", "postgresql+asyncpg://u:p@host:5432/db"),
        ("postgresql+asyncpg://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        ("sqlite+aiosqlite:///./gamestar.db", "sqlite+aiosqlite:///./gamestar.db"),
    ],
)
def test_supabase_style_urls_use_the_async_driver(raw: str, expected: str) -> None:
    assert normalize_database_url(raw) == expected
