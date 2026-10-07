# Gamestar

Monorepo do projeto Gamestar — plataforma de catálogo e avaliações de jogos.

```
/
├── backend/   # API FastAPI (Python 3.11)
├── Frontapp/  # App mobile oficial (Expo SDK 57 + Expo Router), ligado à API
└── mobile/    # App antigo (obsoleto — substituído pelo Frontapp)
```

**O que o app faz:** login e cadastro · catálogo de jogos com busca · detalhe do
jogo com notas e comentários · **Minha lista** (completo, jogando, jogar depois,
não gostei) · **Amigos** (pedido por nome de usuário, precisa ser aceito) ·
tema claro/escuro.

📦 **Baixar o app (APK Android):** veja a versão mais recente em
[Releases](https://github.com/BeTeixeira/PythonOpet/releases) — como instalar e
usar de qualquer lugar em [3. App instalado no celular](#-3-app-instalado-no-celular-apk).

> 🎮 **Modo demonstração:** por padrão, a API roda **sem nenhuma conexão externa** (sem Docker, sem Azure, sem internet), usando um arquivo SQLite local, e o app conversa com essa API na sua rede — ideal para abrir o projeto, mostrar a tela de documentação (`/docs`) e navegar pelo app numa apresentação. A lógica de produção (Azure SQL, GitHub OAuth, deploy) continua no projeto, só comentada/desligada — veja [Modo produção](#-modo-produção-referência).

---

## ✅ Pré-requisitos

Instale antes de começar (uma vez só, no seu PC):

| Ferramenta | Para quê | Link |
|---|---|---|
| **VSCode** | Editor usado neste guia | https://code.visualstudio.com |
| **Python 3.11+** | Rodar a API | https://www.python.org/downloads/ |
| **Node.js 18 LTS+** | Rodar o app mobile | https://nodejs.org |
| **Git** | Baixar/clonar o projeto | https://git-scm.com |
| **App "Expo Go"** (no celular) | Ver o app mobile funcionando durante o desenvolvimento | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779) |
| **ngrok** *(opcional)* | Acessar a API de fora de casa (app instalado) | `winget install --id Ngrok.Ngrok --exact` + conta grátis em https://ngrok.com |
| **Conta Expo** *(opcional)* | Gerar APKs e publicar atualizações (EAS) | https://expo.dev |

Ao instalar o Python e o Node, marque a opção **"Add to PATH"** se o instalador perguntar — assim os comandos funcionam no terminal.

---

## 📂 Abrindo o projeto no VSCode

1. Abra o **VSCode**.
2. Vá em **File → Open Folder...** e selecione a pasta raiz do projeto (a que contém as pastas `backend` e `Frontapp`).
3. Se o VSCode sugerir instalar a extensão **Python** (da Microsoft), clique em **Install** — ela ajuda a rodar e debugar o código Python.
4. Abra o terminal integrado: menu **Terminal → New Terminal** (ou `` Ctrl+` ``). Todos os comandos abaixo são digitados nesse terminal.

---

## 🔙 1. Rodando a API localmente

A API roda 100% local, sem precisar de Docker nem de banco de dados externo — usa um arquivo SQLite (`gamestar.db`) criado automaticamente na primeira execução.

No terminal do VSCode:

```bash
cd backend

# 1. Cria um ambiente virtual isolado para as dependências do projeto
python -m venv .venv

# 2. Ativa o ambiente virtual
.venv\Scripts\activate        # Windows (PowerShell ou cmd)
# source .venv/bin/activate   # Mac/Linux

# 3. Instala as dependências
pip install -r requirements.txt

# 4. Copia o arquivo de configuração de exemplo
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux

# 5. Cria as tabelas no banco SQLite local
alembic upgrade head

# 6. Inicia a API
uvicorn main:app --reload
```

Se tudo correu bem, o terminal vai mostrar algo como `Uvicorn running on http://127.0.0.1:8000`.

Abra no navegador: **http://localhost:8000/docs** — é a documentação interativa (Swagger UI) gerada automaticamente pelo FastAPI, onde dá para ver e testar todos os endpoints da API.

> 💡 Dica VSCode: depois da primeira vez, o VSCode geralmente detecta o `.venv` e oferece para selecioná-lo como interpretador Python do projeto (canto inferior direito ou `Ctrl+Shift+P` → "Python: Select Interpreter"). Selecione o que está dentro de `backend/.venv`.

Para parar a API, vá no terminal e pressione `Ctrl+C`.

> 🔄 **Atualizou o projeto (`git pull`)?** Rode `alembic upgrade head` de novo
> dentro de `backend/` — novas funções (ex: Minha lista e Amigos) trazem
> tabelas novas no banco.

### Dados de demonstração (admin + jogos)

A API não tem rota para virar administrador, e só admin cadastra jogos. Para ter
um banco local com dados, com a API rodando, em **outro terminal** (com o `.venv` ativo):

```bash
cd backend

# Cria o admin local admin@example.com / admin12345 (ou promove um email existente:
# python create_admin.py --email voce@exemplo.com --password SuaSenha123)
python create_admin.py

# Cadastra 13 jogos com capa (PowerShell)
.\seed_games.ps1   -Email admin@example.com -Password admin12345
.\seed_extra.ps1   -Email admin@example.com -Password admin12345
.\update_games.ps1 -Email admin@example.com -Password admin12345
```

---

## 📱 2. Rodando o app mobile

O app oficial fica em **`Frontapp/`** e usa a API de verdade (login, catálogo,
busca, comentários, Minha lista e amigos). Para desenvolver, rode pelo Expo Go
com a API no seu PC. Para o celular conseguir acessar a API, inicie-a escutando
na rede:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Em um **novo terminal**:

```bash
cd Frontapp
npm install
npx expo start
```

Vai aparecer um **QR code** no terminal. Para testar:

- **No celular:** abra o app **Expo Go** e escaneie o QR code (Android: opção de escanear dentro do próprio app; iOS: pela câmera nativa). O Expo Go precisa ser do SDK 57 (o da loja já é).
- **No emulador Android:** com o terminal do Expo aberto, pressione `a` (se o Expo Go do emulador estiver desatualizado, o Expo oferece instalar a versão certa).
- **No navegador:** pressione `w`.

Crie uma conta na própria tela de login (ou entre com o admin local). Estrutura
e o que ainda não vem da API: [`Frontapp/README.md`](Frontapp/README.md).

---

## 📲 3. App instalado no celular (APK)

O APK é o app "de verdade", instalado como qualquer outro, e funciona **de
qualquer lugar** (até no 4G): ele chama a API do seu PC por um túnel
**ngrok** com endereço fixo.

1. Baixe o `.apk` da versão mais recente em
   [Releases](https://github.com/BeTeixeira/PythonOpet/releases) e instale
   (autorize a instalação pelo navegador se o Android pedir).
2. No PC, suba a API e o túnel — abre duas janelas, deixe-as abertas:
   ```powershell
   cd backend
   .\start_remote.ps1
   ```
3. Abra o app e entre.

O app só funciona enquanto o PC estiver ligado (sem suspender) com as duas
janelas abertas. Pré-requisito do `start_remote.ps1`: ngrok instalado e com o
token da conta configurado (`ngrok config add-authtoken <token>`). O endereço do
túnel fica em `Frontapp/app.json` → `extra.apiUrl`.

---

## 🏷️ Versões e releases do app

- O código é versionado por **branches** (`feat/...`, `fix/...`) que entram na
  `main`; cada versão lançada recebe uma **tag** `app-vX.Y.Z` e uma **Release**
  no GitHub com o APK anexado.
- `version` no `Frontapp/app.json` segue `MAIOR.MENOR.CORREÇÃO`; o `versionCode`
  do Android é incrementado sozinho pelo EAS a cada build.
- Mudanças só de código chegam ao app instalado **sem APK novo**, via EAS Update.

```bash
cd Frontapp
npm run update -- --message "o que mudou"   # atualização sem reinstalar
npm run build:apk                            # APK novo (mudanças nativas / nova versão)
```

Passo a passo completo para lançar uma versão: [`Frontapp/README.md`](Frontapp/README.md#versões-e-atualizações).

---

## 🗂️ Estrutura do projeto

```
backend/
├── main.py              # ponto de entrada da API
├── app/
│   ├── core/             config, segurança, logging
│   ├── domain/            models, schemas, interfaces
│   ├── services/          regras de negócio
│   ├── infrastructure/    banco de dados, repositórios
│   └── api/v1/            endpoints: auth, users, games, reviews, library, friends
├── migrations/            arquivos do Alembic
├── tests/                 unit/ e integration/ (pytest)
├── create_admin.py        cria/promove o admin local
├── seed_*.ps1             cadastram os jogos de demonstração
└── start_remote.ps1       sobe API + ngrok para o app instalado

Frontapp/
├── app/                   telas (Expo Router): login, catálogo, minha lista,
│                          amigos, perfil, jogo/[id]
├── app.json               nome, versão, endereço da API (extra.apiUrl), updates
├── eas.json               perfil de build do APK (EAS)
└── src/
    ├── services/api.ts    cliente HTTP da API
    ├── context/           Auth, Games, Library (estado global)
    ├── components/        Screen (container de toda tela), TopBar, cards...
    ├── utils/             confirmação de exclusão, datas
    └── theme/             cores claro/escuro
```

---

## ⚙️ Variáveis de ambiente (backend)

Ficam no arquivo `backend/.env` (criado a partir de `.env.example` no passo 4 acima). Não precisa alterar nada para a demonstração local — os valores padrão já funcionam.

| Variável | Para quê | Padrão (demo) |
|---|---|---|
| `SECRET_KEY` | Assina os tokens JWT | valor de exemplo incluso |
| `DATABASE_URL` | Conexão com o banco | SQLite local (`./gamestar.db`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Login real via GitHub OAuth | vazio (opcional) |

---

## 🚀 Modo produção (referência)

O projeto também está preparado para rodar com banco **Azure SQL**, autenticação **GitHub OAuth** real e deploy automático via **GitHub Actions** para um **Azure Web App** (usando Docker). Essa configuração não é necessária para rodar a demonstração local — fica comentada em `backend/.env.example` e descrita em [`backend/README.md`](backend/README.md), caso o projeto precise ser implantado novamente no futuro.

> ⚠️ O Azure Web App de produção está **fora do ar** (o endereço não resolve
> mais). Hoje o acesso remoto ao app é feito pelo túnel ngrok — veja
> [3. App instalado no celular](#-3-app-instalado-no-celular-apk).

---

## 🧪 Testes (API)

```bash
cd backend
pytest -v                                   # unitários + integração (SQLite em memória)
pytest --cov=app --cov-report=term-missing
```

Não precisa de Docker nem Postgres. Para rodar contra Postgres, defina
`TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/game_reviews_test`.
