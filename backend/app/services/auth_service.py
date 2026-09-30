from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, ResourceNotFoundError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthenticatedUser,
    DniIdentificationRequest,
    IdentityProfileResponse,
    LoginRequest,
    LoginResponse,
)
from app.schemas.common import RecordStatus


_DUMMY_PASSWORD_HASH = hash_password("dummy-password-not-used")


class AuthService:
    def __init__(self, session: Session) -> None:
        self.users = UserRepository(session)

    def login(self, data: LoginRequest) -> LoginResponse:
        user = self.users.get_by_email(str(data.email))
        password_hash = (
            user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
        )
        password_is_valid = verify_password(data.password, password_hash)

        if user is None or not password_is_valid:
            raise AuthenticationError("Correo o contraseña incorrectos.")
        self._ensure_active(user)

        authenticated_user = self._response(user)
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=authenticated_user.role,
        )
        return LoginResponse(access_token=access_token, user=authenticated_user)

    def identify_by_dni(self, data: DniIdentificationRequest) -> IdentityProfileResponse:
        user = self.users.get_by_dni(data.dni)
        if user is None or user.status != RecordStatus.ACTIVE.value:
            raise ResourceNotFoundError("No se encontró una cuenta activa con ese DNI.")

        return IdentityProfileResponse(
            name=user.name,
            masked_dni=f"••••{data.dni[-4:]}",
            nationality=user.nationality or "No registrada",
            role=user.role,
        )

    def current_user(self, token: str) -> AuthenticatedUser:
        payload = decode_access_token(token)
        user = self.users.get_by_id(int(payload.sub))
        if user is None or user.email.lower() != str(payload.email).lower():
            raise AuthenticationError("El usuario del token ya no existe.")
        self._ensure_active(user)
        return self._response(user)

    @staticmethod
    def _ensure_active(user: User) -> None:
        if user.status != RecordStatus.ACTIVE.value:
            raise AuthenticationError("El usuario está inactivo.")

    @staticmethod
    def _response(user: User) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
        )
