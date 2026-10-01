"""Read-only comparison of the configured database with SQLAlchemy models."""

import json

from sqlalchemy import create_engine, inspect

import app.models  # noqa: F401 - register all model tables
from app.core.config import settings
from app.core.database import Base


def main() -> None:
    engine = create_engine(settings.database_url)
    try:
        with engine.connect() as connection:
            inspector = inspect(connection)
            schema = "public" if engine.dialect.name == "postgresql" else None
            actual_tables = set(inspector.get_table_names(schema=schema))
            expected_tables = set(Base.metadata.tables)
            common = expected_tables & actual_tables
            missing_columns = {}
            extra_columns = {}
            for name in sorted(common):
                expected = set(Base.metadata.tables[name].columns.keys())
                actual = {column["name"] for column in inspector.get_columns(name, schema=schema)}
                if expected - actual:
                    missing_columns[name] = sorted(expected - actual)
                if actual - expected:
                    extra_columns[name] = sorted(actual - expected)
            result = {
                "missing_tables": sorted(expected_tables - actual_tables),
                "extra_tables": sorted(actual_tables - expected_tables - {"alembic_version"}),
                "missing_columns": missing_columns,
                "extra_columns": extra_columns,
                "note": "Extra no significa prescindible. Esta comprobación no modifica datos ni esquema.",
            }
            print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
