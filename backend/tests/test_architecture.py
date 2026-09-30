from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from httpx import ASGITransport, AsyncClient
from sqlalchemy import String, create_engine
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.database import Base
from app.main import app
from app.repositories.base import BaseRepository


class RepositoryProbe(Base):
    __tablename__ = "repository_probes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)


def test_alembic_has_a_single_initial_head() -> None:
    backend_directory = Path(__file__).parents[1]
    config = Config(str(backend_directory / "alembic.ini"))
    scripts = ScriptDirectory.from_config(config)

    assert scripts.get_heads() == ["20260930_0002"]


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def test_base_repository_crud_without_implicit_commit() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine, tables=[RepositoryProbe.__table__])

    with Session(engine) as session:
        repository = BaseRepository(session, RepositoryProbe)
        created = repository.add(RepositoryProbe(name="Inicial"))

        assert created.id is not None
        assert repository.get_by_id(created.id) is created
        assert [item.name for item in repository.list()] == ["Inicial"]

        repository.update(created, {"name": "Actualizado"})
        assert repository.get_by_id(created.id).name == "Actualizado"

        repository.delete(created)
        assert repository.get_by_id(created.id) is None


@pytest.mark.anyio
async def test_versioned_api_routes_keep_the_expected_urls() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/openapi.json")

    paths = response.json()["paths"]
    required_operations = {
        "/api/v1/auth/identify": {"post"},
        "/api/v1/auth/login": {"post"},
        "/api/v1/companies": {"get"},
        "/api/v1/branches": {"get"},
        "/api/v1/products": {"get"},
        "/api/v1/sales": {"get"},
        "/api/v1/inventory": {"get"},
        "/api/v1/vectors": {"post"},
        "/api/v1/matrices": {"post"},
        "/api/v1/operations": {"get", "post"},
        "/api/v1/reports": {"get"},
    }

    for path, methods in required_operations.items():
        assert path in paths
        assert methods <= set(paths[path])


def test_route_modules_do_not_access_persistence_or_algorithms_directly() -> None:
    routes_directory = Path(__file__).parents[1] / "app" / "api" / "routes"
    forbidden_imports = ("sqlalchemy", "app.models", "app.repositories", "app.algorithms")

    for route_file in routes_directory.glob("*.py"):
        source = route_file.read_text(encoding="utf-8")
        assert not any(name in source for name in forbidden_imports), route_file.name


def test_lower_layers_do_not_depend_on_http_or_service_layers() -> None:
    app_directory = Path(__file__).parents[1] / "app"
    boundaries = {
        "repositories": ("fastapi", "app.api", "app.services", "app.schemas"),
        "algorithms": (
            "fastapi",
            "pydantic",
            "sqlalchemy",
            "app.api",
            "app.models",
            "app.repositories",
            "app.schemas",
            "app.services",
        ),
    }

    for directory, forbidden_imports in boundaries.items():
        for module in (app_directory / directory).glob("*.py"):
            source = module.read_text(encoding="utf-8")
            assert not any(name in source for name in forbidden_imports), module.name
