from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.exceptions import AuthenticationError
from app.schemas.auth import (
    AuthenticatedUser,
    DniIdentificationRequest,
    IdentityProfileResponse,
    LoginRequest,
    LoginResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/identify", response_model=IdentityProfileResponse)
def identify_by_dni(
    data: DniIdentificationRequest,
    session: DatabaseSession,
) -> IdentityProfileResponse:
    """Locate an active MatrixFlow account by its registered DNI."""

    return AuthService(session).identify_by_dni(data)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, session: DatabaseSession) -> LoginResponse:
    try:
        return AuthService(session).login(data)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@router.get("/me", response_model=AuthenticatedUser)
def get_authenticated_user(current_user: CurrentUser) -> AuthenticatedUser:
    return current_user
