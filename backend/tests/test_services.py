import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import app.models  # noqa: F401 - registers every SQLAlchemy table
from app.core.database import Base
from app.core.exceptions import ResourceConflictError, ResourceNotFoundError
from app.core.security import verify_password
from app.models.user import User
from app.schemas.branch import BranchCreate
from app.schemas.company import CompanyCreate
from app.schemas.inventory import InventoryAdjustment, InventoryCreate
from app.schemas.matrix import MatrixCreate, MatrixUpdate
from app.schemas.operation import OperationCreate
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate
from app.schemas.user import UserCreate
from app.schemas.vector import VectorCreate, VectorUpdate
from app.services.branch_service import BranchService
from app.services.company_service import CompanyService
from app.services.inventory_service import InventoryService
from app.services.matrix_service import MatrixService
from app.services.operation_service import OperationService
from app.services.product_service import ProductService
from app.services.report_service import ReportService
from app.services.sale_service import SaleService
from app.services.user_service import UserService
from app.services.vector_service import VectorService


@pytest.fixture
def session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def create_catalog(session: Session) -> tuple[int, int, int]:
    company = CompanyService(session).create(
        CompanyCreate.model_validate({
            "name": "MatrixFlow Enterprise S.A.C.",
            "taxId": "20601234567",
            "sector": "Tecnología",
            "email": "contacto@matrixflow.pe",
            "phone": "+51 1 555 0142",
            "address": "Av. Javier Prado 2450, Lima",
        })
    )
    branch = BranchService(session).create(
        BranchCreate.model_validate({
            "companyId": company.id,
            "name": "Sucursal Lima",
            "city": "Lima",
            "address": "Av. Arequipa 1250",
        })
    )
    product = ProductService(session).create(
        ProductCreate.model_validate({
            "sku": "LAP-001",
            "name": "Laptop empresarial",
            "category": "Equipos",
            "price": 2500,
            "minimumStock": 2,
        })
    )
    return company.id, branch.id, product.id


def test_catalog_services_persist_validated_entities(session: Session) -> None:
    company_id, branch_id, product_id = create_catalog(session)

    assert CompanyService(session).get(company_id).tax_id == "20601234567"
    assert BranchService(session).get(branch_id).city == "Lima"
    product = ProductService(session).get(product_id)
    assert product.sku == "LAP-001"
    assert product.category == "Equipos"

    with pytest.raises(ResourceConflictError, match="SKU"):
        ProductService(session).create(
            ProductCreate(
                sku="LAP-001",
                name="Equipo duplicado",
                category="Equipos",
                price=100,
                minimum_stock=0,
            )
        )


def test_users_store_hashes_and_never_return_passwords(session: Session) -> None:
    response = UserService(session).create(
        UserCreate(
            name="Ana Torres",
            dni="12345678",
            nationality="Peruana",
            email="ana@matrixflow.pe",
            password="ClaveSegura123",
            role="Administrador",
        )
    )

    stored = session.scalar(select(User).where(User.id == response.id))
    assert stored is not None
    assert stored.password_hash != "ClaveSegura123"
    assert verify_password("ClaveSegura123", stored.password_hash)
    assert stored.dni == "12345678"
    assert response.nationality == "Peruana"
    assert "password" not in response.model_dump()


def test_vector_and_matrix_services_persist_ordered_values(session: Session) -> None:
    vector_service = VectorService(session)
    vector = vector_service.create(
        VectorCreate(
            name="Vector ventas",
            description="Ventas mensuales",
            values=[10, 20, 30],
        )
    )
    updated_vector = vector_service.update(
        vector.id,
        VectorUpdate(values=[3, 2, 1]),
    )
    assert updated_vector.values == [3, 2, 1]

    matrix_service = MatrixService(session)
    matrix = matrix_service.create(
        MatrixCreate(
            name="Matriz regional",
            description="Indicadores por región",
            values=[[1, 2], [3, 4]],
        )
    )
    updated_matrix = matrix_service.update(
        matrix.id,
        MatrixUpdate(values=[[5, 6, 7]]),
    )
    assert updated_matrix.values == [[5, 6, 7]]


def test_vector_operation_result_survives_a_new_database_session(tmp_path) -> None:
    database_path = tmp_path / "vector-results.db"
    engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    Base.metadata.create_all(engine)

    with Session(engine, expire_on_commit=False) as first_session:
        vector_service = VectorService(first_session)
        first = vector_service.create(
            VectorCreate(
                name="Vector A",
                description="Primer operando",
                values=[1, 2, 3],
            )
        )
        second = vector_service.create(
            VectorCreate(
                name="Vector B",
                description="Segundo operando",
                values=[4, 5, 6],
            )
        )
        operation = OperationService(first_session).execute(
            OperationCreate.model_validate(
                {
                    "category": "Vector",
                    "operationType": "Suma",
                    "firstId": first.id,
                    "secondId": second.id,
                }
            ),
            user="Analista MatrixFlow",
        )
        operation_id = operation.id

    with Session(engine, expire_on_commit=False) as second_session:
        saved = OperationService(second_session).get(operation_id)

    assert saved.result == [5.0, 7.0, 9.0]


