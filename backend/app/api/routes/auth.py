from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.schemas.auth import (
    AuthenticatedUser,
    DniIdentificationRequest,
    IdentityProfileResponse,
    LoginRequest,
    LoginResponse,
)
from app.schemas.biometric import (
    FaceLoginResponse,
    FaceSessionCreateRequest,
    FaceSessionResponse,
)
from app.services.auth_service import AuthService
from app.services.face_identity_service import FaceIdentityService


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


@router.post("/face/sessions", response_model=FaceSessionResponse)
def create_face_session(
    data: FaceSessionCreateRequest,
    session: DatabaseSession,
) -> FaceSessionResponse:
    """Create a single-use Rekognition Face Liveness session for a DNI."""

    return FaceIdentityService(session).create_session(data.dni)


@router.post(
    "/face/sessions/{verification_id}/complete",
    response_model=FaceLoginResponse,
)
def complete_face_session(
    verification_id: UUID,
    session: DatabaseSession,
) -> FaceLoginResponse:
    """Validate liveness and facial identity, then issue the application JWT."""

    return FaceIdentityService(session).complete_session(str(verification_id))


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, session: DatabaseSession) -> LoginResponse:
    if not settings.allow_legacy_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El acceso con correo y contraseña está deshabilitado.",
        )
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
