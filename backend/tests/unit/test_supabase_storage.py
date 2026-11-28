import json

import httpx
import pytest

from app.infrastructure.exceptions import BadRequestError
from app.infrastructure.storage import SupabaseImageStorage

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
BASE = "https://proj.supabase.co"


def make_storage(handler) -> tuple[SupabaseImageStorage, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    storage = SupabaseImageStorage(
        url=BASE, service_key="secret-key", bucket="profile-images", transport=httpx.MockTransport(record)
    )
    return storage, seen


async def test_save_uploads_and_returns_public_url() -> None:
    storage, seen = make_storage(lambda r: httpx.Response(200, json={"Key": "x"}))

    url = await storage.save("avatars", PNG)

    assert url.startswith(f"{BASE}/storage/v1/object/public/profile-images/avatars/")
    assert url.endswith(".png")
    upload = seen[0]
    assert upload.method == "POST"
    assert upload.url.path.startswith("/storage/v1/object/profile-images/avatars/")
    assert upload.headers["apikey"] == "secret-key"
    assert upload.headers["authorization"] == "Bearer secret-key"
    assert upload.headers["content-type"] == "image/png"
    assert upload.content == PNG


async def test_save_rejects_invalid_images_without_calling_supabase() -> None:
    storage, seen = make_storage(lambda r: httpx.Response(200))

    with pytest.raises(BadRequestError):
        await storage.save("avatars", b"not an image")
    with pytest.raises(BadRequestError):
        await storage.save("avatars", PNG + b"0" * (6 * 1024 * 1024))
    assert seen == []


async def test_save_raises_when_supabase_fails() -> None:
    storage, _ = make_storage(lambda r: httpx.Response(500, text="boom"))

    with pytest.raises(RuntimeError, match="Supabase"):
        await storage.save("avatars", PNG)


async def test_delete_removes_own_files_only() -> None:
    storage, seen = make_storage(lambda r: httpx.Response(200, json=[]))

    await storage.delete(f"{BASE}/storage/v1/object/public/profile-images/avatars/abc.png")
    await storage.delete("https://elsewhere.example.com/avatars/abc.png")
    await storage.delete("/uploads/avatars/old-local.png")
    await storage.delete(None)

    assert len(seen) == 1
    assert seen[0].method == "DELETE"
    assert seen[0].url.path == "/storage/v1/object/profile-images"
    assert json.loads(seen[0].content) == {"prefixes": ["avatars/abc.png"]}


async def test_delete_never_raises() -> None:
    storage, _ = make_storage(lambda r: httpx.Response(500))

    await storage.delete(f"{BASE}/storage/v1/object/public/profile-images/avatars/abc.png")
