"""Perfil do usuário logado: /api/v1/users/me (dados, senha, exclusão, foto e fundo)."""

from pathlib import Path

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.helpers import API, PASSWORD, create_game, make_admin, register_and_login

# Imagens mínimas válidas (cabeçalhos reais de cada formato)
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
GIF = b"GIF89a" + b"\x01\x00\x01\x00\x80\x00\x00" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64


async def test_get_and_update_me(client: AsyncClient) -> None:
    _, headers = await register_and_login(client, "perfil_a")

    resp = await client.get(f"{API}/users/me", headers=headers)
    assert resp.status_code == 200
    me = resp.json()
    assert me["username"] == "perfil_a"
    assert me["display_name"] is None and me["avatar_url"] is None
    assert me["notify_friend_requests"] is True and me["private_profile"] is False

    resp = await client.patch(
        f"{API}/users/me",
        json={
            "display_name": "  Perfil A  ",
            "bio": "Gosto de RPG",
            "username": "perfil_a2",
            "notify_comments": False,
            "private_profile": True,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    me = resp.json()
    assert me["display_name"] == "Perfil A"  # espaços removidos
    assert me["username"] == "perfil_a2"
    assert me["notify_comments"] is False and me["private_profile"] is True

    # texto vazio apaga nome de exibição/bio; username vazio é ignorado (campo obrigatório)
    resp = await client.patch(
        f"{API}/users/me", json={"display_name": "", "bio": " ", "username": ""}, headers=headers
    )
    me = resp.json()
    assert me["display_name"] is None and me["bio"] is None
    assert me["username"] == "perfil_a2"

    # perfil público não expõe as preferências de notificação
    resp = await client.get(f"{API}/users/{me['id']}")
    assert "notify_comments" not in resp.json()
    assert resp.json()["private_profile"] is True


async def test_update_conflicts(client: AsyncClient) -> None:
    await register_and_login(client, "ocupado")
    _, headers = await register_and_login(client, "livre")

    resp = await client.patch(f"{API}/users/me", json={"username": "ocupado"}, headers=headers)
    assert resp.status_code == 409
    resp = await client.patch(
        f"{API}/users/me", json={"email": "ocupado@example.com"}, headers=headers
    )
    assert resp.status_code == 409

    resp = await client.patch(f"{API}/users/me", json={"bio": "x" * 161}, headers=headers)
    assert resp.status_code == 422


async def test_change_password(client: AsyncClient) -> None:
    _, headers = await register_and_login(client, "senha_user")
    url = f"{API}/users/me/password"

    resp = await client.post(
        url, json={"current_password": "errada123", "new_password": "NovaSenha123"}, headers=headers
    )
    assert resp.status_code == 400
    resp = await client.post(
        url, json={"current_password": PASSWORD, "new_password": PASSWORD}, headers=headers
    )
    assert resp.status_code == 400  # igual à atual
    resp = await client.post(
        url, json={"current_password": PASSWORD, "new_password": "curta"}, headers=headers
    )
    assert resp.status_code == 422

    resp = await client.post(
        url, json={"current_password": PASSWORD, "new_password": "NovaSenha123"}, headers=headers
    )
    assert resp.status_code == 204

    login = {"username": "senha_user@example.com"}
    old = await client.post(f"{API}/auth/token", data={**login, "password": PASSWORD})
    assert old.status_code == 401
    new = await client.post(f"{API}/auth/token", data={**login, "password": "NovaSenha123"})
    assert new.status_code == 200


async def test_avatar_and_banner_upload(client: AsyncClient, upload_dir: Path) -> None:
    _, headers = await register_and_login(client, "fotos")

    # GIF vai como está (continua animado) e ganha extensão pelo conteúdo, não pelo nome
    resp = await client.put(
        f"{API}/users/me/avatar",
        files={"file": ("qualquer.png", GIF, "image/png")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    avatar = resp.json()["avatar_url"]
    assert avatar.startswith("/uploads/avatars/") and avatar.endswith(".gif")
    saved = upload_dir / "avatars" / avatar.rsplit("/", 1)[1]
    assert saved.read_bytes() == GIF

    resp = await client.put(
        f"{API}/users/me/banner",
        files={"file": ("fundo.webp", WEBP, "image/webp")},
        headers=headers,
    )
    assert resp.json()["banner_url"].endswith(".webp")

    # trocar a foto apaga o arquivo antigo
    resp = await client.put(
        f"{API}/users/me/avatar", files={"file": ("f.png", PNG, "image/png")}, headers=headers
    )
    assert resp.json()["avatar_url"].endswith(".png")
    assert not saved.exists()

    resp = await client.delete(f"{API}/users/me/avatar", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["avatar_url"] is None
    assert list((upload_dir / "avatars").iterdir()) == []


async def test_upload_rejects_bad_files(client: AsyncClient) -> None:
    _, headers = await register_and_login(client, "uploads_ruins")

    resp = await client.put(
        f"{API}/users/me/avatar",
        files={"file": ("virus.gif", b"MZ\x90\x00 nao sou imagem", "image/gif")},
        headers=headers,
    )
    assert resp.status_code == 400

    big = GIF + b"\x00" * (5 * 1024 * 1024)
    resp = await client.put(
        f"{API}/users/me/avatar", files={"file": ("grande.gif", big, "image/gif")}, headers=headers
    )
    assert resp.status_code == 400  # avatar até 5 MB...
    resp = await client.put(
        f"{API}/users/me/banner", files={"file": ("grande.gif", big, "image/gif")}, headers=headers
    )
    assert resp.status_code == 200  # ...fundo até 10 MB

    resp = await client.put(f"{API}/users/me/avatar", files={"file": ("a.png", PNG, "image/png")})
    assert resp.status_code == 401


async def test_delete_own_account(
    client: AsyncClient, db_session: AsyncSession, upload_dir: Path
) -> None:
    admin_id, admin_headers = await register_and_login(client, "admin_del")
    await make_admin(db_session, admin_id)
    game_id = await create_game(client, admin_headers)

    _, headers = await register_and_login(client, "vai_sair")
    _, friend_headers = await register_and_login(client, "amigo_fica")

    # dados ligados à conta: review, lista, amizade e foto
    await client.post(f"{API}/reviews", json={"game_id": game_id, "rating": 8}, headers=headers)
    await client.put(f"{API}/library/{game_id}", json={"status": "playing"}, headers=headers)
    await client.post(f"{API}/friends/requests", json={"username": "amigo_fica"}, headers=headers)
    req = (await client.get(f"{API}/friends/requests", headers=friend_headers)).json()[0]
    await client.post(f"{API}/friends/requests/{req['id']}/accept", headers=friend_headers)
    await client.put(
        f"{API}/users/me/avatar", files={"file": ("a.gif", GIF, "image/gif")}, headers=headers
    )

    resp = await client.request(
        "DELETE", f"{API}/users/me", json={"password": "errada123"}, headers=headers
    )
    assert resp.status_code == 400
    resp = await client.request(
        "DELETE", f"{API}/users/me", json={"password": PASSWORD}, headers=headers
    )
    assert resp.status_code == 204

    # tudo some junto: login, review, amizade (lado do amigo) e o arquivo da foto
    resp = await client.post(
        f"{API}/auth/token", data={"username": "vai_sair@example.com", "password": PASSWORD}
    )
    assert resp.status_code == 401
    resp = await client.get(f"{API}/reviews/game/{game_id}")
    assert resp.json() == []
    resp = await client.get(f"{API}/friends", headers=friend_headers)
    assert resp.json() == []
    assert list((upload_dir / "avatars").iterdir()) == []
