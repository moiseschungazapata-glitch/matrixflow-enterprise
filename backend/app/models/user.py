from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    dni: Mapped[str | None] = mapped_column(String(8), unique=True, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(80), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Activo", nullable=False)

    role_record = relationship("Role", back_populates="users")

    @property
    def role(self) -> str:
        return self.role_record.name
