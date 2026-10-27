import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.interfaces.expert_request_repository import AbstractExpertRequestRepository
from app.domain.models.expert_request import ExpertRequest, ExpertRequestStatus


class ExpertRequestRepository(AbstractExpertRequestRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, request: ExpertRequest) -> ExpertRequest:
        self._session.add(request)
        await self._session.flush()
        await self._session.refresh(request)
        return request

    async def get_by_id(self, request_id: uuid.UUID) -> ExpertRequest | None:
        result = await self._session.execute(
            select(ExpertRequest)
            .where(ExpertRequest.id == request_id)
            .execution_options(populate_existing=True)
        )
        return result.unique().scalar_one_or_none()

    async def get_latest_for_user(self, user_id: uuid.UUID) -> ExpertRequest | None:
        result = await self._session.execute(
            select(ExpertRequest)
            .where(ExpertRequest.user_id == user_id)
            .order_by(ExpertRequest.created_at.desc(), ExpertRequest.id)
            .limit(1)
            .execution_options(populate_existing=True)
        )
        return result.unique().scalar_one_or_none()

    async def has_pending(self, user_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            select(ExpertRequest.id)
            .where(
                ExpertRequest.user_id == user_id,
                ExpertRequest.status == ExpertRequestStatus.pending,
            )
            .limit(1)
        )
        return result.first() is not None

    async def list_filtered(
        self, status: ExpertRequestStatus | None, *, skip: int, limit: int
    ) -> list[ExpertRequest]:
        statement = select(ExpertRequest)
        if status is not None:
            statement = statement.where(ExpertRequest.status == status)
        result = await self._session.execute(
            statement.order_by(ExpertRequest.created_at.desc(), ExpertRequest.id)
            .offset(skip)
            .limit(limit)
            .execution_options(populate_existing=True)
        )
        return list(result.unique().scalars().all())

    async def save(self, request: ExpertRequest) -> ExpertRequest:
        await self._session.flush()
        await self._session.refresh(request)
        return request
