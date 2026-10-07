from fastapi import APIRouter

from app.api.v1.endpoints import auth, friends, games, library, reviews, users

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(games.router)
router.include_router(reviews.router)
router.include_router(library.router)
router.include_router(friends.router)
