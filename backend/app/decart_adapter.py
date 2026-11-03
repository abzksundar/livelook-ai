from __future__ import annotations

from decart import DecartClient

from .config import settings


class DecartAdapterError(RuntimeError):
    """Raised when a temporary Decart client token cannot be created."""


async def create_client_token() -> dict[str, object]:
    """
    Mint a short-lived Decart client token on the server.

    The permanent API key never leaves FastAPI. The browser receives only
    the temporary `apiKey` returned by the token endpoint.
    """
    api_key = settings.decart_api_key.strip()
    if not api_key:
        raise DecartAdapterError(
            "DECART_API_KEY is not configured. Add it to backend/.env."
        )

    try:
        async with DecartClient(api_key=api_key) as client:
            result = await client.tokens.create(
                expires_in=settings.decart_token_ttl_seconds,
                metadata={"service_tier": settings.decart_service_tier},
            )

        return {
            "apiKey": result.api_key,
            "expiresAt": result.expires_at,
        }
    except Exception as exc:  # SDK can surface provider/network errors here.
        raise DecartAdapterError(
            f"Could not create Decart client token: {exc}"
        ) from exc
