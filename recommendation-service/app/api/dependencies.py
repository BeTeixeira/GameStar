from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.core.config import Settings
from app.domain.models import ScoringWeights
from app.infrastructure.gamestar_client import GamestarClient
from app.services.recommendation_service import RecommendationService


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_gamestar_client(request: Request) -> GamestarClient:
    return request.app.state.gamestar_client


def get_clock() -> datetime:
    return datetime.now(UTC)


def get_recommendation_service(
    client: Annotated[GamestarClient, Depends(get_gamestar_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RecommendationService:
    weights = ScoringWeights(
        genre=settings.weight_genre,
        friends=settings.weight_friends,
        global_rating=settings.weight_global,
    )
    return RecommendationService(client, weights)


def require_bearer_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization


SettingsDep = Annotated[Settings, Depends(get_settings)]
ClockDep = Annotated[datetime, Depends(get_clock)]
RecommendationServiceDep = Annotated[RecommendationService, Depends(get_recommendation_service)]
BearerTokenDep = Annotated[str, Depends(require_bearer_token)]
