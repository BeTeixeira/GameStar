from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "recommendation-service"
    port: int = 8001

    gamestar_api_url: str = "http://localhost:8000/api/v1"
    request_timeout_seconds: float = 10.0
    max_concurrent_requests: int = 10

    weight_genre: float = 0.4
    weight_friends: float = 0.4
    weight_global: float = 0.2
    ranking_min_votes: int = 3

    eureka_enabled: bool = False
    eureka_server_url: str = "http://localhost:8761/eureka"
    eureka_instance_host: str = "localhost"
