from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEVELOPMENT_JWT_SECRETS = {
    "development-only-change-me-please-32",
    "change-this-secret-before-production",
}


class Settings(BaseSettings):
    app_name: str = "MatrixFlow Enterprise API"
    app_version: str = "1.0.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./matrixflow.db"
    auto_create_tables: bool = True
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    cors_allow_credentials: bool = True
    jwt_secret_key: str = Field(
        default="development-only-change-me-please-32",
        min_length=32,
    )
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "matrixflow-enterprise"
    jwt_audience: str = "matrixflow-frontend"
    access_token_expire_minutes: int = Field(default=60, gt=0, le=1440)
    allow_legacy_login: bool = True
    aws_face_liveness_enabled: bool = False
    aws_region: str = "us-east-1"
    aws_rekognition_collection_id: str = "matrixflow-users"
    face_liveness_threshold: float = Field(default=90.0, ge=0, le=100)
    face_match_threshold: float = Field(default=95.0, ge=0, le=100)
    face_verification_expire_minutes: int = Field(default=3, ge=1, le=3)
    face_max_attempts: int = Field(default=5, ge=1, le=10)
    face_attempt_window_minutes: int = Field(default=30, ge=3, le=120)

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Normalize supported database URLs for local and hosted environments."""

        prefix = "sqlite:///./"
        if value.startswith(prefix):
            relative_path = value.removeprefix(prefix)
            database_path = (BACKEND_DIR / relative_path).resolve()
            return f"sqlite:///{database_path.as_posix()}"
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def reject_development_secret_in_production(self):
        if (
            self.environment.lower() == "production"
            and self.jwt_secret_key in DEVELOPMENT_JWT_SECRETS
        ):
            raise ValueError("JWT_SECRET_KEY debe cambiarse en producción.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
