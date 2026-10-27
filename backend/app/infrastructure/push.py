import logging

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushSender:
    """Envia push pela API do Expo. Nunca levanta erro: falha vira log e lista vazia."""

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    async def send(self, tokens: list[str], title: str, body: str, data: dict) -> list[str]:
        """Devolve os tokens que o Expo respondeu como DeviceNotRegistered."""
        if not tokens:
            return []
        messages = [
            {"to": token, "title": title, "body": body, "data": data, "sound": "default"}
            for token in tokens
        ]
        try:
            async with httpx.AsyncClient(timeout=5, transport=self._transport) as http:
                response = await http.post(EXPO_PUSH_URL, json=messages)
                response.raise_for_status()
                tickets = response.json().get("data", [])
            return [
                token
                for token, ticket in zip(tokens, tickets)
                if ticket.get("status") == "error"
                and ticket.get("details", {}).get("error") == "DeviceNotRegistered"
            ]
        except Exception:
            logger.warning("Expo push failed", exc_info=True)
            return []
