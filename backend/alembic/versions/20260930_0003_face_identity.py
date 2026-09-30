"""Add isolated AWS face identity metadata.

Revision ID: 20260930_0003
Revises: 20260930_0002
Create Date: 2026-09-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260930_0003"
down_revision: str | None = "20260930_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("aws_face_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("face_enrolled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_aws_face_id", "users", ["aws_face_id"], unique=True)

    op.create_table(
        "face_verification_attempts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("aws_session_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("liveness_confidence", sa.Float(), nullable=True),
        sa.Column("face_similarity", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("aws_session_id"),
    )
    op.create_index(
        "ix_face_verification_attempts_user_id",
        "face_verification_attempts",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_face_verification_attempts_created_at",
        "face_verification_attempts",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_face_verification_attempts_created_at",
        table_name="face_verification_attempts",
    )
    op.drop_index(
        "ix_face_verification_attempts_user_id",
        table_name="face_verification_attempts",
    )
    op.drop_table("face_verification_attempts")
    op.drop_index("ix_users_aws_face_id", table_name="users")
    op.drop_column("users", "face_enrolled_at")
    op.drop_column("users", "aws_face_id")
