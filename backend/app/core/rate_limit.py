"""Limite de tentativas em memória (janela deslizante), para login e cadastro.

Guarda os horários das últimas tentativas por chave (ex.: IP + email). Serve para
um servidor só; com várias instâncias, cada uma teria o próprio contador.
O IP vem de request.client.host: atrás de proxy (ngrok, Cloudflare Tunnel), o
uvicorn já troca pelo IP real quando o proxy está em --forwarded-allow-ips.
"""

import math
import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import settings


class RateLimiter:
    def __init__(
        self, max_calls: int, window_seconds: float, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str) -> int | None:
        """Registra uma tentativa. Devolve None se liberada, ou os segundos até liberar."""
        now = self._clock()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= now - self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_calls:
                return max(1, math.ceil(hits[0] + self.window_seconds - now))
            hits.append(now)
            if len(self._hits) > 10_000:
                self._prune(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def _prune(self, now: float) -> None:
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= now - self.window_seconds]:
            del self._hits[key]


login_limiter = RateLimiter(max_calls=10, window_seconds=5 * 60)
register_limiter = RateLimiter(max_calls=20, window_seconds=60 * 60)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def enforce(limiter: RateLimiter, key: str) -> None:
    if not settings.rate_limit_enabled:
        return
    retry_after = limiter.hit(key)
    if retry_after is not None:
        minutes = max(1, math.ceil(retry_after / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas. Tente de novo em {minutes} min.",
            headers={"Retry-After": str(retry_after)},
        )
