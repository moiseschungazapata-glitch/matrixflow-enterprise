import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.bootstrap import DEMO_USERS, seed_development_users
from app.core.config import BACKEND_DIR, Settings, settings
from app.core.database import Base
from app.main import app
from app.models.user import User


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_health_endpoint() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "matrixflow-api",
    }


@pytest.mark.anyio
async def test_openapi_is_available() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == settings.app_name


@pytest.mark.anyio
async def test_frontend_origin_is_allowed_by_cors() -> None:
    origin = "http://localhost:5173"
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.options(
            "/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


@pytest.mark.anyio
async def test_auth_endpoints_are_published() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "post" in paths["/api/v1/auth/identify"]
    assert "post" in paths["/api/v1/auth/login"]
    assert "get" in paths["/api/v1/auth/me"]


def test_development_bootstrap_seeds_demo_users_idempotently() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    local_session = sessionmaker(bind=engine, expire_on_commit=False)

    seed_development_users(local_session)
    seed_development_users(local_session)

    with Session(engine) as session:
        emails = set(session.scalars(select(User.email)).all())
        count = session.scalar(select(func.count(User.id)))

    assert emails == {str(user.email) for user in DEMO_USERS}
    assert count == len(DEMO_USERS)


def test_relative_sqlite_database_is_anchored_to_backend() -> None:
    local_settings = Settings(
        _env_file=None,
        database_url="sqlite:///./verification.db",
    )

    assert local_settings.database_url == (
        f"sqlite:///{(BACKEND_DIR / 'verification.db').resolve().as_posix()}"
    )


@pytest.mark.parametrize(
    ("database_url", "expected"),
    [
        (
            "postgres://user:secret@db.example.com:5432/matrixflow",
            "postgresql+psycopg://user:secret@db.example.com:5432/matrixflow",
        ),
        (
            "postgresql://user:secret@db.example.com:5432/matrixflow",
            "postgresql+psycopg://user:secret@db.example.com:5432/matrixflow",
        ),
    ],
)
def test_postgresql_urls_use_the_installed_psycopg_driver(
    database_url: str,
    expected: str,
) -> None:
    local_settings = Settings(_env_file=None, database_url=database_url)

    assert local_settings.database_url == expected
