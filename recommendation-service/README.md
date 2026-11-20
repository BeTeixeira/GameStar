# Gamestar — Recommendation Service

Microserviço em **Python/FastAPI** que recomenda jogos a partir dos dados da API principal do Gamestar
(biblioteca do usuário, reviews e amigos). Ele não tem banco próprio: consulta a API principal via HTTP
e se registra no **Eureka** para ser descoberto pelo **API Gateway**.

```
                 ┌──────────────────────┐
                 │  eureka-server :8761 │
                 └──────────▲───────────┘
          registra          │          registra
     ┌──────────────────────┼──────────────────────┐
┌────┴─────────┐   ┌────────┴────────┐   ┌─────────┴──────────────┐
│ api-gateway  │──▶│  gamestar-api   │◀──│ recommendation-service │
│   :8080      │   │     :8000       │   │        :8001           │
└──────────────┘   └─────────────────┘   └────────────────────────┘
  /api/**             → lb://GAMESTAR-API
  /recommendations/** → lb://RECOMMENDATION-SERVICE
```

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Health check (usado pelo Eureka) |
| GET | `/recommendations/me?limit=10` | Bearer (JWT da API principal) | Jogos sugeridos para o usuário logado, com os motivos |
| GET | `/recommendations/games/{game_id}/similar?limit=5` | — | Jogos parecidos (gênero, desenvolvedora, nota) |
| GET | `/recommendations/rankings?days=7&min_votes=3&limit=10` | — | Ranking por média bayesiana, opcionalmente só dos últimos N dias |

Documentação interativa em `http://localhost:8001/docs`.

## Como a pontuação funciona

**Recomendação pessoal** (jogos que já estão na biblioteca, inclusive os marcados como `disliked`, ficam de fora):

```
score = 0.4 · afinidade_de_gênero     (gêneros da biblioteca; "disliked" desconta)
      + 0.4 · nota_média_dos_amigos   (normalizada de 1–10 para 0–1)
      + 0.2 · nota_média_global       (normalizada de 1–10 para 0–1)
```

**Similares:** `0.5` mesmo gênero + `0.2` mesma desenvolvedora + `0.3 · proximidade da nota média`.

**Ranking:** média bayesiana `(C · média_global + soma_notas) / (C + nº_reviews)`, com `C = min_votes`,
para que um jogo com uma única nota 10 não passe na frente de um jogo com muitas notas 9.

Os pesos são configuráveis por variável de ambiente (`WEIGHT_GENRE`, `WEIGHT_FRIENDS`, `WEIGHT_GLOBAL`).

## Estrutura

```
app/
├── main.py                       # create_app, lifespan (cliente HTTP + registro no Eureka), erros
├── core/config.py                # Settings (pydantic-settings)
├── api/                          # rotas, dependências e schemas de resposta
├── services/                     # orquestra as chamadas e aplica a pontuação
├── domain/
│   ├── models.py                 # Game, Review, LibraryEntry, ScoredGame, RankedGame
│   └── scoring.py                # funções puras de pontuação (núcleo dos testes)
└── infrastructure/
    ├── gamestar_client.py        # cliente httpx da API principal (paginação, erros)
    └── eureka.py                 # registro/desregistro no Eureka
tests/
├── fakes.py                      # API principal simulada com httpx.MockTransport
├── unit/                         # pontuação, cliente HTTP, Eureka
└── integration/                  # endpoints de ponta a ponta contra a API simulada
```

## Rodando localmente

```bash
cd recommendation-service
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --port 8001 --reload
```

A API principal precisa estar no ar em `GAMESTAR_API_URL` (padrão `http://localhost:8000/api/v1`).
Com o gateway rodando, aponte `GAMESTAR_API_URL` para ele (`http://localhost:8080/api/v1`): a chamada
entre serviços passa a ser resolvida pelo Eureka.

### Com Eureka

```env
EUREKA_ENABLED=true
EUREKA_SERVER_URL=http://localhost:8761/eureka
EUREKA_INSTANCE_HOST=localhost
```

O serviço aparece no painel do Eureka como `RECOMMENDATION-SERVICE`.

### Docker

```bash
docker build -t gamestar-recommendation .
docker run -p 8001:8001 --env-file .env gamestar-recommendation
```

## Testes e cobertura

```bash
pytest --cov=app --cov-report=term-missing
```

Os testes não dependem da API principal nem do Eureka. A API é simulada com `httpx.MockTransport`
e o cliente Eureka é substituído por um fake.
