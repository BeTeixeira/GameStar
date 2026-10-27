import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentUserFull, ModerationServiceDep, ReviewServiceDep
from app.domain.models.review import Review
from app.domain.schemas.moderation import ReportCreate
from app.domain.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from app.infrastructure.exceptions import BadRequestError, ForbiddenError, NotFoundError

router = APIRouter(prefix="/reviews", tags=["reviews"])


def to_review_response(review: Review) -> ReviewResponse:
    resp = ReviewResponse.model_validate(review)
    if review.user is not None:
        resp.username = review.user.username
        resp.display_name = review.user.display_name
        resp.is_expert = review.user.is_expert
        resp.expertise_area = review.user.expertise_area
    if review.game is not None:
        resp.game_title = review.game.title
        resp.game_cover_url = review.game.cover_image_url
    return resp


@router.get("/game/{game_id}", response_model=list[ReviewResponse])
async def list_reviews_by_game(
    game_id: uuid.UUID,
    service: ReviewServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReviewResponse]:
    reviews = await service.list_by_game(game_id, skip=skip, limit=limit)
    return [to_review_response(r) for r in reviews]


@router.get("/user/{user_id}", response_model=list[ReviewResponse])
async def list_reviews_by_user(
    user_id: uuid.UUID,
    service: ReviewServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReviewResponse]:
    reviews = await service.list_by_user(user_id, skip=skip, limit=limit)
    return [to_review_response(r) for r in reviews]


@router.get("/game/{game_id}/my-reports", response_model=list[uuid.UUID])
async def my_reports_by_game(
    game_id: uuid.UUID, service: ModerationServiceDep, current_user: CurrentUserFull
) -> list[uuid.UUID]:
    """Ids das avaliações deste jogo que o usuário logado já denunciou."""
    return await service.my_reported_review_ids(current_user, game_id)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: uuid.UUID, service: ReviewServiceDep) -> ReviewResponse:
    try:
        review = await service.get_review(review_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return to_review_response(review)


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    service: ReviewServiceDep,
    current_user: CurrentUserFull,
) -> ReviewResponse:
    try:
        review = await service.create_review(current_user, data)
    except BadRequestError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return to_review_response(review)


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    data: ReviewUpdate,
    service: ReviewServiceDep,
    current_user: CurrentUserFull,
) -> ReviewResponse:
    try:
        review = await service.update_review(review_id, current_user, data)
    except BadRequestError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return to_review_response(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: uuid.UUID,
    service: ReviewServiceDep,
    current_user: CurrentUserFull,
) -> None:
    """Autor apaga a própria avaliação; admin/moderador apaga outras (moderação)."""
    try:
        await service.delete_review(review_id, current_user)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/{review_id}/report", status_code=status.HTTP_204_NO_CONTENT)
async def report_review(
    review_id: uuid.UUID,
    data: ReportCreate,
    service: ModerationServiceDep,
    current_user: CurrentUserFull,
) -> None:
    """Denuncia um comentário à moderação (denunciar de novo não cria outra denúncia)."""
    await service.report(current_user, review_id, data.reason)
