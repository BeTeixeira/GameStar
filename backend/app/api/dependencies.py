import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.domain.models.user import User, UserRole
from app.infrastructure.database import get_db_session
from app.infrastructure.push import PushSender
from app.infrastructure.repositories import (
    FollowRepository,
    FriendshipRepository,
    GameRepository,
    LibraryRepository,
    NotificationRepository,
    ReviewReportRepository,
    ReviewRepository,
    UserRepository,
)
from app.services import (
    FollowService,
    FriendshipService,
    GameService,
    LibraryService,
    ModerationService,
    NotificationService,
    ReviewService,
    UserService,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


def get_user_service(session: DbSession) -> UserService:
    return UserService(UserRepository(session))


def get_game_service(session: DbSession) -> GameService:
    return GameService(GameRepository(session))


def get_library_service(session: DbSession) -> LibraryService:
    return LibraryService(LibraryRepository(session), GameRepository(session))


def get_notification_service(session: DbSession) -> NotificationService:
    return NotificationService(NotificationRepository(session), PushSender())


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]


def get_friendship_service(
    session: DbSession, notifications: NotificationServiceDep
) -> FriendshipService:
    return FriendshipService(FriendshipRepository(session), UserRepository(session), notifications)


def get_follow_service(session: DbSession, notifications: NotificationServiceDep) -> FollowService:
    return FollowService(FollowRepository(session), UserRepository(session), notifications)


def get_moderation_service(
    session: DbSession, notifications: NotificationServiceDep
) -> ModerationService:
    return ModerationService(
        ReviewReportRepository(session),
        ReviewRepository(session),
        UserRepository(session),
        notifications,
    )


ModerationServiceDep = Annotated[ModerationService, Depends(get_moderation_service)]


def get_review_service(
    session: DbSession, notifications: NotificationServiceDep, moderation: ModerationServiceDep
) -> ReviewService:
    return ReviewService(
        ReviewRepository(session), notifications, moderation_hook=moderation.on_review_removed
    )


ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
GameServiceDep = Annotated[GameService, Depends(get_game_service)]
LibraryServiceDep = Annotated[LibraryService, Depends(get_library_service)]
FriendshipServiceDep = Annotated[FriendshipService, Depends(get_friendship_service)]
FollowServiceDep = Annotated[FollowService, Depends(get_follow_service)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    user_service: UserServiceDep,
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise credentials_exc
    except ValueError:
        raise credentials_exc

    user = await user_service.get_user_or_none(uuid.UUID(user_id))
    if not user or not user.is_active:
        raise credentials_exc
    return user


async def get_current_user_id(
    current_user: Annotated[User, Depends(get_current_user)],
) -> str:
    return str(current_user.id)


async def get_current_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )
    return current_user


async def get_current_moderator_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.can_moderate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator access required.",
        )
    return current_user


CurrentUser = Annotated[str, Depends(get_current_user_id)]
CurrentUserFull = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_current_admin_user)]
ModeratorUser = Annotated[User, Depends(get_current_moderator_user)]
