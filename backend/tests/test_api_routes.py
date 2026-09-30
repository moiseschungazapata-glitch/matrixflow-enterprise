import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - registers every SQLAlchemy table
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def api_session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        def override_database():
            yield session

        app.dependency_overrides[get_db] = override_database
        yield session
        app.dependency_overrides.clear()


def authorization_header(
    session: Session,
    *,
    email: str,
    role: str,
) -> dict[str, str]:
    user = UserService(session).create(
        UserCreate(
            name=f"Usuario {role}",
            email=email,
            password="demo123",
            role=role,
        )
    )
    token = create_access_token(
        user_id=user.id,
        email=str(user.email),
        role=user.role,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_routes_enforce_authentication_and_roles(api_session: Session) -> None:
    analyst_headers = authorization_header(
        api_session,
        email="analista@matrixflow.pe",
        role="Analista",
    )
    read_only_headers = authorization_header(
        api_session,
        email="consulta@matrixflow.pe",
        role="Consulta",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        anonymous = await client.get("/api/v1/companies")
        forbidden_write = await client.post(
            "/api/v1/companies",
            headers=analyst_headers,
            json={
                "name": "Empresa restringida",
                "taxId": "20601234567",
                "sector": "Tecnología",
                "email": "empresa@matrixflow.pe",
                "phone": "+51 999 555 111",
                "address": "Av. Empresarial 123",
            },
        )
        allowed_report = await client.get(
            "/api/v1/reports",
            headers=read_only_headers,
        )
        forbidden_catalog = await client.get(
            "/api/v1/products",
            headers=read_only_headers,
        )
        missing_operand = await client.post(
            "/api/v1/operations",
            headers=analyst_headers,
            json={
                "category": "Vector",
                "operationType": "Suma",
                "firstId": 1,
                "secondId": 2,
            },
        )

    assert anonymous.status_code == 401
    assert forbidden_write.status_code == 403
    assert allowed_report.status_code == 200
    assert forbidden_catalog.status_code == 403
    assert missing_operand.status_code == 404


@pytest.mark.anyio
async def test_business_endpoints_complete_sale_and_reporting_flow(
    api_session: Session,
) -> None:
    headers = authorization_header(
        api_session,
        email="admin@matrixflow.pe",
        role="Administrador",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        company = await client.post(
            "/api/v1/companies",
            headers=headers,
            json={
                "name": "MatrixFlow Enterprise S.A.C.",
                "taxId": "20601234567",
                "sector": "Tecnología",
                "email": "contacto@matrixflow.pe",
                "phone": "+51 1 555 0142",
                "address": "Av. Javier Prado 2450, Lima",
            },
        )
        assert company.status_code == 201
        company_body = company.json()
        assert company_body["taxId"] == "20601234567"

        duplicate = await client.post(
            "/api/v1/companies",
            headers=headers,
            json={
                "name": company_body["name"],
                "taxId": company_body["taxId"],
                "sector": company_body["sector"],
                "email": company_body["email"],
                "phone": company_body["phone"],
                "address": company_body["address"],
                "status": company_body["status"],
            },
        )
        assert duplicate.status_code == 409
        assert duplicate.json()["code"] == "resource_conflict"

        branch = await client.post(
            "/api/v1/branches",
            headers=headers,
            json={
                "companyId": company_body["id"],
                "name": "Sucursal Lima",
                "city": "Lima",
                "address": "Av. Arequipa 1250",
            },
        )
        assert branch.status_code == 201

        product = await client.post(
            "/api/v1/products",
            headers=headers,
            json={
                "sku": "LAP-001",
                "name": "Laptop empresarial",
                "category": "Equipos",
                "price": 2500,
                "minimumStock": 2,
            },
        )
        assert product.status_code == 201

        inventory = await client.post(
            "/api/v1/inventory",
            headers=headers,
            json={
                "branchId": branch.json()["id"],
                "productId": product.json()["id"],
                "stock": 10,
            },
        )
        assert inventory.status_code == 201

        sale = await client.post(
            "/api/v1/sales",
            headers=headers,
            json={
                "branchId": branch.json()["id"],
                "productId": product.json()["id"],
                "quantity": 3,
            },
        )
        assert sale.status_code == 201
        assert sale.json()["total"] == 7500

        inventory_after_sale = await client.get(
            f"/api/v1/inventory/{inventory.json()['id']}",
            headers=headers,
        )
        movements = await client.get(
            "/api/v1/inventory/movements",
            headers=headers,
            params={"inventoryId": inventory.json()["id"]},
        )
        sale_detail = await client.get(
            f"/api/v1/sales/{sale.json()['id']}",
            headers=headers,
        )
        sales_list = await client.get("/api/v1/sales", headers=headers)
        adjustment = await client.patch(
            f"/api/v1/inventory/{inventory.json()['id']}",
            headers=headers,
            json={"stock": 8, "reason": "Conteo físico verificado"},
        )
        adjusted_movements = await client.get(
            "/api/v1/inventory/movements",
            headers=headers,
            params={"inventoryId": inventory.json()["id"]},
        )
        rejected_sale = await client.post(
            "/api/v1/sales",
            headers=headers,
            json={
                "branchId": branch.json()["id"],
                "productId": product.json()["id"],
                "quantity": 99,
            },
        )
        inventory_after_rejection = await client.get(
            f"/api/v1/inventory/{inventory.json()['id']}",
            headers=headers,
        )
        report = await client.get("/api/v1/reports", headers=headers)
        missing = await client.get("/api/v1/products/999", headers=headers)
        blocked_company_delete = await client.delete(
            f"/api/v1/companies/{company_body['id']}",
            headers=headers,
        )
        blocked_branch_delete = await client.delete(
            f"/api/v1/branches/{branch.json()['id']}",
            headers=headers,
        )
        blocked_product_delete = await client.delete(
            f"/api/v1/products/{product.json()['id']}",
            headers=headers,
        )

    assert inventory_after_sale.json()["stock"] == 7
    assert movements.json()[0]["type"] == "Salida"
    assert sale_detail.json()["id"] == sale.json()["id"]
    assert [item["id"] for item in sales_list.json()] == [sale.json()["id"]]
    assert adjustment.status_code == 200
    assert adjustment.json()["stock"] == 8
    assert adjusted_movements.json()[0]["type"] == "Ajuste"
    assert adjusted_movements.json()[0]["previousStock"] == 7
    assert adjusted_movements.json()[0]["newStock"] == 8
    assert adjusted_movements.json()[0]["user"] == "Usuario Administrador"
    assert rejected_sale.status_code == 409
    assert rejected_sale.json()["code"] == "resource_conflict"
    assert inventory_after_rejection.json()["stock"] == 8
    assert report.json()["totalSales"] == 7500
    assert report.json()["unitsSold"] == 3
    assert missing.status_code == 404
    assert missing.json()["code"] == "resource_not_found"
    for blocked_delete in (
        blocked_company_delete,
        blocked_branch_delete,
        blocked_product_delete,
    ):
        assert blocked_delete.status_code == 409
        assert blocked_delete.json()["code"] == "resource_conflict"


@pytest.mark.anyio
async def test_administrative_endpoints_complete_crud_lifecycle(
    api_session: Session,
) -> None:
    headers = authorization_header(
        api_session,
        email="crud-admin@matrixflow.pe",
        role="Administrador",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        company = await client.post(
            "/api/v1/companies",
            headers=headers,
            json={
                "name": "Empresa CRUD S.A.C.",
                "taxId": "20609876543",
                "sector": "Tecnología",
                "email": "crud@matrixflow.pe",
                "phone": "+51 999 123 456",
                "address": "Av. Pruebas 123, Lima",
            },
        )
        assert company.status_code == 201
        branch = await client.post(
            "/api/v1/branches",
            headers=headers,
            json={
                "companyId": company.json()["id"],
                "name": "Sucursal CRUD",
                "city": "Lima",
                "address": "Av. Sucursal 456, Lima",
            },
        )
        assert branch.status_code == 201
        product = await client.post(
            "/api/v1/products",
            headers=headers,
            json={
                "sku": "CRUD-001",
                "name": "Producto CRUD",
                "category": "Pruebas",
                "price": 100,
                "minimumStock": 1,
            },
        )
        assert product.status_code == 201
        user = await client.post(
            "/api/v1/users",
            headers=headers,
            json={
                "name": "Usuario CRUD",
                "dni": "87654321",
                "nationality": "Peruana",
                "email": "usuario-crud@matrixflow.pe",
                "password": "demo123",
                "role": "Consulta",
            },
        )
        assert user.status_code == 201

        updated_company = await client.patch(
            f"/api/v1/companies/{company.json()['id']}",
            headers=headers,
            json={"sector": "Servicios"},
        )
        updated_branch = await client.patch(
            f"/api/v1/branches/{branch.json()['id']}",
            headers=headers,
            json={"city": "Callao"},
        )
        updated_product = await client.patch(
            f"/api/v1/products/{product.json()['id']}",
            headers=headers,
            json={"price": 125.5},
        )
        updated_user = await client.patch(
            f"/api/v1/users/{user.json()['id']}",
            headers=headers,
            json={"status": "Inactivo"},
        )
        listed_users = await client.get("/api/v1/users", headers=headers)

        deleted_product = await client.delete(
            f"/api/v1/products/{product.json()['id']}",
            headers=headers,
        )
        deleted_branch = await client.delete(
            f"/api/v1/branches/{branch.json()['id']}",
            headers=headers,
        )
        deleted_company = await client.delete(
            f"/api/v1/companies/{company.json()['id']}",
            headers=headers,
        )
        deleted_user = await client.delete(
            f"/api/v1/users/{user.json()['id']}",
            headers=headers,
        )
        missing_company = await client.get(
            f"/api/v1/companies/{company.json()['id']}",
            headers=headers,
        )

    assert company.status_code == 201
    assert branch.status_code == 201
    assert product.status_code == 201
    assert user.status_code == 201
    assert user.json()["dni"] == "87654321"
    assert user.json()["nationality"] == "Peruana"
    assert updated_company.json()["sector"] == "Servicios"
    assert updated_branch.json()["city"] == "Callao"
    assert updated_product.json()["price"] == 125.5
    assert updated_user.json()["status"] == "Inactivo"
    assert user.json()["id"] in {item["id"] for item in listed_users.json()}
    assert all(
        response.status_code == 204
        for response in (
            deleted_product,
            deleted_branch,
            deleted_company,
            deleted_user,
        )
    )
    assert missing_company.status_code == 404


@pytest.mark.anyio
async def test_vector_and_matrix_crud_routes(api_session: Session) -> None:
    headers = authorization_header(
        api_session,
        email="analista@matrixflow.pe",
        role="Analista",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        vector = await client.post(
            "/api/v1/vectors",
            headers=headers,
            json={
                "name": "Vector ventas",
                "description": "Ventas del período",
                "values": [1, 2, 3],
            },
        )
        assert vector.status_code == 201

        updated_vector = await client.patch(
            f"/api/v1/vectors/{vector.json()['id']}",
            headers=headers,
            json={"values": [4, 5, 6]},
        )
        assert updated_vector.json()["values"] == [4, 5, 6]

        matrix = await client.post(
            "/api/v1/matrices",
            headers=headers,
            json={
                "name": "Matriz ventas",
                "description": "Sucursales por producto",
                "values": [[1, 2], [3, 4]],
            },
        )
        assert matrix.status_code == 201
        assert matrix.json()["values"] == [[1, 2], [3, 4]]

        updated_matrix = await client.patch(
            f"/api/v1/matrices/{matrix.json()['id']}",
            headers=headers,
            json={"values": [[5, 6, 7]]},
        )
        fetched_matrix = await client.get(
            f"/api/v1/matrices/{matrix.json()['id']}",
            headers=headers,
        )

        deleted = await client.delete(
            f"/api/v1/vectors/{vector.json()['id']}",
            headers=headers,
        )
        missing = await client.get(
            f"/api/v1/vectors/{vector.json()['id']}",
            headers=headers,
        )
        deleted_matrix = await client.delete(
            f"/api/v1/matrices/{matrix.json()['id']}",
            headers=headers,
        )
        missing_matrix = await client.get(
            f"/api/v1/matrices/{matrix.json()['id']}",
            headers=headers,
        )

    assert deleted.status_code == 204
    assert deleted.content == b""
    assert missing.status_code == 404
    assert updated_matrix.json()["values"] == [[5, 6, 7]]
    assert fetched_matrix.json()["values"] == [[5, 6, 7]]
    assert deleted_matrix.status_code == 204
    assert missing_matrix.status_code == 404


@pytest.mark.anyio
async def test_numpy_operations_are_executed_and_saved_in_history(
    api_session: Session,
) -> None:
    headers = authorization_header(
        api_session,
        email="operaciones@matrixflow.pe",
        role="Analista",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        vector_a = await client.post(
            "/api/v1/vectors",
            headers=headers,
            json={
                "name": "Vector A",
                "description": "Primer vector de prueba",
                "values": [1, 2, 3],
            },
        )
        vector_b = await client.post(
            "/api/v1/vectors",
            headers=headers,
            json={
                "name": "Vector B",
                "description": "Segundo vector de prueba",
                "values": [4, 5, 6],
            },
        )
        short_vector = await client.post(
            "/api/v1/vectors",
            headers=headers,
            json={
                "name": "Vector corto",
                "description": "Vector incompatible",
                "values": [1, 2],
            },
        )
        matrix_a = await client.post(
            "/api/v1/matrices",
            headers=headers,
            json={
                "name": "Matriz A",
                "description": "Primera matriz de prueba",
                "values": [[1, 2], [3, 4]],
            },
        )
        matrix_b = await client.post(
            "/api/v1/matrices",
            headers=headers,
            json={
                "name": "Matriz B",
                "description": "Segunda matriz de prueba",
                "values": [[5, 6], [7, 8]],
            },
        )

        vector_sum = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Vector",
                "operationType": "Suma",
                "firstId": vector_a.json()["id"],
                "secondId": vector_b.json()["id"],
            },
        )
        dot_product_response = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Vector",
                "operationType": "Producto escalar",
                "firstId": vector_a.json()["id"],
                "secondId": vector_b.json()["id"],
            },
        )
        combination = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Vector",
                "operationType": "Combinación lineal",
                "firstId": vector_a.json()["id"],
                "secondId": vector_b.json()["id"],
                "scalar": 2,
                "coefficientB": -1,
            },
        )
        matrix_product = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Matriz",
                "operationType": "Multiplicación",
                "firstId": matrix_a.json()["id"],
                "secondId": matrix_b.json()["id"],
            },
        )
        transpose = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Matriz",
                "operationType": "Transposición",
                "firstId": matrix_a.json()["id"],
            },
        )
        incompatible = await client.post(
            "/api/v1/operations",
            headers=headers,
            json={
                "category": "Vector",
                "operationType": "Suma",
                "firstId": vector_a.json()["id"],
                "secondId": short_vector.json()["id"],
            },
        )
        history = await client.get("/api/v1/operations", headers=headers)

    assert vector_sum.status_code == 201
    assert vector_sum.json()["result"] == [5.0, 7.0, 9.0]
    assert vector_sum.json()["user"] == "Usuario Analista"
    assert vector_sum.json()["status"] == "Completada"
    assert dot_product_response.json()["result"] == 32.0
    assert combination.json()["result"] == [-2.0, -1.0, 0.0]
    assert matrix_product.json()["result"] == [[19.0, 22.0], [43.0, 50.0]]
    assert transpose.json()["result"] == [[1.0, 3.0], [2.0, 4.0]]
    assert incompatible.status_code == 400
    assert incompatible.json()["code"] == "invalid_operation"
    assert len(history.json()) == 5
    assert history.json()[0]["type"] == "Transposición"
