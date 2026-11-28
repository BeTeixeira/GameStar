# Stage 1: build Python wheels
# unixodbc-dev is required to compile the pyodbc C extension
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY pyproject.toml .

RUN pip install --upgrade pip && \
    python -c "\
import tomllib; \
deps = tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']; \
open('/tmp/reqs.txt','w').write('\n'.join(deps))" && \
    pip wheel --no-cache-dir --wheel-dir /wheels -r /tmp/reqs.txt


# Stage 2: lean runtime image
FROM python:3.11-slim AS runtime

# Microsoft ODBC Driver 18 (só para Azure SQL). Com Postgres (ex.: VM da Oracle, ARM),
# build com --build-arg INSTALL_MSSQL=false: imagem menor e sem depender do pacote da Microsoft.
ARG INSTALL_MSSQL=true
RUN if [ "$INSTALL_MSSQL" = "true" ]; then \
      apt-get update \
      && apt-get install -y --no-install-recommends curl gnupg apt-transport-https \
      && curl https://packages.microsoft.com/keys/microsoft.asc \
         | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
      && curl https://packages.microsoft.com/config/debian/12/prod.list \
         -o /etc/apt/sources.list.d/mssql-release.list \
      && apt-get update \
      && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      apt-get update && apt-get install -y --no-install-recommends unixodbc \
      && rm -rf /var/lib/apt/lists/*; \
    fi

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && rm -rf /wheels

COPY . .

# Pasta das fotos de perfil: em produção recebe um volume (os arquivos sobrevivem a deploys)
RUN mkdir -p /app/uploads && chown appuser:appgroup /app/uploads

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LOG_JSON=true

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
