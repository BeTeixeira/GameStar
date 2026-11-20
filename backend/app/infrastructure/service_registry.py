import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)


async def register_instance(settings: Settings) -> bool:
    """Registra a API no Eureka para o gateway encontrá-la como GAMESTAR-API."""
    if not settings.eureka_enabled:
        return False

    from py_eureka_client import eureka_client

    base_url = f"http://{settings.eureka_instance_host}:{settings.eureka_instance_port}"
    await eureka_client.init_async(
        eureka_server=settings.eureka_server_url,
        app_name=settings.eureka_app_name,
        instance_host=settings.eureka_instance_host,
        instance_port=settings.eureka_instance_port,
        health_check_url=f"{base_url}/health",
        status_page_url=f"{base_url}/docs",
        home_page_url=base_url,
    )
    logger.info(
        "Registered %s in Eureka at %s", settings.eureka_app_name, settings.eureka_server_url
    )
    return True


async def unregister_instance(registered: bool) -> None:
    if not registered:
        return

    from py_eureka_client import eureka_client

    await eureka_client.stop_async()
