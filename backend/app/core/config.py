"""Atlas Finance — Application Configuration"""

import json

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Atlas Finance"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://atlas:atlas@localhost:5432/atlas_finance"

    # Security
    SECRET_KEY: str = "change-this-in-production-use-secret-manager"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # CORS
    # Keep as plain string to avoid pydantic-settings JSON parsing failures
    # when env vars arrive as CSV from deployment tooling.
    CORS_ORIGINS: str = (
        "https://atlasfinance.web.app,"
        "https://atlasfinance.firebaseapp.com,"
        "https://atlas-frontend-7cuu5kzxjq-rj.a.run.app"
    )

    def cors_origins_list(self) -> List[str]:
        raw = (self.CORS_ORIGINS or "").strip()

        if not raw:
            return ["*"]

        if raw.startswith("["):
            try:
                parsed = json.loads(raw.rstrip("="))
                if isinstance(parsed, list):
                    return [
                        str(item).strip().rstrip("=")
                        for item in parsed
                        if str(item).strip()
                    ]
            except json.JSONDecodeError:
                pass

        origins = [
            item.strip().strip('"').rstrip("=")
            for item in raw.split(",")
            if item.strip()
        ]
        # Always allow all Cloud Run service URLs for this project
        return origins + ["https://atlas-frontend-7cuu5kzxjq-rj.a.run.app"]

    # GCP
    GCS_BUCKET_NAME: str = "atlas-finance-uploads"
    GCP_PROJECT_ID: str = ""

    # Import path (local for dev)
    UPLOAD_DIR: str = "/tmp/atlas_uploads"

    # Financial engine
    DEFAULT_TAX_RATE: float = 0.06  # Simples/Presumido default

    # AI Provider
    AI_PROVIDER: str = "mock"  # "openai" | "gemini" | "mock"
    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    AI_MODEL_AUDIT: str = "gpt-4o-2024-08-06"
    AI_MODEL_COPILOT: str = "gpt-4o-2024-08-06"
    AI_MODEL_PRICING: str = "gpt-4o-mini"

    # AI Safety
    AI_RATE_LIMIT_PER_USER_HOUR: int = 10
    AI_MAX_CONTEXT_TOKENS: int = 8000

    # Geospatial
    GOOGLE_PLACES_API_KEY: str | None = None
    GEO_CACHE_TTL_DAYS: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
