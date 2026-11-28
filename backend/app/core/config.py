from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """O Supabase/Render dão "postgresql://..."; a API usa o driver async (asyncpg)."""
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix) :]
    return url



class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    app_debug: bool = False
    cors_allow_origins: str = "http://localhost:8081,http://localhost:19006"
    secret_key: str
    algorithm: str = "HS256"
    # 7 dias: no alpha o app fica logado sem pedir senha toda hora
    access_token_expire_minutes: int = 7 * 24 * 60
    # Limite de tentativas no login e no cadastro (app/core/rate_limit.py)
    rate_limit_enabled: bool = True

    # Database
    database_url: str

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    # Local: http://localhost:8000/api/v1/auth/github/callback
    # Produção: https://webappb-cuf4gxhvh6hmb0h3.chilecentral-01.azurewebsites.net/api/v1/auth/github/callback
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/github/callback"

    # Logging
    log_level: str = "INFO"
    log_json: bool = False  # True in production for CloudWatch/GCP ingestion

    # Supabase Storage (produção): fotos de perfil num bucket público. Vazio = disco local.
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket: str = "profile-images"

    # Sentry (opcional): sem DSN, nada é enviado
    sentry_dsn: str = ""

    # Push via Expo (desligado nos testes)
    push_enabled: bool = True

    # Pasta onde ficam as fotos e fundos de perfil enviados (servida em /uploads)
    upload_dir: str = "uploads"

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, value: str) -> str:
        return normalize_database_url(value)

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


_DEMO_SECRET_KEY = "demo-secret-key-troque-em-producao"


def _validate_production_secret(settings: Settings) -> None:
    if settings.app_env == "production" and (
        settings.secret_key == _DEMO_SECRET_KEY or not settings.secret_key
    ):
        raise RuntimeError(
            "SECRET_KEY ausente ou ainda com o valor de demonstração. "
            "Gere uma chave real (ex.: `python -c \"import secrets; print(secrets.token_hex(32))\"`) "
            "e defina SECRET_KEY no ambiente de produção antes de iniciar a API."
        )


settings = Settings()  # type: ignore[call-arg]
_validate_production_secret(settings)
