import os
from pathlib import Path
import subprocess
import sys

from sqlalchemy import create_engine, inspect


BACKEND_DIRECTORY = Path(__file__).parents[1]
EXPECTED_TABLES = {
    "audit_logs",
    "branches",
    "categories",
    "companies",
    "face_verification_attempts",
    "inventory",
    "inventory_movements",
    "matrices",
    "matrix_values",
    "operation_inputs",
    "operation_results",
    "operations",
    "products",
    "roles",
    "sale_details",
    "sales",
    "targets",
    "users",
    "vector_values",
    "vectors",
}


def run_alembic(database_url: str, *arguments: str) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": database_url,
            "ENVIRONMENT": "test",
            "AUTO_CREATE_TABLES": "false",
            "SEED_DEMO_USERS": "false",
        }
    )
    return subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_DIRECTORY,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )


def test_initial_migration_creates_and_removes_the_complete_schema(tmp_path) -> None:
    database_path = tmp_path / "migration-round-trip.db"
    database_url = f"sqlite:///{database_path.as_posix()}"

    run_alembic(database_url, "upgrade", "head")

    engine = create_engine(database_url)
    inspector = inspect(engine)
    created_tables = set(inspector.get_table_names())
    assert created_tables == EXPECTED_TABLES | {"alembic_version"}
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    assert {"dni", "nationality", "aws_face_id", "face_enrolled_at"} <= user_columns
    assert any(
        index["name"] == "ix_users_dni" and index["unique"]
        for index in inspector.get_indexes("users")
    )
    assert any(
        index["name"] == "ix_users_aws_face_id" and index["unique"]
        for index in inspector.get_indexes("users")
    )
    engine.dispose()

    run_alembic(database_url, "downgrade", "base")

    engine = create_engine(database_url)
    remaining_tables = set(inspect(engine).get_table_names())
    assert remaining_tables <= {"alembic_version"}
    engine.dispose()
