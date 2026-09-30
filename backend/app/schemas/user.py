from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import APIModel, PositiveId, RecordStatus, UpdateModel, UserRole


class UserCreate(APIModel):
    name: str = Field(min_length=3, max_length=150)
    dni: str | None = Field(default=None, pattern=r"^\d{8}$")
    nationality: str | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: UserRole
    status: RecordStatus = RecordStatus.ACTIVE


class UserUpdate(UpdateModel):
    name: str | None = Field(default=None, min_length=3, max_length=150)
    dni: str | None = Field(default=None, pattern=r"^\d{8}$")
    nationality: str | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: UserRole | None = None
    status: RecordStatus | None = None


class UserResponse(APIModel):
    id: PositiveId
    name: str = Field(min_length=3, max_length=150)
    dni: str | None = Field(default=None, pattern=r"^\d{8}$")
    nationality: str | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr
    role: UserRole
    status: RecordStatus
    face_enrolled: bool
    face_enrolled_at: datetime | None = None
