from app.domain.interfaces.admin_stats_repository import AbstractAdminStatsRepository
from app.domain.interfaces.expert_request_repository import AbstractExpertRequestRepository
from app.domain.interfaces.follow_repository import AbstractFollowRepository
from app.domain.interfaces.friendship_repository import AbstractFriendshipRepository
from app.domain.interfaces.game_repository import AbstractGameRepository
from app.domain.interfaces.library_repository import AbstractLibraryRepository
from app.domain.interfaces.review_report_repository import AbstractReviewReportRepository
from app.domain.interfaces.review_repository import AbstractReviewRepository
from app.domain.interfaces.user_repository import AbstractUserRepository

__all__ = [
    "AbstractUserRepository",
    "AbstractGameRepository",
    "AbstractReviewRepository",
    "AbstractReviewReportRepository",
    "AbstractLibraryRepository",
    "AbstractFriendshipRepository",
    "AbstractFollowRepository",
    "AbstractExpertRequestRepository",
    "AbstractAdminStatsRepository",
]
