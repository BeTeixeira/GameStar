from app.core.rate_limit import RateLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_allows_up_to_the_limit_then_blocks() -> None:
    clock = FakeClock()
    limiter = RateLimiter(max_calls=3, window_seconds=60, clock=clock)
    assert [limiter.hit("k") for _ in range(3)] == [None, None, None]
    retry_after = limiter.hit("k")
    assert retry_after is not None and 0 < retry_after <= 60


def test_window_slides_and_frees_the_key() -> None:
    clock = FakeClock()
    limiter = RateLimiter(max_calls=2, window_seconds=60, clock=clock)
    limiter.hit("k")
    limiter.hit("k")
    assert limiter.hit("k") is not None
    clock.now += 61
    assert limiter.hit("k") is None


def test_keys_are_independent() -> None:
    limiter = RateLimiter(max_calls=1, window_seconds=60, clock=FakeClock())
    assert limiter.hit("a") is None
    assert limiter.hit("b") is None
    assert limiter.hit("a") is not None


def test_blocked_attempts_do_not_extend_the_block() -> None:
    clock = FakeClock()
    limiter = RateLimiter(max_calls=1, window_seconds=60, clock=clock)
    limiter.hit("k")
    clock.now += 30
    limiter.hit("k")
    clock.now += 31
    assert limiter.hit("k") is None
