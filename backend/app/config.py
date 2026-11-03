from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    frontend_origin: str = "http://localhost:5173"

    decart_api_key: str = ""
    decart_model: str = "lucy-vton-3.5"
    decart_token_ttl_seconds: int = 600
    decart_service_tier: int = 0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