def test_sale_is_atomic_with_inventory_movement_and_report(session: Session) -> None:
    _, branch_id, product_id = create_catalog(session)
    inventory_service = InventoryService(session)
    inventory = inventory_service.create(
        InventoryCreate(branch_id=branch_id, product_id=product_id, stock=10),
        user="Ana Torres",
    )

    sale = SaleService(session).create(
        SaleCreate(branch_id=branch_id, product_id=product_id, quantity=3),
        user="Ana Torres",
    )

    assert sale.unit_price == 2500
    assert sale.total == 7500
    assert inventory_service.get(inventory.id).stock == 7
    movements = inventory_service.list_movements(inventory_id=inventory.id)
    assert [movement.type.value for movement in movements] == ["Salida", "Entrada"]
    assert movements[0].previous_stock == 10
    assert movements[0].new_stock == 7

    report = ReportService(session).get_dashboard()
    assert report.total_sales == 7500
    assert report.units_sold == 3
    assert report.sales_by_branch[0].units == 3
    assert report.stock_by_product[0].stock == 7

    with pytest.raises(ResourceConflictError, match="insuficiente"):
        SaleService(session).create(
            SaleCreate(branch_id=branch_id, product_id=product_id, quantity=8)
        )
    assert inventory_service.get(inventory.id).stock == 7


def test_sale_rolls_back_stock_when_a_related_write_fails(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, branch_id, product_id = create_catalog(session)
    inventory_service = InventoryService(session)
    inventory = inventory_service.create(
        InventoryCreate(branch_id=branch_id, product_id=product_id, stock=10),
        user="Ana Torres",
    )
    sale_service = SaleService(session)

    def fail_movement(_movement):
        raise RuntimeError("Fallo simulado al registrar el movimiento")

    monkeypatch.setattr(sale_service.movements, "add", fail_movement)

    with pytest.raises(RuntimeError, match="Fallo simulado"):
        sale_service.create(
            SaleCreate(branch_id=branch_id, product_id=product_id, quantity=3),
            user="Ana Torres",
        )

    assert inventory_service.get(inventory.id).stock == 10
    assert sale_service.list() == []


def test_related_business_records_cannot_be_deleted(session: Session) -> None:
    company_id, branch_id, product_id = create_catalog(session)
    inventory = InventoryService(session).create(
        InventoryCreate(branch_id=branch_id, product_id=product_id, stock=5)
    )

    with pytest.raises(ResourceConflictError, match="tiene sucursales"):
        CompanyService(session).delete(company_id)
    with pytest.raises(ResourceConflictError, match="ventas, inventario o metas"):
        BranchService(session).delete(branch_id)
    with pytest.raises(ResourceConflictError, match="inventario o ventas"):
        ProductService(session).delete(product_id)

    assert CompanyService(session).get(company_id).id == company_id
    assert BranchService(session).get(branch_id).id == branch_id
    assert ProductService(session).get(product_id).id == product_id
    assert InventoryService(session).get(inventory.id).stock == 5


def test_unrelated_business_records_can_be_deleted(session: Session) -> None:
    company_id, branch_id, product_id = create_catalog(session)

    ProductService(session).delete(product_id)
    BranchService(session).delete(branch_id)
    CompanyService(session).delete(company_id)

    with pytest.raises(ResourceNotFoundError):
        ProductService(session).get(product_id)
    with pytest.raises(ResourceNotFoundError):
        BranchService(session).get(branch_id)
    with pytest.raises(ResourceNotFoundError):
        CompanyService(session).get(company_id)


def test_inventory_adjustment_and_operation_history(session: Session) -> None:
    _, branch_id, product_id = create_catalog(session)
    inventory_service = InventoryService(session)
    inventory = inventory_service.create(
        InventoryCreate(branch_id=branch_id, product_id=product_id, stock=4)
    )
    adjusted = inventory_service.adjust(
        inventory.id,
        InventoryAdjustment(stock=6, reason="Conteo físico validado"),
        user="Ana Torres",
    )
    assert adjusted.stock == 6
    adjustment = inventory_service.list_movements(inventory_id=inventory.id)[0]
    assert adjustment.previous_stock == 4
    assert adjustment.new_stock == 6
    assert adjustment.reason == "Conteo físico validado"
    assert adjustment.user == "Ana Torres"

    operation = OperationService(session).record(
        OperationCreate.model_validate({
            "category": "Vector",
            "operationType": "Suma",
            "firstId": 1,
            "secondId": 2,
        }),
        result=[4, 6],
        user="Ana Torres",
    )
    assert operation.result == [4.0, 6.0]
    assert operation.inputs == "Suma: Vector #1, Vector #2"
    assert operation.user == "Ana Torres"
    assert operation.created_at is not None
    assert operation.status.value == "Completada"
    assert ReportService(session).get_dashboard().operations_count == 1
