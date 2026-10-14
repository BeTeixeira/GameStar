# Gamestar

Monorepo do projeto Gamestar — plataforma de catálogo e avaliações de jogos.

```
/
├── backend/   # API FastAPI (Python 3.11+)
├── mobile/    # App mobile (Expo SDK 57 + Expo Router), ligado à API
└── docs/      # Especificações e planos de desenvolvimento
```

**O que o app faz:** login e cadastro · catálogo de jogos com busca · detalhe do
jogo com notas e comentários · **Minha lista** (completo, jogando, jogar depois,
não gostei) · **Amigos** (pedido por nome de usuário, precisa ser aceito) ·
**Perfil** editável (foto e fundo com GIF animado, nome, bio, senha, privacidade,
excluir conta) · **Conta especialista** (influencer, jornalista, dev, empresa — criação com confirmação ainda a definir: selo
nos comentários, "Nota especialista" separada no jogo e seguidores) · tema claro/escuro.

📦 **Baixar o app (APK Android):** veja a versão mais recente em
[Releases](https://github.com/BeTeixeira/PythonOpet/releases) — como instalar e
rodar o backend e conectar o app em [1. Rodando o backend no seu computador](#-1-rodando-o-backend-no-seu-computador-passo-a-passo).

> 🎮 **Modo demonstração:** por padrão, a API roda **sem nenhuma conexão externa** (sem Docker, sem Azure, sem internet), usando um arquivo SQLite local, e o app conversa com essa API na sua rede — ideal para abrir o projeto, mostrar a tela de documentação (`/docs`) e navegar pelo app numa apresentação. A lógica de produção (Azure SQL, GitHub OAuth, deploy) continua no projeto, só comentada/desligada — veja [Modo produção](#-modo-produção-referência).

---

## ✅ Pré-requisitos

Instale antes de começar (uma vez só, no seu PC):

| Ferramenta | Para quê | Link |
|---|---|---|
| **VSCode** | Editor usado neste guia | https://code.visualstudio.com |
| **Python 3.11+** | Rodar a API | https://www.python.org/downloads/ |
| **Node.js 22 LTS** (ou 20.19.4+) | Rodar o app mobile — versões mais antigas quebram o Expo SDK 57 | https://nodejs.org |
| **Git** | Baixar/clonar o projeto | https://git-scm.com |
| **App "Expo Go"** (no celular) | Ver o app mobile funcionando durante o desenvolvimento | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779) |
| **ngrok** *(opcional)* | Acessar a API de fora de casa (app instalado) | `winget install --id Ngrok.Ngrok --exact` + conta grátis em https://ngrok.com |
| **Conta Expo** *(opcional)* | Gerar APKs e publicar atualizações (EAS) | https://expo.dev |

Ao instalar o Python e o Node, marque a opção **"Add to PATH"** se o instalador perguntar — assim os comandos funcionam no terminal.

---

## 📂 Abrindo o projeto no VSCode

1. Abra o **VSCode**.
2. Vá em **File → Open Folder...** e selecione a pasta raiz do projeto (a que contém as pastas `backend` e `mobile`).
3. Se o VSCode sugerir instalar a extensão **Python** (da Microsoft), clique em **Install** — ela ajuda a rodar e debugar o código Python.
4. Abra o terminal integrado: menu **Terminal → New Terminal** (ou `` Ctrl+` ``). Todos os comandos abaixo são digitados nesse terminal.

---

## 🔙 1. Rodando o backend no seu computador (passo a passo)

O **backend** é o "cérebro" do app: um programa (a API) que roda no seu
computador e guarda tudo — contas, jogos, avaliações, amigos — num arquivo de
banco de dados (`backend/gamestar.db`). O app no celular não guarda nada
sozinho: ele pergunta tudo para a API. Por isso, **sem o backend ligado, o app
não carrega nada**.

```
 📱 celular (app)  ──Wi-Fi──▶  💻 seu computador
                                 └─ API (porta 8000)  ──▶  gamestar.db
```

O passo a passo tem 4 partes. As partes **A** e **C** você faz **uma vez só**;
a parte **B** você faz **toda vez** que for usar o app; a parte **D** explica
como ligar o app a esse backend.

> 💻 Os comandos abaixo são para **Windows**, digitados no **PowerShell** (ou
> no terminal do VSCode, que já é PowerShell). Digite um comando por vez e
> espere ele terminar antes do próximo.

### Antes de começar (uma vez só)

Confira se o **Python** (3.11 ou mais novo) e o **Git** estão instalados —
cada comando deve mostrar um número de versão:

```powershell
python --version
git --version
```

Se algum der erro, instale pelo link da tabela de [Pré-requisitos](#-pré-requisitos)
(marque **"Add to PATH"** no instalador) e **feche e abra o terminal de novo**.

Depois, baixe o projeto (se ainda não baixou) e entre na pasta dele:

```powershell
git clone https://github.com/BeTeixeira/PythonOpet.git
cd PythonOpet
```

### Parte A — Preparar o backend (só na primeira vez)

**1. Entre na pasta do backend**

```powershell
cd backend
```

**2. Crie o ambiente virtual** — uma "caixinha" só deste projeto onde ficam as
bibliotecas Python, sem bagunçar o resto do computador. Cria a pasta `.venv`
(demora alguns segundos e não mostra nada):

```powershell
python -m venv .venv
```

**3. Ative o ambiente virtual** — diz ao terminal para usar essa caixinha:

```powershell
.venv\Scripts\Activate.ps1
```

✅ **Deu certo se** o começo da linha do terminal passar a mostrar `(.venv)`.

> ⚠️ Apareceu um erro vermelho dizendo que **a execução de scripts foi
> desabilitada**? É uma proteção padrão do Windows. Rode este comando **uma
> vez** (ele só libera scripts criados no seu próprio computador) e tente o
> passo 3 de novo:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

**4. Instale as bibliotecas do projeto** (precisa de internet; leva 1–2 minutos):

```powershell
pip install -r requirements.txt
```

**5. Crie o arquivo de configuração** a partir do exemplo — os valores de
exemplo já funcionam, não precisa editar nada:

```powershell
copy .env.example .env
```

**6. Crie o banco de dados** (as tabelas dentro do `gamestar.db`):

```powershell
alembic upgrade head
```

✅ **Deu certo se** aparecerem linhas `Running upgrade ...`, terminando em
`add profile fields to users`.

**7. Crie a conta de administrador** — só o admin pode cadastrar jogos:

```powershell
python scripts/create_admin.py
```

✅ **Deu certo se** a última linha for `admin@example.com (admin): criado como admin`.
Essa conta entra no app com **e-mail `admin@example.com`** e **senha `admin12345`**.

> 💬 Vai aparecer bastante texto técnico (linhas com `SELECT`, `INSERT`...).
> É normal: o modo de depuração vem ligado. Para esconder, troque
> `APP_DEBUG=true` por `APP_DEBUG=false` no arquivo `backend/.env`.

### Parte B — Ligar a API (toda vez que for usar o app)

Na pasta `backend`, com o `(.venv)` aparecendo (se abriu um terminal novo,
faça o passo 3 de novo antes):

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

✅ **Deu certo se** aparecer `Uvicorn running on http://0.0.0.0:8000`.

- O `--host 0.0.0.0` é o que deixa **o celular** acessar a API. Sem ele, só o
  próprio computador consegue.
- Se o Windows perguntar se o **Python pode acessar a rede**, clique em
  **Permitir** (marque **Redes privadas**). Sem isso o celular não alcança a API.
- **Deixe esse terminal aberto** enquanto usar o app. Para desligar a API,
  clique nele e aperte `Ctrl+C`.

**Teste no computador:** abra no navegador **http://localhost:8000/docs**. Deve
aparecer uma página com a lista de rotas da API (a documentação automática).

### Parte C — Colocar os jogos no catálogo (só na primeira vez)

Com a API **ligada** (parte B), abra **outro** terminal (no VSCode: botão `+`
do painel do terminal) e rode:

```powershell
cd backend
.\scripts\seed_games.ps1
.\scripts\seed_extra.ps1
.\scripts\update_games.ps1
```

✅ **Deu certo se** aparecer `10 jogos cadastrados, 0 erros`, depois
`3 jogos cadastrados, 0 erros` e `13 jogos atualizados, 0 erros`. Pronto: o
catálogo tem 13 jogos com capa.

### Parte D — Conectar o app ao seu backend

Existem dois jeitos. Para quem roda o backend no **próprio computador**, o
**jeito 1** é o mais simples.

#### Jeito 1 — Pelo Expo Go, no mesmo Wi-Fi (recomendado)

O celular e o computador precisam estar **na mesma rede Wi-Fi**.

1. **Descubra o endereço do seu computador na rede.** Num terminal:
   ```powershell
   ipconfig
   ```
   Procure a linha **Endereço IPv4** (ou *IPv4 Address*) do Wi-Fi — algo como
   `192.168.0.8`.
2. **Teste pelo celular:** no navegador do celular, abra
   `http://SEU-IP:8000/docs` (ex: `http://192.168.0.8:8000/docs`). Se a página
   da API abrir, a conexão está ok. Se não abrir, veja
   [Problemas comuns](#-problemas-comuns).
3. **Rode o app** num terceiro terminal (precisa do Node.js — veja os
   pré-requisitos; o `npm install` só é necessário na primeira vez):
   ```powershell
   cd mobile
   npm install
   npx expo start
   ```
4. No celular, abra o app **Expo Go** e escaneie o **QR code** que apareceu no
   terminal. O app encontra a API sozinho (usa o mesmo endereço do computador,
   porta 8000).
5. Entre com o admin (`admin@example.com` / `admin12345`) ou crie uma conta na
   própria tela de login.

#### Jeito 2 — Pelo app instalado (APK), de qualquer lugar

O APK é o app instalado como qualquer outro, e funciona **até fora de casa
(4G)**, porque fala com a API por um túnel do **ngrok** (um endereço público
fixo que repassa as requisições para o seu computador).

> ⚠️ **Importante:** o endereço da API fica **gravado dentro do APK** (campo
> `extra.apiUrl` do `mobile/app.json`). O APK das
> [Releases](https://github.com/BeTeixeira/PythonOpet/releases) aponta para o
> túnel ngrok **de quem gerou o APK** — ele só funciona quando **aquele**
> computador está com a API e o túnel ligados.

**Para usar o APK das Releases** (backend no computador de quem gerou o APK):
nesse computador, depois de preparar o backend (partes A e C), rode **em vez
da parte B**:

```powershell
cd backend
.\scripts\start_remote.ps1
```

Ele abre **duas janelas** (a API e o túnel ngrok) — deixe as duas abertas. No
celular, baixe o `.apk` da versão mais recente em
[Releases](https://github.com/BeTeixeira/PythonOpet/releases), instale
(autorize a instalação pelo navegador se o Android pedir) e entre.

**Para usar um APK com o backend no seu próprio computador**, você precisa do
seu próprio túnel e gerar o seu APK (uma vez só):

1. Crie uma conta grátis em https://ngrok.com e copie o seu **authtoken**
   (fica no painel do site).
2. Instale e configure o ngrok:
   ```powershell
   winget install --id Ngrok.Ngrok --exact
   ngrok config add-authtoken SEU-TOKEN
   ```
3. Rode `.\scripts\start_remote.ps1` (pasta `backend`) e, na janela do ngrok, copie o
   endereço `https://....ngrok-free.dev` — ele é fixo para a sua conta.
4. Troque o `extra.apiUrl` do `mobile/app.json` por esse endereço.
5. Gere o seu APK (precisa de uma conta em https://expo.dev):
   `cd mobile` e `npm run build:apk`. O link para baixar aparece no terminal.

### Rotina do dia a dia (depois da primeira vez)

| Quero... | Faço |
|---|---|
| Usar o app pelo **Expo Go** no mesmo Wi-Fi | `cd backend` → `.venv\Scripts\Activate.ps1` → `uvicorn main:app --host 0.0.0.0 --port 8000` e, em outro terminal, `cd mobile` → `npx expo start` |
| Usar o **app instalado (APK)** | `cd backend` → `.\scripts\start_remote.ps1` (deixe as duas janelas abertas) |
| Desligar tudo | `Ctrl+C` no terminal da API (ou feche as janelas do `start_remote.ps1`) |
| Atualizei o projeto com `git pull` | `cd backend` → `.venv\Scripts\Activate.ps1` → `pip install -r requirements.txt` → `alembic upgrade head` (funções novas trazem tabelas novas) |

### 🆘 Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `python` ou `git` "não é reconhecido como comando" | Instale (marcando **Add to PATH**) e **feche e abra o terminal**. |
| Erro de "execução de scripts desabilitada" ao ativar o `.venv` ou rodar `.ps1` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (uma vez só). |
| `uvicorn` "não é reconhecido" | O `.venv` não está ativo: rode `.venv\Scripts\Activate.ps1` dentro de `backend`. |
| Erro dizendo que a **porta 8000 já está em uso** | Já tem uma API ligada (talvez em outro terminal ou numa janela do `start_remote.ps1`). Feche-a ou aperte `Ctrl+C` nela. |
| O celular **não abre** `http://SEU-IP:8000/docs` | Confira: mesma rede Wi-Fi (redes de visitante costumam bloquear); API ligada **com** `--host 0.0.0.0`; Python **permitido** no Firewall do Windows para redes privadas; o IP é o do **Wi-Fi** no `ipconfig`. |
| O app mostra **"Não foi possível conectar à API"** | A API está ligada? O IP do computador mudou (rode `ipconfig` de novo)? No APK, o `start_remote.ps1` está rodando no computador certo? |
| Erro com `no such column` ou `no such table` | Faltou atualizar o banco: `alembic upgrade head` (pasta `backend`, `.venv` ativo). |
| Login do admin diz **"Email ou senha incorretos"** | Rode `python scripts/create_admin.py` (parte A, passo 7). |
| Os scripts de jogos dão erro de conexão | A API precisa estar **ligada** (parte B) num outro terminal enquanto eles rodam. |
| Catálogo vazio no app | Faltou a parte C (cadastrar os jogos). |
| Expo Go mostra **erro 500** ao abrir o app | Quase sempre é o Node antigo: rode `node --version` — precisa ser 20.19.4+ (recomendado 22 LTS). Atualize, apague `mobile/node_modules`, rode `npm install` e `npx expo start -c`. A mensagem completa do erro aparece no terminal do `npx expo start`. |

---

## 🏷️ Versões e releases do app

- O código é versionado por **branches** (`feat/...`, `fix/...`) que entram na
  `main`; cada versão lançada recebe uma **tag** `app-vX.Y.Z` e uma **Release**
  no GitHub com o APK anexado.
- `version` no `mobile/app.json` segue `MAIOR.MENOR.CORREÇÃO`; o `versionCode`
  do Android é incrementado sozinho pelo EAS a cada build.
- Mudanças só de código chegam ao app instalado **sem APK novo**, via EAS Update.

```bash
cd mobile
npm run update -- --message "o que mudou"   # atualização sem reinstalar
npm run build:apk                            # APK novo (mudanças nativas / nova versão)
```

Passo a passo completo para lançar uma versão: [`mobile/README.md`](mobile/README.md#versões-e-atualizações).

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
│   └── api/v1/            endpoints: auth, users (perfil, seguir), games,
│                          reviews, library, friends
├── migrations/            arquivos do Alembic
├── scripts/
│   ├── create_admin.py    cria/promove o admin local
│   ├── seed_*.ps1         cadastram os jogos de demonstração
│   ├── update_games.ps1   atualiza capas e dados dos jogos
│   └── start_remote.ps1   sobe API + ngrok para o app instalado
└── tests/                 unit/ e integration/ (pytest)

mobile/
├── app.json               nome, versão, endereço da API (extra.apiUrl), updates
├── eas.json               perfil de build do APK (EAS)
├── assets/                ícones e imagens do app
└── src/
    ├── app/               telas (Expo Router): login, catálogo, minha lista,
    │                      amigos, perfil, jogo/[id]
    ├── components/        Screen (container de toda tela), TopBar, cards...
    ├── context/           Auth, Games, Library, Follow (estado global)
    ├── services/api.ts    cliente HTTP da API
    ├── theme/             cores claro/escuro
    ├── types/             tipos do app e formatos da API
    └── utils/             confirmação de exclusão, datas
```

---

## ⚙️ Variáveis de ambiente (backend)

Ficam no arquivo `backend/.env` (criado a partir de `.env.example` na parte A, passo 5). Não precisa alterar nada para a demonstração local — os valores padrão já funcionam.

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
> [Jeito 2 — Pelo app instalado (APK)](#jeito-2--pelo-app-instalado-apk-de-qualquer-lugar).

---

## 🧪 Testes (API)

```bash
cd backend
pytest -v                                   # unitários + integração (SQLite em memória)
pytest --cov=app --cov-report=term-missing
```

Não precisa de Docker nem Postgres. Para rodar contra Postgres, defina
`TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/game_reviews_test`.
