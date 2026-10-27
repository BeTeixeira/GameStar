import uuid

from fastapi import APIRouter, Query, status

from app.api.dependencies import ModerationServiceDep, ModeratorUser
from app.api.v1.endpoints.reviews import to_review_response
from app.domain.models.review_report import ReportStatus
from app.domain.schemas.moderation import PendingCount, ReportGroup
from app.domain.schemas.review import ReviewResponse
from app.domain.schemas.user import PublicProfile

router = APIRouter(prefix="/moderation", tags=["moderation"])


@router.get("/reports", response_model=list[ReportGroup])
async def list_reports(
    service: ModerationServiceDep,
    _moderator: ModeratorUser,
    report_status: ReportStatus = Query(ReportStatus.pending, alias="status"),
    q: str | None = Query(None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReportGroup]:
    return await service.list_reports(report_status, q, skip=skip, limit=limit)


@router.get("/reports/pending-count", response_model=PendingCount)
async def pending_count(service: ModerationServiceDep, _moderator: ModeratorUser) -> PendingCount:
    return PendingCount(count=await service.pending_count())


@router.post("/reviews/{review_id}/keep", status_code=status.HTTP_204_NO_CONTENT)
async def keep_review(
    review_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> None:
    """Mantém o comentário: as denúncias pendentes viram "mantidas"."""
    await service.keep(moderator, review_id)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_review(
    review_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> None:
    """Apaga o comentário, fecha as denúncias como "removidas" e avisa o autor."""
    await service.remove_review(moderator, review_id)


@router.get("/reviews/recent", response_model=list[ReviewResponse])
async def recent_reviews(
    service: ModerationServiceDep,
    _moderator: ModeratorUser,
    q: str | None = Query(None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> list[ReviewResponse]:
    reviews = await service.recent_reviews(q, skip=skip, limit=limit)
    return [to_review_response(review) for review in reviews]


@router.post("/users/{user_id}/ban", response_model=PublicProfile)
async def ban_user(
    user_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> PublicProfile:
    return PublicProfile.for_viewer(await service.ban(moderator, user_id), moderator)


@router.post("/users/{user_id}/unban", response_model=PublicProfile)
async def unban_user(
    user_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> PublicProfile:
    return PublicProfile.for_viewer(await service.unban(moderator, user_id), moderator)


@router.post("/users/{user_id}/mute", response_model=PublicProfile)
async def mute_user(
    user_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> PublicProfile:
    return PublicProfile.for_viewer(await service.mute(moderator, user_id), moderator)


@router.post("/users/{user_id}/unmute", response_model=PublicProfile)
async def unmute_user(
    user_id: uuid.UUID, service: ModerationServiceDep, moderator: ModeratorUser
) -> PublicProfile:
    return PublicProfile.for_viewer(await service.unmute(moderator, user_id), moderator)
