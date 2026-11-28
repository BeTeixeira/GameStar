"""Armazenamento de imagens de perfil (foto e fundo).

Os arquivos são gravados exatamente como enviados — sem reprocessar —, então
GIFs e WebPs animados continuam animados. Dois destinos:

- ImageStorage: disco local, servido pela API em /uploads (desenvolvimento e testes).
- SupabaseImageStorage: bucket público do Supabase Storage (produção no Render,
  cujo disco é apagado a cada deploy). Liga quando SUPABASE_URL e
  SUPABASE_SERVICE_KEY estão definidos (veja default_image_storage()).
"""

import logging
import uuid
from pathlib import Path
from typing import Literal

import httpx

from app.core.config import settings
from app.infrastructure.exceptions import BadRequestError

logger = logging.getLogger(__name__)

ImageKind = Literal["avatars", "banners"]

UPLOAD_URL_PREFIX = "/uploads"

# Limites por tipo de imagem (GIFs animados costumam ser grandes)
MAX_BYTES: dict[ImageKind, int] = {
    "avatars": 5 * 1024 * 1024,
    "banners": 10 * 1024 * 1024,
}

CONTENT_TYPES = {"png": "image/png", "jpg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}


def upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def detect_image_extension(data: bytes) -> str | None:
    """Identifica o formato pelos primeiros bytes (não confia na extensão do nome)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def validate_image(kind: ImageKind, data: bytes) -> str:
    """Confere tamanho e formato; devolve a extensão."""
    if len(data) > MAX_BYTES[kind]:
        limit_mb = MAX_BYTES[kind] // (1024 * 1024)
        raise BadRequestError(f"Image is too large (max {limit_mb} MB).")
    ext = detect_image_extension(data)
    if not ext:
        raise BadRequestError("Unsupported image format. Use PNG, JPG, WebP or GIF.")
    return ext


class ImageStorage:
    async def save(self, kind: ImageKind, data: bytes) -> str:
        """Grava a imagem e devolve a URL relativa (ex: /uploads/avatars/<id>.gif)."""
        ext = validate_image(kind, data)
        folder = upload_root() / kind
        folder.mkdir(parents=True, exist_ok=True)
        name = f"{uuid.uuid4().hex}.{ext}"
        (folder / name).write_bytes(data)
        return f"{UPLOAD_URL_PREFIX}/{kind}/{name}"

    async def delete(self, url: str | None) -> None:
        """Apaga um arquivo salvo por save(); ignora URLs externas ou já removidas."""
        if not url or not url.startswith(f"{UPLOAD_URL_PREFIX}/"):
            return
        relative = url[len(UPLOAD_URL_PREFIX) + 1 :]
        path = (upload_root() / relative).resolve()
        # proteção contra "../": só apaga dentro da pasta de uploads
        if upload_root().resolve() in path.parents and path.is_file():
            path.unlink()


class SupabaseImageStorage(ImageStorage):
    """Bucket público do Supabase Storage (API REST, com a chave secreta do projeto)."""

    def __init__(
        self, url: str, service_key: str, bucket: str, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._base = url.rstrip("/")
        self._bucket = bucket
        self._headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
        self._transport = transport
        self._public_prefix = f"{self._base}/storage/v1/object/public/{bucket}/"

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(headers=self._headers, timeout=30, transport=self._transport)

    async def save(self, kind: ImageKind, data: bytes) -> str:
        ext = validate_image(kind, data)
        path = f"{kind}/{uuid.uuid4().hex}.{ext}"
        async with self._client() as client:
            resp = await client.post(
                f"{self._base}/storage/v1/object/{self._bucket}/{path}",
                content=data,
                headers={"Content-Type": CONTENT_TYPES[ext], "Cache-Control": "max-age=31536000"},
            )
        if resp.status_code >= 400:
            logger.error("Supabase upload failed: status=%s body=%s", resp.status_code, resp.text[:300])
            raise RuntimeError(f"Supabase Storage upload failed ({resp.status_code}).")
        return self._public_prefix + path

    async def delete(self, url: str | None) -> None:
        if not url or not url.startswith(self._public_prefix):
            return
        path = url[len(self._public_prefix) :]
        try:
            async with self._client() as client:
                resp = await client.request(
                    "DELETE", f"{self._base}/storage/v1/object/{self._bucket}", json={"prefixes": [path]}
                )
            if resp.status_code >= 400:
                logger.warning("Supabase delete failed: status=%s path=%s", resp.status_code, path)
        except httpx.HTTPError:
            # melhor esforço: um arquivo órfão não pode impedir a troca de foto
            logger.warning("Supabase delete failed (network): path=%s", path)


def default_image_storage() -> ImageStorage:
    if settings.supabase_url and settings.supabase_service_key:
        return SupabaseImageStorage(settings.supabase_url, settings.supabase_service_key, settings.supabase_bucket)
    return ImageStorage()
