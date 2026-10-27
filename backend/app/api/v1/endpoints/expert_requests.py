import uuid

from fastapi import APIRouter, Query, status

from app.api.dependencies import AdminUser, CurrentUserFull, ExpertRequestServiceDep
from app.domain.models.expert_request import ExpertRequestStatus
from app.domain.schemas.expert_request import (
    ExpertRequestCreate,
    ExpertRequestReject,
    ExpertRequestResponse,
)

router = APIRouter(prefix="/expert-requests", tags=["expert-requests"])


@router.post("", response_model=ExpertRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    data: ExpertRequestCreate, service: ExpertRequestServiceDep, user: CurrentUserFull
):
    return await service.create(user, data)


@router.get("/me", response_model=ExpertRequestResponse | None)
async def my_request(service: ExpertRequestServiceDep, user: CurrentUserFull):
    return await service.latest_for(user)


@router.get("", response_model=list[ExpertRequestResponse])
async def list_requests(
    service: ExpertRequestServiceDep,
    _admin: AdminUser,
    request_status: ExpertRequestStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return await service.list_requests(request_status, skip=skip, limit=limit)


@router.get("/{request_id}", response_model=ExpertRequestResponse)
async def get_request(request_id: uuid.UUID, service: ExpertRequestServiceDep, _admin: AdminUser):
    return await service.get(request_id)


@router.post("/{request_id}/approve", response_model=ExpertRequestResponse)
async def approve_request(
    request_id: uuid.UUID, service: ExpertRequestServiceDep, admin: AdminUser
):
    return await service.approve(admin, request_id)


@router.post("/{request_id}/reject", response_model=ExpertRequestResponse)
async def reject_request(
    request_id: uuid.UUID,
    data: ExpertRequestReject,
    service: ExpertRequestServiceDep,
    admin: AdminUser,
):
    return await service.reject(admin, request_id, data)
