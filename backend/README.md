# Gamestar — API (back-end)

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure SQL](https://img.shields.io/badge/Azure_SQL-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

> **API RESTful** (Python/FastAPI) do Gamestar — catálogo e avaliação de jogos, com JWT, GitHub OAuth, RBAC e deploy no Azure.
> O app que consome esta API está em [`../mobile`](../mobile/README.md).
> Para o passo a passo de **como rodar localmente** (modo demonstração, sem Docker/Azure), veja o [README na raiz do projeto](../README.md). Este documento detalha a arquitetura e a configuração de produção.

---

## 🔙 API — Back-end

### 📖 Visão Geral

API back-end em **Python 3.11+**, escalável no Azure, aplicando **SOLID** e **Clean Architecture**. Roda com **SQLite** localmente (modo demonstração, zero configuração) e com **Azure SQL (MSSQL)** em produção.

<details>
<summary><strong>🎯 Funcionalidades (Clique para expandir)</strong></summary>
<br>

- **Catálogo de jogos** — CRUD completo com busca por título, gênero e desenvolvedora.
- **Avaliações** — nota (1–10) e resenha textual, uma por usuário por jogo.
- **Autenticação GitHub OAuth 2.0** — login via conta GitHub, JWT com claim de role.
- **RBAC** — `admin` tem CRUD total; `user` pode ler, avaliar e comentar.
- **Conta especialista** — `account_type` do usuário, com área de atuação e empresa (o cadastro público só cria conta normal; a criação de especialista, com confirmação, ainda será definida); as avaliações saem com selo (`is_expert`) e podem ser seguidas por outros usuários.

</details>

---

### 🛡️ RBAC — Controle de Acesso

| Ação | `user` | `admin` |
|---|---|---|
| Listar / detalhar jogos | ✅ | ✅ |
| Criar / editar / deletar jogo | ❌ | ✅ |
| Criar / editar própria avaliação | ✅ | ❌ |
| Deletar qualquer avaliação (moderação) | ❌ | ✅ |
| Listar/buscar contas, desativar e excluir contas | ❌ | ✅ |
| Tornar uma conta especialista (pelo ID) | ❌ | ✅ |
| Editar próprio perfil | ✅ | ✅ |
| Seguir conta especialista | ✅ | ✅ |
| Deletar qualquer usuário | ❌ | ✅ |

---

### 🔐 GitHub OAuth Flow

```
Mobile/Browser → GET /api/v1/auth/github/login-url
             ← { "url": "https://github.com/login/oauth/authorize?..." }

Mobile abre URL no browser → usuário autoriza no GitHub
GitHub redireciona → GET /api/v1/auth/github/callback?code=...
Servidor troca code por token → redireciona para gamestar://auth?token=JWT

App captura deep link → armazena JWT → usuário logado
```

---

### 🛠️ Stack Tecnológica

* **Linguagem:** Python 3.11+
* **Framework:** FastAPI — alto desempenho, OpenAPI automático
* **Banco (local / demonstração):** SQLite via `aiosqlite` — arquivo único, sem instalação
* **Banco (produção):** Azure SQL via `mssql+aioodbc` (async)
* **Migrações:** Alembic (modo assíncrono)
* **Validação:** Pydantic v2
* **Autenticação:** GitHub OAuth 2.0 + JWT (HS256)
* **Padrões:** Clean Architecture + SOLID

---

### 📁 Estrutura

```
backend/
├── main.py
├── pyproject.toml
├── Dockerfile                       # Multi-stage + ODBC Driver 18
├── docker-compose.yml
├── .env.example
├── app/
│   ├── core/            config, security, logging
│   ├── domain/          models, schemas, interfaces (ABCs)
│   ├── services/        User, Game, Review, Library, Friendship, Follow
│   ├── infrastructure/  database, repositories, storage, exceptions
│   └── api/v1/          endpoints: auth, users, games, reviews, library, friends
├── migrations/
│   └── versions/        arquivos gerados pelo Alembic
├── scripts/             create_admin.py, seed_*.ps1, update_games.ps1, start_remote.ps1
└── tests/               unit/ e integration/ (pytest)
```

---

### ⚙️ Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `SECRET_KEY` | Chave para assinar JWTs |
| `DATABASE_URL` | URL de conexão (asyncpg local / aioodbc prod) |
| `GITHUB_CLIENT_ID` | Client ID do OAuth App no GitHub |
| `GITHUB_CLIENT_SECRET` | Client Secret do OAuth App |
| `GITHUB_REDIRECT_URI` | Callback URL registrada no GitHub |

---

### 🚀 Execução Local

**Modo demonstração (SQLite, sem Docker e sem Azure)** — recomendado para rodar e apresentar o projeto:
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows — use "source .venv/bin/activate" no Mac/Linux
pip install -r requirements.txt
copy .env.example .env          # Windows — use "cp .env.example .env" no Mac/Linux
alembic upgrade head
python scripts/create_admin.py  # admin@example.com / admin12345
uvicorn main:app --reload
```

Para builds reprodutíveis, use `pip install -r requirements.lock.txt` (versões travadas). O `requirements.txt` continua sendo a fonte de verdade para ranges mínimos.

**Com Docker + PostgreSQL** (ambiente mais próximo de produção — o `docker-compose.yml` já sobrescreve `DATABASE_URL` para apontar para o container do Postgres):
```bash
cp .env.example .env
docker compose up --build
```

API disponível em `http://localhost:8000/docs`

---

### 🗺️ Endpoints principais

| Método | Rota | Auth |
|---|---|---|
| `GET` | `/api/v1/auth/github/login-url` | ❌ |
| `GET/POST` | `/api/v1/auth/github/callback` | ❌ |
| `POST` | `/api/v1/auth/token` | ❌ |
| `POST` | `/api/v1/users` — cadastro (sempre conta normal) | ❌ |
| `GET/PATCH/DELETE` | `/api/v1/users/me` — perfil do usuário logado (`company`/`expertise_area` só para especialista) | ✅ JWT |
| `GET` | `/api/v1/users/me/following` — especialistas que o usuário segue | ✅ JWT |
| `POST/DELETE` | `/api/v1/users/{id}/follow` — seguir / deixar de seguir um especialista | ✅ JWT |
| `GET` | `/api/v1/users?q=` — lista/busca contas (usuário, nome ou e-mail) | ✅ Admin |
| `PATCH` | `/api/v1/users/{id}/status` — desativa/reativa a conta (`{"is_active": false}`) | ✅ Admin |
| `PUT` | `/api/v1/users/{id}/account-type` — `{"account_type": "especialista", "expertise_area": "dev"}` ou `{"account_type": "normal"}` | ✅ Admin |
| `DELETE` | `/api/v1/users/{id}` — exclui a conta (não a própria) | ✅ Admin |
| `GET` | `/api/v1/games?q=` | ❌ |
| `POST` | `/api/v1/games` | ✅ Admin |
| `PATCH/DELETE` | `/api/v1/games/{id}` | ✅ Admin |
| `GET` | `/api/v1/reviews/game/{game_id}` — inclui `is_expert` e `expertise_area` do autor | ❌ |
| `POST` | `/api/v1/reviews` | ✅ JWT |
| `GET` | `/api/v1/library` — "Minha lista" do usuário logado | ✅ JWT |
| `PUT/DELETE` | `/api/v1/library/{game_id}` — define/remove o status (`completed`, `playing`, `plan_to_play`, `disliked`) | ✅ JWT |
| `GET` | `/api/v1/friends` — amizades aceitas | ✅ JWT |
| `GET/POST` | `/api/v1/friends/requests` — pedidos pendentes / enviar pedido (`{"username": ...}`) | ✅ JWT |
| `POST` | `/api/v1/friends/requests/{id}/accept` — só quem recebeu | ✅ JWT |
| `DELETE` | `/api/v1/friends/requests/{id}` — recusar ou cancelar | ✅ JWT |
| `DELETE` | `/api/v1/friends/{user_id}` — desfazer amizade | ✅ JWT |
| `GET` | `/health` | ❌ |

---

### 🔄 CI/CD — GitHub Actions → Azure

```
push origin main
  → Build Docker image
  → Push para acraula131.azurecr.io
  → Configura env vars no Azure Web App
  → Deploy em WEBAPPB
```

Produção: `https://webappb-cuf4gxhvh6hmb0h3.chilecentral-01.azurewebsites.net/docs`

**Secrets necessários no GitHub:**

| Secret | Descrição |
|---|---|
| `AZURE_CREDENTIALS` | JSON do service principal Azure |
| `ACR_USERNAME` | Admin username do ACR `acraula131` |
| `ACR_PASSWORD` | Admin password do ACR |
| `SECRET_KEY` | Chave JWT de produção |
| `DATABASE_URL` | URL Azure SQL (mssql+aioodbc) |
| `GITHUB_CLIENT_ID` | OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret |

---

## 🧪 Testes (API)

```bash
cd backend
pytest -v
pytest --cov=app --cov-report=term-missing
```

Os testes unitários (`tests/unit/`) e de integração (`tests/integration/`) compartilham
a fixture de banco do `conftest.py`, que por padrão usa **SQLite em memória** — não
precisa de Docker nem Postgres. `tests/integration/test_api_flow.py` percorre a API por
HTTP (cadastro, login, admin, reviews) e tem helpers (`register_and_login`, `make_admin`,
`create_game`) para testar novos endpoints. Para rodar contra Postgres:

```bash
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/game_reviews_test pytest -v
```
