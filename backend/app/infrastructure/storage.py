"""Armazenamento de imagens de perfil (foto e fundo) em disco.

Os arquivos são gravados exatamente como enviados — sem reprocessar —, então
GIFs e WebPs animados continuam animados. A API serve a pasta em /uploads.
"""

import uuid
from pathlib import Path
from typing import Literal

from app.core.config import settings
from app.infrastructure.exceptions import BadRequestError

ImageKind = Literal["avatars", "banners"]

UPLOAD_URL_PREFIX = "/uploads"

# Limites por tipo de imagem (GIFs animados costumam ser grandes)
MAX_BYTES: dict[ImageKind, int] = {
    "avatars": 5 * 1024 * 1024,
    "banners": 10 * 1024 * 1024,
}


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


class ImageStorage:
    def save(self, kind: ImageKind, data: bytes) -> str:
        """Grava a imagem e devolve a URL relativa (ex: /uploads/avatars/<id>.gif)."""
        if len(data) > MAX_BYTES[kind]:
            limit_mb = MAX_BYTES[kind] // (1024 * 1024)
            raise BadRequestError(f"Image is too large (max {limit_mb} MB).")
        ext = detect_image_extension(data)
        if not ext:
            raise BadRequestError("Unsupported image format. Use PNG, JPG, WebP or GIF.")

        folder = upload_root() / kind
        folder.mkdir(parents=True, exist_ok=True)
        name = f"{uuid.uuid4().hex}.{ext}"
        (folder / name).write_bytes(data)
        return f"{UPLOAD_URL_PREFIX}/{kind}/{name}"

    def delete(self, url: str | None) -> None:
        """Apaga um arquivo salvo por save(); ignora URLs externas ou já removidas."""
        if not url or not url.startswith(f"{UPLOAD_URL_PREFIX}/"):
            return
        relative = url[len(UPLOAD_URL_PREFIX) + 1 :]
        path = (upload_root() / relative).resolve()
        # proteção contra "../": só apaga dentro da pasta de uploads
        if upload_root().resolve() in path.parents and path.is_file():
            path.unlink()
