import sys
import types
from typing import Any

import pytest

from app.core.config import settings
from app.infrastructure.service_registry import register_instance, unregister_instance


@pytest.fixture
def fake_eureka(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    calls: dict[str, Any] = {}

    async def init_async(**kwargs: Any) -> None:
        calls["init"] = kwargs

    async def stop_async() -> None:
        calls["stopped"] = True

    module = types.ModuleType("py_eureka_client.eureka_client")
    module.init_async = init_async  # type: ignore[attr-defined]
    module.stop_async = stop_async  # type: ignore[attr-defined]
    package = types.ModuleType("py_eureka_client")
    package.eureka_client = module  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "py_eureka_client", package)
    monkeypatch.setitem(sys.modules, "py_eureka_client.eureka_client", module)
    return calls


async def test_registration_is_skipped_when_eureka_is_disabled(
    fake_eureka: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "eureka_enabled", False)

    assert await register_instance(settings) is False
    assert fake_eureka == {}


async def test_registration_announces_gamestar_api_with_health_check(
    fake_eureka: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "eureka_enabled", True)
    monkeypatch.setattr(settings, "eureka_server_url", "http://eureka.test:8761/eureka")
    monkeypatch.setattr(settings, "eureka_instance_host", "gamestar-api")
    monkeypatch.setattr(settings, "eureka_instance_port", 8000)

    assert await register_instance(settings) is True
    assert fake_eureka["init"]["eureka_server"] == "http://eureka.test:8761/eureka"
    assert fake_eureka["init"]["app_name"] == "gamestar-api"
    assert fake_eureka["init"]["instance_port"] == 8000
    assert fake_eureka["init"]["health_check_url"] == "http://gamestar-api:8000/health"


async def test_unregister_only_stops_a_registered_client(fake_eureka: dict[str, Any]) -> None:
    await unregister_instance(registered=False)
    assert "stopped" not in fake_eureka

    await unregister_instance(registered=True)
    assert fake_eureka["stopped"] is True
