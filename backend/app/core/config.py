"""Atlas Finance — Application Configuration"""
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
    CORS_ORIGINS: List[str] = [
        "https://atlasfinance.web.app",
        "https://atlasfinance.firebaseapp.com",
        "https://atlas-frontend-7cuu5kzxjq-rj.a.run.app",
    ]

    # GCP
    GCS_BUCKET_NAME: str = "atlas-finance-uploads"
    GCP_PROJECT_ID: str = ""

    # Import path (local for dev)
    UPLOAD_DIR: str = "/tmp/atlas_uploads"

    # Financial engine
    DEFAULT_TAX_RATE: float = 0.06  # Simples/Presumido default


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
