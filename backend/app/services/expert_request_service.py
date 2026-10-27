import logging
import uuid
from datetime import datetime, timezone

from app.domain.interfaces.expert_request_repository import AbstractExpertRequestRepository
from app.domain.interfaces.user_repository import AbstractUserRepository
from app.domain.models.expert_request import ExpertRequest, ExpertRequestStatus
from app.domain.models.notification import NotificationType
from app.domain.models.user import AccountType, User, UserRole
from app.domain.schemas.expert_request import ExpertRequestCreate, ExpertRequestReject
from app.infrastructure.exceptions import BadRequestError, ConflictError, NotFoundError
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ExpertRequestService:
    def __init__(
        self,
        requests: AbstractExpertRequestRepository,
        users: AbstractUserRepository,
        notifications: NotificationService,
    ) -> None:
        self._requests = requests
        self._users = users
        self._notifications = notifications

    async def create(self, user: User, data: ExpertRequestCreate) -> ExpertRequest:
        if user.role != UserRole.user or user.is_expert:
            raise BadRequestError("Only regular non-expert accounts can request expert status.")
        if await self._requests.has_pending(user.id):
            raise ConflictError("You already have a pending request.")
        request = await self._requests.add(
            ExpertRequest(
                user_id=user.id,
                expertise_area=data.expertise_area,
                company=data.company,
                link=data.link,
                message=data.message,
            )
        )
        logger.info("Expert request created: id=%s user=%s", request.id, user.id)
        return request

    async def latest_for(self, user: User) -> ExpertRequest | None:
        return await self._requests.get_latest_for_user(user.id)

    async def list_requests(
        self, status: ExpertRequestStatus | None, *, skip: int = 0, limit: int = 20
    ) -> list[ExpertRequest]:
        return await self._requests.list_filtered(status, skip=skip, limit=limit)

    async def get(self, request_id: uuid.UUID) -> ExpertRequest:
        request = await self._requests.get_by_id(request_id)
        if not request:
            raise NotFoundError("ExpertRequest", request_id)
        return request

    async def _get_pending(self, request_id: uuid.UUID) -> ExpertRequest:
        request = await self.get(request_id)
        if request.status != ExpertRequestStatus.pending:
            raise ConflictError("This request has already been decided.")
        return request

    async def approve(self, admin: User, request_id: uuid.UUID) -> ExpertRequest:
        request = await self._get_pending(request_id)
        user = await self._users.get_by_id(request.user_id)
        if user is None or user.is_expert or user.role != UserRole.user or not user.is_active:
            raise BadRequestError("The requester is no longer eligible to become an expert.")
        await self._users.set_field(user, "account_type", AccountType.especialista)
        await self._users.set_field(user, "expertise_area", request.expertise_area)
        await self._users.set_field(user, "company", request.company)
        self._mark_decided(request, ExpertRequestStatus.approved, admin)
        saved = await self._requests.save(request)
        await self._notifications.notify(
            user.id,
            NotificationType.expert_request_approved,
            "Pedido aprovado",
            "Agora você é especialista no GameStar.",
            "/perfil",
        )
        logger.info("Expert request approved: id=%s by=%s", request_id, admin.id)
        return saved

    async def reject(
        self, admin: User, request_id: uuid.UUID, data: ExpertRequestReject
    ) -> ExpertRequest:
        request = await self._get_pending(request_id)
        request.rejection_reason = data.reason
        self._mark_decided(request, ExpertRequestStatus.rejected, admin)
        saved = await self._requests.save(request)
        await self._notifications.notify(
            request.user_id,
            NotificationType.expert_request_rejected,
            "Pedido recusado",
            f"Motivo: {data.reason}",
            "/perfil",
        )
        logger.info("Expert request rejected: id=%s by=%s", request_id, admin.id)
        return saved

    @staticmethod
    def _mark_decided(request: ExpertRequest, status: ExpertRequestStatus, admin: User) -> None:
        request.status = status
        request.decided_by_id = admin.id
        request.decided_at = datetime.now(timezone.utc)
