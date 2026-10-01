from __future__ import annotations

from app.core.config import settings
from app.core.database import initialize_database_schema


def prepare_development_database() -> None:
    """Prepare a local database only when the application runs in development."""

    if settings.environment.lower() != "development":
        return
    if settings.auto_create_tables:
        initialize_database_schema()
