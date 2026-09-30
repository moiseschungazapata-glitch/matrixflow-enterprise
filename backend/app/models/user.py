from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_dni", "dni", unique=True),
        Index("ix_users_aws_face_id", "aws_face_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    dni: Mapped[str | None] = mapped_column(String(8), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(80), nullable=True)
    aws_face_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    face_enrolled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Activo", nullable=False)

    role_record = relationship("Role", back_populates="users")
    face_verifications = relationship(
        "FaceVerificationAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def role(self) -> str:
        return self.role_record.name

    @property
    def face_enrolled(self) -> bool:
        return self.aws_face_id is not None
