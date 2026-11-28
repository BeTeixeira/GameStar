# Deploy no Render + Supabase (gratuito, sem CNPJ)

```
celular ──HTTPS──> gamestar-api.onrender.com (Render, plano Free)
                     ├─ banco: Postgres do Supabase
                     └─ fotos: Supabase Storage (bucket público "profile-images")
UptimeRobot ──a cada 5 min──> /health/db   (mantém Render e Supabase acordados)
```

## 1. Supabase (banco e fotos)

1. Entre em <https://supabase.com> com o GitHub → **New project**.
2. Name `gamestar`, Region **South America (São Paulo)**, clique em **Generate a password**
   e **guarde a senha** (só aparece agora). Plano Free.
3. **Storage → New bucket**: nome `profile-images`, marque **Public bucket**.
4. **Connect** (botão no topo) → aba **Connection string** → **Session pooler** (IPv4).
   Copie a URI e troque `[YOUR-PASSWORD]` pela senha do passo 2. É o `DATABASE_URL`.
   Não use o *Transaction pooler* (porta 6543): ele não funciona com o driver da API.
5. **Project Settings → API Keys**: copie a **secret key** (`sb_secret_...`, ou a
   `service_role` nas chaves legadas). É o `SUPABASE_SERVICE_KEY`.
6. **Project Settings → Data API**: copie a **Project URL** (`https://xxxx.supabase.co`).
   É o `SUPABASE_URL`.

## 2. Render (API)

1. Entre em <https://render.com> com o GitHub → **New → Web Service**.
2. Escolha **Public Git Repository** e cole `https://github.com/BeTeixeira/GameStar`.
3. Preencha:

| Campo | Valor |
|---|---|
| Name | `gamestar-api` |
| Region | Oregon ou Virginia (as mais próximas do Brasil no Render) |
| Branch | `main` (ou a branch que quiser publicar) |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.lock.txt` |
| Start Command | `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'` |
| Instance Type | **Free** |
| Health Check Path (Advanced) | `/health` |

4. **Environment Variables**:

| Chave | Valor |
|---|---|
| `APP_ENV` | `production` |
| `SECRET_KEY` | clique em **Generate** |
| `DATABASE_URL` | URI do Supabase (passo 1.4) |
| `SUPABASE_URL` | Project URL (passo 1.6) |
| `SUPABASE_SERVICE_KEY` | secret key (passo 1.5) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
| `LOG_JSON` | `true` |
| `PUSH_ENABLED` | `true` |
| `SENTRY_DSN` | opcional |

5. **Create Web Service**. O primeiro deploy leva alguns minutos; as migrações rodam
   sozinhas. Teste `https://gamestar-api.onrender.com/health/db` → `{"status":"ok","database":"ok"}`.

> Como o repositório entra pela URL pública, o Render não faz deploy sozinho a cada push.
> Depois de um merge, clique em **Manual Deploy → Deploy latest commit**.

## 3. Manter acordado (UptimeRobot)

1. Crie a conta em <https://uptimerobot.com> → **New monitor**.
2. Tipo **HTTP(s)**, URL `https://gamestar-api.onrender.com/health/db`, intervalo **5 min**.

O Render dorme depois de 15 min sem requisições; com o ping a cada 5 min, não dorme.
Um serviço ligado o mês todo usa cerca de 744 das 750 horas grátis do Render: mantenha
**só este** serviço Free na conta.

## 4. Admin, jogos e app

1. Admin: no Render, **Shell** não existe no plano Free. Rode no seu PC, dentro de `backend/`,
   apontando para o banco do Supabase:

   ```powershell
   $env:DATABASE_URL = "URI do Supabase"; $env:SECRET_KEY = "qualquer"
   .\.venv\Scripts\python.exe scripts\create_admin.py --email SEU_EMAIL --password SENHA_FORTE --username admin
   ```

2. Jogos: `.\scripts\seed_games.ps1 -BaseUrl https://gamestar-api.onrender.com -Email SEU_EMAIL -Password SENHA_FORTE`
3. App: em `mobile/app.json`, `extra.apiUrl` = `https://gamestar-api.onrender.com`, e gere o APK.

## Limites do plano grátis (para acompanhar)

- Render: 750 h/mês de instância; o serviço pode reiniciar a qualquer momento (nada se perde:
  banco e fotos estão no Supabase).
- Supabase: 500 MB de banco, 1 GB de fotos, 5 GB de tráfego por mês; pausa após 1 semana sem uso.
