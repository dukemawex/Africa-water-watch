"""Application configuration via pydantic-settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aquawatch:changeme@db:5432/aquawatch"
    REDIS_URL: str = "redis://redis:6379/0"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    def validate_production_secrets(self) -> None:
        """Warn loudly if default secret key is used in production."""
        if self.APP_ENV == "production" and self.SECRET_KEY == "dev-secret-key-change-in-production":
            raise ValueError(
                "SECRET_KEY must be changed from the default value in production. "
                "Generate one with: openssl rand -hex 32"
            )

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_PRIMARY_MODEL: str = "google/gemma-3-12b-it:free"
    OPENROUTER_FALLBACK_MODEL: str = "meta-llama/llama-3.1-8b-instruct:free"

    SENTINEL_HUB_CLIENT_ID: str = ""
    SENTINEL_HUB_CLIENT_SECRET: str = ""

    AFRICAS_TALKING_API_KEY: str = ""
    AFRICAS_TALKING_USERNAME: str = "sandbox"
    SMS_SANDBOX: bool = True

    INTERNAL_API_KEY: str = "dev-internal-key"
    FRONTEND_URL: str = "http://localhost:5173"

    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
