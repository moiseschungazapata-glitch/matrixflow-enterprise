from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.auth import AuthenticatedUser
from app.schemas.common import APIModel


class FaceSessionCreateRequest(APIModel):
    dni: str = Field(pattern=r"^\d{8}$")


class FaceSessionResponse(APIModel):
    verification_id: str = Field(min_length=36, max_length=36)
    session_id: str = Field(min_length=1)
    region: str = Field(min_length=1)
    expires_at: datetime


class FaceLoginResponse(APIModel):
    verified: Literal[True] = True
    access_token: str = Field(min_length=1)
    token_type: Literal["bearer"] = "bearer"
    user: AuthenticatedUser


class FaceEnrollmentResponse(APIModel):
    user_id: int = Field(gt=0)
    face_enrolled: bool
    enrolled_at: datetime | None = None
