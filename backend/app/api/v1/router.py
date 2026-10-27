from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    expert_requests,
    friends,
    games,
    library,
    moderation,
    notifications,
    reviews,
    users,
)

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(games.router)
router.include_router(reviews.router)
router.include_router(library.router)
router.include_router(friends.router)
router.include_router(notifications.router)
router.include_router(moderation.router)
router.include_router(expert_requests.router)
