from fastapi import APIRouter

from app.api.dependencies import AdminServiceDep, AdminUser
from app.domain.schemas.admin import AdminStats

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def get_stats(service: AdminServiceDep, _: AdminUser):
    return await service.get_stats()
