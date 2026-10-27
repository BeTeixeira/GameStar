from pydantic_settings import BaseSettings, SettingsConfigDict


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
    access_token_expire_minutes: int = 30

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

    # Push via Expo (desligado nos testes)
    push_enabled: bool = True

    # Pasta onde ficam as fotos e fundos de perfil enviados (servida em /uploads)
    upload_dir: str = "uploads"

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
