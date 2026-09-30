from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, EmailStr, Field

from app.schemas.common import APIModel, PositiveId, UserRole


class LoginRequest(APIModel):
    email: EmailStr = Field(validation_alias=AliasChoices("email", "username"))
    password: str = Field(min_length=6, max_length=128)


class DniIdentificationRequest(APIModel):
    dni: str = Field(pattern=r"^\d{8}$")


class IdentityProfileResponse(APIModel):
    name: str = Field(min_length=3, max_length=150)
    masked_dni: str = Field(pattern=r"^••••\d{4}$")
    nationality: str = Field(min_length=2, max_length=80)
    role: UserRole


class AuthenticatedUser(APIModel):
    id: PositiveId
    name: str = Field(min_length=3, max_length=150)
    email: EmailStr
    role: UserRole


class LoginResponse(APIModel):
    access_token: str = Field(min_length=1)
    token_type: Literal["bearer"] = "bearer"
    user: AuthenticatedUser


class TokenPayload(APIModel):
    sub: str = Field(pattern=r"^[1-9]\d*$")
    email: EmailStr
    role: UserRole
    type: Literal["access"]
    iat: datetime
    exp: datetime
    iss: str = Field(min_length=1)
    aud: str = Field(min_length=1)
