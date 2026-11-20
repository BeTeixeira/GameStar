from fastapi import APIRouter, Query

from app.api.dependencies import (
    BearerTokenDep,
    ClockDep,
    RecommendationServiceDep,
    SettingsDep,
)
from app.api.schemas import HealthResponse, RankingResponse, RecommendationResponse

health_router = APIRouter(tags=["health"])
router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@health_router.get("/health", response_model=HealthResponse)
async def health(settings: SettingsDep) -> HealthResponse:
    return HealthResponse(status="UP", service=settings.app_name)


@router.get("/me", response_model=list[RecommendationResponse])
async def my_recommendations(
    service: RecommendationServiceDep,
    authorization: BearerTokenDep,
    limit: int = Query(10, ge=1, le=50),
) -> list[RecommendationResponse]:
    scored = await service.recommend_for_user(authorization, limit)
    return [RecommendationResponse.from_domain(item) for item in scored]


@router.get("/games/{game_id}/similar", response_model=list[RecommendationResponse])
async def similar_games(
    game_id: str,
    service: RecommendationServiceDep,
    limit: int = Query(5, ge=1, le=50),
) -> list[RecommendationResponse]:
    scored = await service.similar_to(game_id, limit)
    return [RecommendationResponse.from_domain(item) for item in scored]


@router.get("/rankings", response_model=list[RankingResponse])
async def rankings(
    service: RecommendationServiceDep,
    settings: SettingsDep,
    now: ClockDep,
    days: int | None = Query(None, ge=1, le=365),
    min_votes: int | None = Query(None, ge=0, le=100),
    limit: int = Query(10, ge=1, le=50),
) -> list[RankingResponse]:
    effective_min_votes = settings.ranking_min_votes if min_votes is None else min_votes
    ranked = await service.ranking(now=now, days=days, min_votes=effective_min_votes, limit=limit)
    return [RankingResponse.from_domain(item) for item in ranked]
