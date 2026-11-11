"""Cadastra jogos no catálogo buscando os dados automaticamente na loja da Steam.

Uso (com a API ligada):
    python scripts/seed_steam.py
    python scripts/seed_steam.py --base-url http://localhost:8000 --email admin@example.com
    python scripts/seed_steam.py --dry-run          # só mostra o que seria cadastrado

Para cada AppID da lista, consulta a API pública da Steam (appdetails, sem chave)
e preenche título, gênero, desenvolvedora, data de lançamento, descrição em
português e capa. Jogos cujo título já existe no catálogo são ignorados.
"""

import argparse
import html
import re
import sys
import time
from datetime import date, datetime

import httpx

STEAM_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
STEAM_PORTRAIT_URL = "https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"

# (AppID da Steam, título exibido no catálogo ou None para usar o nome da Steam)
STEAM_GAMES: list[tuple[int, str | None]] = [
    (1086940, "Baldur's Gate 3"),
    (620, "Portal 2"),
    (220, "Half-Life 2"),
    (730, "Counter-Strike 2"),
    (570, "Dota 2"),
    (413150, "Stardew Valley"),
    (105600, "Terraria"),
    (489830, "The Elder Scrolls V: Skyrim Special Edition"),
    (377160, "Fallout 4"),
    (582010, "Monster Hunter: World"),
    (2050650, "Resident Evil 4"),
    (1196590, "Resident Evil Village"),
    (504230, "Celeste"),
    (1030300, "Hollow Knight: Silksong"),
    (2358720, "Black Myth: Wukong"),
    (1627720, "Lies of P"),
    (268910, "Cuphead"),
    (1145350, "Hades II"),
    (1850570, "Death Stranding Director's Cut"),
    (1817070, "Marvel's Spider-Man Remastered"),
    (1888930, "The Last of Us Part I"),
    (1151640, "Horizon Zero Dawn"),
    (2215430, "Ghost of Tsushima"),
    (632470, "Disco Elysium"),
    (1328670, "Mass Effect Legendary Edition"),
    (8870, "BioShock Infinite"),
    (782330, "DOOM Eternal"),
    (1172620, "Sea of Thieves"),
    (1551360, "Forza Horizon 5"),
    (945360, "Among Us"),
    (391540, "Undertale"),
    (252950, "Rocket League"),
    (1172470, "Apex Legends"),
    (1426210, "It Takes Two"),
    (289070, "Sid Meier's Civilization VI"),
    (550, "Left 4 Dead 2"),
    (1364780, "Street Fighter 6"),
    (1462040, "Final Fantasy VII Remake Intergrade"),
    (287700, "Metal Gear Solid V: The Phantom Pain"),
    (208650, "Batman: Arkham Knight"),
    (1903340, "Clair Obscur: Expedition 33"),
    (2124490, "Silent Hill 2"),
    (570940, "Dark Souls Remastered"),
    (2622380, "Elden Ring Nightreign"),
]

IGNORED_GENRES = {"indie", "acesso antecipado", "gratuitos para jogar", "free to play"}
ENGLISH_DATE_FORMATS = ("%d %b, %Y", "%b %d, %Y", "%d %B, %Y", "%B %d, %Y", "%Y-%m-%d")


def fetch_details(client: httpx.Client, app_id: int, language: str, country: str) -> dict | None:
    response = client.get(
        STEAM_DETAILS_URL, params={"appids": app_id, "l": language, "cc": country}
    )
    response.raise_for_status()
    payload = response.json().get(str(app_id)) or {}
    return payload.get("data") if payload.get("success") else None


def parse_release_date(raw: str | None) -> date | None:
    if not raw:
        return None
    for date_format in ENGLISH_DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), date_format).date()
        except ValueError:
            continue
    return None


def clean_text(raw: str | None) -> str | None:
    if not raw:
        return None
    without_tags = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", html.unescape(without_tags)).strip() or None


def build_genre(details: dict) -> str | None:
    genres = [genre["description"] for genre in details.get("genres", [])]
    relevant = [genre for genre in genres if genre.lower() not in IGNORED_GENRES]
    chosen = (relevant or genres)[:2]
    return "/".join(chosen)[:100] if chosen else None


def pick_cover(client: httpx.Client, app_id: int, fallback: str | None) -> str | None:
    portrait_url = STEAM_PORTRAIT_URL.format(app_id=app_id)
    try:
        if client.head(portrait_url).status_code == 200:
            return portrait_url
    except httpx.HTTPError:
        pass
    return fallback


def build_game_payload(
    client: httpx.Client, app_id: int, title_override: str | None
) -> dict | None:
    details_pt = fetch_details(client, app_id, "brazilian", "br")
    details_en = fetch_details(client, app_id, "english", "us")
    if not details_pt or not details_en:
        return None
    release = parse_release_date(details_en.get("release_date", {}).get("date"))
    return {
        "title": (title_override or details_en["name"])[:200],
        "genre": build_genre(details_pt),
        "developer": next(iter(details_en.get("developers", [])), None),
        "release_date": release.isoformat() if release else None,
        "description": clean_text(details_pt.get("short_description"))
        or clean_text(details_en.get("short_description")),
        "cover_image_url": pick_cover(client, app_id, details_en.get("header_image")),
    }


def login(api: httpx.Client, email: str, password: str) -> str:
    response = api.post("/api/v1/auth/token", data={"username": email, "password": password})
    response.raise_for_status()
    return response.json()["access_token"]


def existing_titles(api: httpx.Client) -> set[str]:
    titles: set[str] = set()
    skip = 0
    while True:
        page = api.get("/api/v1/games", params={"skip": skip, "limit": 100}).json()
        titles.update(game["title"].casefold() for game in page)
        if len(page) < 100:
            return titles
        skip += 100


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--email", default="admin@example.com")
    parser.add_argument("--password", default="admin12345")
    parser.add_argument("--dry-run", action="store_true")
    arguments = parser.parse_args()

    steam = httpx.Client(timeout=20, follow_redirects=True)
    api = httpx.Client(base_url=arguments.base_url, timeout=20)

    known_titles: set[str] = set()
    if not arguments.dry_run:
        token = login(api, arguments.email, arguments.password)
        api.headers["Authorization"] = f"Bearer {token}"
        known_titles = existing_titles(api)
        print(f"Login OK - {len(known_titles)} jogos já no catálogo")

    created = skipped = failed = 0
    for app_id, title_override in STEAM_GAMES:
        if title_override and title_override.casefold() in known_titles:
            print(f"  --   {title_override} (já existe)")
            skipped += 1
            continue
        try:
            payload = build_game_payload(steam, app_id, title_override)
        except httpx.HTTPError as error:
            print(f"  ERRO {app_id}: Steam indisponível ({error})")
            failed += 1
            continue
        if payload is None:
            print(f"  ERRO {app_id}: não encontrado na Steam")
            failed += 1
            continue
        if payload["title"].casefold() in known_titles:
            print(f"  --   {payload['title']} (já existe)")
            skipped += 1
            continue
        if arguments.dry_run:
            print(f"  OK   {payload}")
            created += 1
            continue
        response = api.post("/api/v1/games", json=payload)
        if response.status_code == 201:
            print(f"  OK   {payload['title']}")
            known_titles.add(payload["title"].casefold())
            created += 1
        else:
            print(f"  ERRO {payload['title']}: {response.status_code} {response.text[:200]}")
            failed += 1
        time.sleep(0.4)

    print(f"\n{created} jogos cadastrados, {skipped} já existiam, {failed} erros.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
