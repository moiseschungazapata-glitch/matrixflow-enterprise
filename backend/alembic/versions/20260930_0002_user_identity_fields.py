"""Add DNI and nationality to users.

Revision ID: 20260930_0002
Revises: 20260928_0001
Create Date: 2026-09-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260930_0002"
down_revision: str | None = "20260928_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("dni", sa.String(length=8), nullable=True))
    op.add_column(
        "users",
        sa.Column("nationality", sa.String(length=80), nullable=True),
    )
    op.create_index("ix_users_dni", "users", ["dni"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_dni", table_name="users")
    op.drop_column("users", "nationality")
    op.drop_column("users", "dni")
