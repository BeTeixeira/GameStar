import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentUser, ReviewServiceDep
from app.domain.models.review import Review
from app.domain.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from app.infrastructure.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _to_response(review: Review) -> ReviewResponse:
    resp = ReviewResponse.model_validate(review)
    if review.user is not None:
        resp.username = review.user.username
    return resp


@router.get("/game/{game_id}", response_model=list[ReviewResponse])
async def list_reviews_by_game(
    game_id: uuid.UUID,
    service: ReviewServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReviewResponse]:
    reviews = await service.list_by_game(game_id, skip=skip, limit=limit)
    return [_to_response(r) for r in reviews]


@router.get("/user/{user_id}", response_model=list[ReviewResponse])
async def list_reviews_by_user(
    user_id: uuid.UUID,
    service: ReviewServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReviewResponse]:
    reviews = await service.list_by_user(user_id, skip=skip, limit=limit)
    return [_to_response(r) for r in reviews]


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: uuid.UUID, service: ReviewServiceDep) -> ReviewResponse:
    try:
        review = await service.get_review(review_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _to_response(review)


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    service: ReviewServiceDep,
    current_user_id: CurrentUser,
) -> ReviewResponse:
    review = await service.create_review(uuid.UUID(current_user_id), data)
    return _to_response(review)


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    data: ReviewUpdate,
    service: ReviewServiceDep,
    current_user_id: CurrentUser,
) -> ReviewResponse:
    try:
        review = await service.update_review(review_id, uuid.UUID(current_user_id), data)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return _to_response(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: uuid.UUID,
    service: ReviewServiceDep,
    current_user_id: CurrentUser,
) -> None:
    try:
        await service.delete_review(review_id, uuid.UUID(current_user_id))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
