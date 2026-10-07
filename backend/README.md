# Gamestar — Monorepo

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Azure SQL](https://img.shields.io/badge/Azure_SQL-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)

> Monorepo com **API RESTful** (Python/FastAPI) e **aplicativo mobile** (React Native/Expo) para catálogo e avaliação de jogos, com autenticação GitHub OAuth, RBAC e deploy automático no Azure.

---

## 📦 Projetos do Monorepo

| Pasta | Descrição | Stack principal |
|---|---|---|
| [`backend/`](#-api--back-end) | API RESTful back-end | Python 3.11, FastAPI, SQLite (demo) / Azure SQL (produção) |
| [`mobile/`](#-mobile--gamestar-app) | Aplicativo Android/iOS | React Native, Expo SDK 54 |

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

</details>

---

### 🛡️ RBAC — Controle de Acesso

| Ação | `user` | `admin` |
|---|---|---|
| Listar / detalhar jogos | ✅ | ✅ |
| Criar / editar / deletar jogo | ❌ | ✅ |
| Criar / editar própria avaliação | ✅ | ❌ |
| Deletar qualquer avaliação | ❌ | ✅ |
| Editar próprio perfil | ✅ | ✅ |
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
│   ├── services/        UserService, GameService, ReviewService
│   ├── infrastructure/  database, repositories, exceptions
│   └── api/v1/          endpoints: auth, users, games, reviews, library, friends
└── migrations/
    └── versions/        arquivos gerados pelo Alembic
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
| `GET` | `/api/v1/games?q=` | ❌ |
| `POST` | `/api/v1/games` | ✅ Admin |
| `PATCH/DELETE` | `/api/v1/games/{id}` | ✅ Admin |
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

## 📱 Mobile — Gamestar App

![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81.5-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=apple&logoColor=white)

> Aplicativo de catálogo interativo com tema cinza translúcido, animações spring, navegação sequencial prev/next e RBAC-aware (FAB e botões de edição visíveis apenas para admins).

<details>
<summary><strong>🎯 Funcionalidades (Clique para expandir)</strong></summary>
<br>

- **Login** — modo demonstração com dois botões mock (Usuário / Administrador), instantâneo e 100% offline; sem chamadas à API
- **Home** — grade 2 colunas, busca em tempo real, FAB de criação (só admin)
- **Detalhes** — capa em destaque, abas Comentários / Avaliar (aba Avaliar oculta para admins)
- **Admin UI** — botões editar/deletar no header, badge "ADMIN" na Home
- **Navegação Prev/Next** — troca de jogo com animação slide sem voltar ao início

</details>

---

### 🛠️ Stack

* **Framework:** React Native 0.81.5 + Expo SDK 54
* **Navegação:** React Navigation 6 (Native Stack)
* **Animações:** Animated API — fade, slide, spring
* **Auth:** `AuthContext` com usuários mock em memória (modo demonstração, sem rede)
* **Tipagem:** TypeScript strict

---

### 📁 Estrutura

```
mobile/
├── App.tsx
├── app.json                  # scheme: "gamestar" para deep link OAuth
└── src/
    ├── context/AuthContext.tsx
    ├── navigation/AppNavigator.tsx
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── HomeScreen.tsx
    │   └── GameDetailScreen.tsx
    ├── components/ui/
    └── types/index.ts
```

---

### 🚀 Execução

```bash
cd mobile
npm install
npx expo start --clear
```

Escaneie o QR com o **Expo Go** (SDK 54) no celular.

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
