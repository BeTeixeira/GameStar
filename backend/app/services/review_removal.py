from app.domain.models.notification import NotificationType
from app.domain.models.review import Review
from app.domain.models.user import User, UserRole
from app.infrastructure.exceptions import ForbiddenError
from app.services.notification_service import NotificationService


def ensure_can_remove(moderator: User, review: Review) -> None:
    """Moderador não remove comentário de admin ou de outro moderador; admin remove qualquer um."""
    if not moderator.can_moderate:
        raise ForbiddenError("You can only delete your own reviews.")
    if moderator.role != UserRole.admin and review.user.can_moderate:
        raise ForbiddenError("Moderators cannot remove reviews of admins or moderators.")


async def notify_review_removed(notifications: NotificationService, review: Review) -> None:
    await notifications.notify(
        review.user_id,
        NotificationType.review_removed,
        "Comentário removido",
        f"Seu comentário em {review.game.title} foi removido pela moderação.",
        f"/jogo/{review.game_id}",
    )
