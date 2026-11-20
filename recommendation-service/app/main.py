from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.api.routes import health_router, router
from app.core.config import Settings
from app.infrastructure.eureka import register_instance, unregister_instance
from app.infrastructure.gamestar_client import (
    GamestarClient,
    UpstreamNotFoundError,
    UpstreamUnauthorizedError,
    UpstreamUnavailableError,
)
from app.services.recommendation_service import GameNotFoundError

ERROR_STATUS: dict[type[Exception], int] = {
    UpstreamUnauthorizedError: status.HTTP_401_UNAUTHORIZED,
    UpstreamNotFoundError: status.HTTP_404_NOT_FOUND,
    GameNotFoundError: status.HTTP_404_NOT_FOUND,
    UpstreamUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(
            base_url=resolved_settings.gamestar_api_url,
            timeout=resolved_settings.request_timeout_seconds,
        ) as http:
            app.state.gamestar_client = GamestarClient(
                http, max_concurrent_requests=resolved_settings.max_concurrent_requests
            )
            registered = await register_instance(resolved_settings)
            try:
                yield
            finally:
                await unregister_instance(registered)

    app = FastAPI(
        title="Gamestar Recommendation Service",
        description="Recomendações de jogos, jogos similares e rankings do Gamestar.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings

    async def handle_known_error(_: Request, error: Exception) -> JSONResponse:
        return JSONResponse(status_code=ERROR_STATUS[type(error)], content={"detail": str(error)})

    for error_type in ERROR_STATUS:
        app.add_exception_handler(error_type, handle_known_error)

    app.include_router(health_router)
    app.include_router(router)
    return app


app = create_app()
