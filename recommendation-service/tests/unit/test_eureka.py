import sys
import types
from typing import Any

import pytest

from app.core.config import Settings
from app.infrastructure.eureka import register_instance, unregister_instance


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


async def test_disabled_eureka_skips_registration(fake_eureka: dict[str, Any]) -> None:
    registered = await register_instance(Settings(eureka_enabled=False, _env_file=None))

    assert registered is False
    assert fake_eureka == {}


async def test_enabled_eureka_registers_with_health_check(fake_eureka: dict[str, Any]) -> None:
    settings = Settings(
        eureka_enabled=True,
        eureka_server_url="http://eureka.test:8761/eureka",
        eureka_instance_host="recommendation",
        port=8001,
        _env_file=None,
    )

    registered = await register_instance(settings)

    assert registered is True
    assert fake_eureka["init"]["eureka_server"] == "http://eureka.test:8761/eureka"
    assert fake_eureka["init"]["app_name"] == "recommendation-service"
    assert fake_eureka["init"]["instance_port"] == 8001
    assert fake_eureka["init"]["health_check_url"] == "http://recommendation:8001/health"


async def test_unregister_stops_client_only_when_registered(fake_eureka: dict[str, Any]) -> None:
    await unregister_instance(registered=False)
    assert "stopped" not in fake_eureka

    await unregister_instance(registered=True)
    assert fake_eureka["stopped"] is True
