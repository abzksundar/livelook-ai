from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .decart_adapter import DecartAdapterError, create_client_token

app = FastAPI(
    title="livelook.ai API",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "ai-live-virtual-try-on",
        "provider": "decart",
        "model": settings.decart_model,
        "api_key_configured": bool(settings.decart_api_key.strip()),
    }


@app.post("/api/decart/token", response_model=None)
async def decart_token() -> dict[str, object] | JSONResponse:
    try:
        return await create_client_token()
    except DecartAdapterError as exc:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": str(exc),
            },
        )
