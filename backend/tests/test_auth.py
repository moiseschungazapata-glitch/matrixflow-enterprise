from datetime import timedelta

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - registers every SQLAlchemy table
from app.core.config import Settings
from app.core.database import Base, get_db
from app.api.dependencies import require_roles
from app.core.exceptions import AuthenticationError, InvalidTokenError, ResourceNotFoundError
from app.core.security import create_access_token, decode_access_token
from app.main import app
from app.models.user import User
from app.schemas.auth import AuthenticatedUser, DniIdentificationRequest, LoginRequest
from app.schemas.common import UserRole
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
from app.services.user_service import UserService


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def create_user(session: Session, *, status: str = "Activo") -> User:
    response = UserService(session).create(
        UserCreate.model_validate({
            "name": "Ana Torres",
            "dni": "12345678",
            "nationality": "Peruana",
            "email": "admin@matrixflow.pe",
            "password": "demo123",
            "role": "Administrador",
            "status": status,
        })
    )
    user = session.scalar(select(User).where(User.id == response.id))
    assert user is not None
    return user


def test_access_token_round_trip_and_expiration() -> None:
    token = create_access_token(
        user_id=7,
        email="admin@matrixflow.pe",
        role="Administrador",
    )
    payload = decode_access_token(token)

    assert payload.sub == "7"
    assert payload.email == "admin@matrixflow.pe"
    assert payload.role.value == "Administrador"

    expired_token = create_access_token(
        user_id=7,
        email="admin@matrixflow.pe",
        role="Administrador",
        expires_delta=timedelta(seconds=-1),
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(expired_token)

    with pytest.raises(InvalidTokenError):
        decode_access_token(f"{token}alterado")


def test_production_rejects_the_example_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(
            _env_file=None,
            environment="production",
            jwt_secret_key="change-this-secret-before-production",
        )


def test_auth_service_validates_password_and_user_status(session: Session) -> None:
    create_user(session)
    service = AuthService(session)
    response = service.login(
        LoginRequest(email="admin@matrixflow.pe", password="demo123")
    )

    assert response.user.role.value == "Administrador"
    assert service.current_user(response.access_token).email == "admin@matrixflow.pe"

    with pytest.raises(AuthenticationError):
        service.login(
            LoginRequest(email="admin@matrixflow.pe", password="incorrecta")
        )


def test_inactive_user_cannot_login(session: Session) -> None:
    create_user(session, status="Inactivo")

    with pytest.raises(AuthenticationError, match="inactivo"):
        AuthService(session).login(
            LoginRequest(email="admin@matrixflow.pe", password="demo123")
        )


def test_auth_service_identifies_only_active_users_by_dni(session: Session) -> None:
    create_user(session)

    profile = AuthService(session).identify_by_dni(
        DniIdentificationRequest(dni="12345678")
    )

    assert profile.name == "Ana Torres"
    assert profile.masked_dni == "••••5678"
    assert profile.nationality == "Peruana"
    assert profile.role.value == "Administrador"

    with pytest.raises(ResourceNotFoundError):
        AuthService(session).identify_by_dni(
            DniIdentificationRequest(dni="87654321")
        )


def test_role_dependency_allows_only_configured_roles() -> None:
    administrator = AuthenticatedUser(
        id=1,
        name="Ana Torres",
        email="admin@matrixflow.pe",
        role=UserRole.ADMINISTRATOR,
    )
    analyst = administrator.model_copy(update={"role": UserRole.ANALYST})
    administrator_only = require_roles(UserRole.ADMINISTRATOR)

    assert administrator_only(administrator) is administrator
    with pytest.raises(HTTPException) as exc_info:
        administrator_only(analyst)
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_login_and_me_endpoints_use_bearer_authentication(session: Session) -> None:
    create_user(session)

    def override_database():
        yield session

    app.dependency_overrides[get_db] = override_database
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            identity_response = await client.post(
                "/api/v1/auth/identify",
                json={"dni": "12345678"},
            )
            assert identity_response.status_code == 200
            assert identity_response.json() == {
                "name": "Ana Torres",
                "maskedDni": "••••5678",
                "nationality": "Peruana",
                "role": "Administrador",
            }

            rejected_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@matrixflow.pe", "password": "incorrecta"},
            )
            assert rejected_login.status_code == 401
            assert rejected_login.json()["detail"] == "Correo o contraseña incorrectos."
            assert rejected_login.headers["www-authenticate"] == "Bearer"

            login_response = await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@matrixflow.pe", "password": "demo123"},
            )
            assert login_response.status_code == 200
            body = login_response.json()
            assert body["tokenType"] == "bearer"
            assert body["user"]["role"] == "Administrador"

            me_response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {body['accessToken']}"},
            )
            assert me_response.status_code == 200
            assert me_response.json()["email"] == "admin@matrixflow.pe"

            anonymous_response = await client.get("/api/v1/auth/me")
            assert anonymous_response.status_code == 401
            assert anonymous_response.headers["www-authenticate"] == "Bearer"
    finally:
        app.dependency_overrides.clear()
