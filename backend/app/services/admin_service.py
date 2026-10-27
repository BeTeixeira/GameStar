from app.domain.interfaces.admin_stats_repository import AbstractAdminStatsRepository
from app.domain.schemas.admin import ActivityItem, AdminStats

RECENT_ACTIVITY_LIMIT = 5


class AdminService:
    def __init__(self, stats: AbstractAdminStatsRepository) -> None:
        self._stats = stats

    async def get_stats(self) -> AdminStats:
        counts = await self._stats.counts()
        requests = await self._stats.newest_pending_expert_requests(RECENT_ACTIVITY_LIMIT)
        reports = await self._stats.newest_pending_report_groups(RECENT_ACTIVITY_LIMIT)

        activity = [
            ActivityItem(
                kind="expert_request",
                title=f"Pedido de especialista de @{row.username}",
                created_at=row.created_at,
                route=f"/admin/pedido/{row.request_id}",
            )
            for row in requests
        ] + [
            ActivityItem(
                kind="report",
                title=f"Denúncia: comentário de {row.author_name} em {row.game_title}",
                created_at=row.created_at,
                route="/admin/moderacao",
            )
            for row in reports
        ]
        activity.sort(key=lambda item: item.created_at, reverse=True)

        return AdminStats(
            users=counts.users,
            experts=counts.experts,
            moderators=counts.moderators,
            banned=counts.banned,
            muted=counts.muted,
            games=counts.games,
            reviews=counts.reviews,
            pending_expert_requests=counts.pending_expert_requests,
            pending_reports=counts.pending_reports,
            recent_activity=activity[:RECENT_ACTIVITY_LIMIT],
        )
