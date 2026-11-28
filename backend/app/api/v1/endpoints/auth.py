import logging
import secrets
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.api.dependencies import UserServiceDep
from app.core.config import settings
from app.core.rate_limit import client_ip, enforce, login_limiter
from app.core.security import create_access_token, verify_password
from app.domain.schemas.user import UserCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_USER_URL = "https://api.github.com/user"
_GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GitHubCallbackRequest(BaseModel):
    code: str


@router.post("/token", response_model=TokenResponse)
async def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    user_service: UserServiceDep,
) -> TokenResponse:
    # Por IP + email: limita chute de senha numa conta sem travar testers no mesmo wifi
    enforce(login_limiter, f"{client_ip(request)}|{form.username.strip().lower()}")
    user = await user_service._repo.get_by_email(form.username)  # noqa: SLF001
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user.")
    return TokenResponse(access_token=create_access_token(str(user.id), role=user.role.value))


@router.get("/github/login-url")
async def github_login_url() -> dict[str, str]:
    """Returns the GitHub OAuth authorization URL for the client to redirect to."""
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured.",
        )
    url = (
        f"{_GITHUB_AUTHORIZE_URL}"
        f"?client_id={settings.github_client_id}"
        f"&scope=user:email,read:user"
        f"&redirect_uri={settings.github_redirect_uri}"
    )
    return {"url": url}


async def _exchange_github_code(code: str, user_service: UserServiceDep) -> str:
    """Core logic: exchange GitHub OAuth code for a Gamestar JWT. Returns the raw token string."""
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured.",
        )

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GITHUB_TOKEN_URL,
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        gh_access_token = token_data.get("access_token")
        if not gh_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub OAuth failed: could not retrieve access token.",
            )

        gh_headers = {"Authorization": f"Bearer {gh_access_token}", "Accept": "application/json"}

        user_resp = await client.get(_GITHUB_USER_URL, headers=gh_headers)
        gh_user = user_resp.json()

        email: str | None = gh_user.get("email")
        if not email:
            emails_resp = await client.get(_GITHUB_EMAILS_URL, headers=gh_headers)
            for entry in emails_resp.json():
                if entry.get("primary") and entry.get("verified"):
                    email = entry["email"]
                    break

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve a verified email from GitHub.",
        )

    github_id = str(gh_user["id"])
    login_name: str = gh_user.get("login", email.split("@")[0])

    user = await user_service._repo.get_by_github_id(github_id)  # noqa: SLF001
    if not user:
        user = await user_service._repo.get_by_email(email)  # noqa: SLF001
        if user:
            user.github_id = github_id
            await user_service._repo._session.flush()  # noqa: SLF001
        else:
            username = login_name
            if await user_service._repo.get_by_username(username):  # noqa: SLF001
                username = f"{login_name}_{github_id[:6]}"
            user = await user_service._repo.create(  # noqa: SLF001
                UserCreate(username=username, email=email, password=secrets.token_urlsafe(32))
            )
            user.github_id = github_id
            await user_service._repo._session.flush()  # noqa: SLF001

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user.")

    logger.info("GitHub OAuth login: user_id=%s github_id=%s", user.id, github_id)
    return create_access_token(str(user.id), role=user.role.value)


@router.get("/github/callback")
async def github_callback_redirect(
    user_service: UserServiceDep,
    code: str = Query(..., description="Authorization code from GitHub"),
) -> RedirectResponse:
    """
    GitHub redirects here after the user authorizes the OAuth App.
    Processes the code and redirects to the mobile deep link with the JWT.
    Deep link format: gamestar://auth?token=<JWT>
    """
    token = await _exchange_github_code(code, user_service)
    return RedirectResponse(url=f"gamestar://auth?token={token}", status_code=302)


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback_json(
    body: GitHubCallbackRequest,
    user_service: UserServiceDep,
) -> TokenResponse:
    """
    Alternative: mobile sends the code directly as JSON and receives the JWT.
    Use this when the mobile handles the OAuth redirect itself (custom scheme / expo-auth-session).
    """
    token = await _exchange_github_code(body.code, user_service)
    return TokenResponse(access_token=token)
