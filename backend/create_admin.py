"""Cria (ou promove) um usuário administrador no banco configurado em DATABASE_URL.

Só para desenvolvimento local: a API não tem rota para virar admin, e sem admin
não dá para cadastrar jogos (POST /api/v1/games), nem rodar o seed_games.ps1.

Uso (com o .venv ativo, dentro de backend/):
    python create_admin.py                                   # admin@example.com / admin12345
    python create_admin.py --email eu@exemplo.com --password MinhaSenha1 --username eu

Se o email já existir, o usuário é promovido a admin (a senha não muda).
"""

import argparse
import asyncio

from app.domain.models.user import UserRole
from app.domain.schemas.user import UserCreate
from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.repositories import UserRepository

DEFAULT_EMAIL = "admin@example.com"
DEFAULT_PASSWORD = "admin12345"
DEFAULT_USERNAME = "admin"


async def main(email: str, password: str, username: str) -> None:
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        if user:
            action = "já era admin" if user.role == UserRole.admin else "promovido a admin"
        else:
            user = await repo.create(UserCreate(username=username, email=email, password=password))
            action = "criado como admin"
        user.role = UserRole.admin
        await session.commit()
        print(f"{email} ({user.username}): {action}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--username", default=DEFAULT_USERNAME)
    args = parser.parse_args()
    asyncio.run(main(args.email, args.password, args.username))
