from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.auth import DniIdentificationRequest, LoginRequest
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.schemas.inventory import InventoryAdjustment, InventoryMovementCreate
from app.schemas.matrix import MatrixCreate
from app.schemas.operation import OperationCreate, OperationResponse
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate
from app.schemas.user import UserCreate
from app.schemas.vector import VectorCreate


def valid_company_payload() -> dict[str, object]:
    return {
        "name": "MatrixFlow Enterprise S.A.C.",
        "taxId": "20601234567",
        "sector": "Tecnología",
        "email": "contacto@matrixflow.pe",
        "phone": "+51 1 555 0142",
        "address": "Av. Javier Prado 2450, Lima",
        "status": "Activa",
    }


def test_company_accepts_frontend_aliases_and_serializes_as_camel_case() -> None:
    company = CompanyCreate.model_validate(valid_company_payload())

    assert company.tax_id == "20601234567"
    assert company.model_dump(by_alias=True)["taxId"] == "20601234567"
    assert "taxId" in CompanyCreate.model_json_schema(by_alias=True)["properties"]


def test_response_models_support_sqlalchemy_style_attributes() -> None:
    company = SimpleNamespace(id=1, **{
        "name": "MatrixFlow Enterprise S.A.C.",
        "tax_id": "20601234567",
        "sector": "Tecnología",
        "email": "contacto@matrixflow.pe",
        "phone": "+51 1 555 0142",
        "address": "Av. Javier Prado 2450, Lima",
        "status": "Activa",
    })

    response = CompanyResponse.model_validate(company)

    assert response.id == 1
    assert response.model_dump(by_alias=True)["taxId"] == "20601234567"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("taxId", "123"),
        ("email", "correo-invalido"),
        ("phone", "abc-def"),
    ],
)
def test_company_rejects_invalid_identity_fields(field: str, value: str) -> None:
    payload = valid_company_payload()
    payload[field] = value

    with pytest.raises(ValidationError):
        CompanyCreate.model_validate(payload)


def test_update_requires_at_least_one_field() -> None:
    with pytest.raises(ValidationError, match="al menos un campo"):
        CompanyUpdate.model_validate({})


def test_product_rejects_non_positive_price_and_negative_stock() -> None:
    with pytest.raises(ValidationError):
        ProductCreate.model_validate({
            "sku": "LAP-001",
            "name": "Laptop empresarial",
            "category": "Equipos",
            "price": 0,
            "minimumStock": -1,
            "status": "Activo",
        })


def test_sale_accepts_only_server_calculable_input() -> None:
    sale = SaleCreate.model_validate({"branchId": 1, "productId": 2, "quantity": 3})
    assert sale.quantity == 3

    with pytest.raises(ValidationError):
        SaleCreate.model_validate({
            "branchId": 1,
            "productId": 2,
            "quantity": 3,
            "total": 1,
        })


def test_inventory_contracts_validate_stock_and_traceability() -> None:
    with pytest.raises(ValidationError):
        InventoryAdjustment.model_validate({"stock": -1, "reason": "Conteo físico"})

    movement = InventoryMovementCreate.model_validate({
        "inventoryId": 1,
        "branchId": 1,
        "productId": 2,
        "type": "Ajuste",
        "quantity": 4,
        "previousStock": 10,
        "newStock": 6,
        "reason": "Conteo físico",
        "user": "Ana Torres",
    })
    assert movement.previous_stock == 10


def test_vectors_reject_empty_or_non_finite_values() -> None:
    with pytest.raises(ValidationError):
        VectorCreate.model_validate({
            "name": "Vector inválido",
            "description": "Contiene un valor no finito",
            "values": [1, float("nan")],
        })


def test_matrices_must_be_rectangular() -> None:
    with pytest.raises(ValidationError, match="misma longitud"):
        MatrixCreate.model_validate({
            "name": "Matriz irregular",
            "description": "Filas incompatibles",
            "values": [[1, 2], [3]],
        })


def test_operation_validates_category_and_required_operands() -> None:
    combination = OperationCreate.model_validate({
        "category": "Vector",
        "operationType": "Combinación lineal",
        "firstId": 1,
        "secondId": 2,
        "scalar": 1.5,
        "coefficientB": -2,
    })
    assert combination.second_id == 2

    with pytest.raises(ValidationError, match="segundo operando"):
        OperationCreate.model_validate({
            "category": "Vector",
            "operationType": "Suma",
            "firstId": 1,
        })

    with pytest.raises(ValidationError, match="no corresponde"):
        OperationCreate.model_validate({
            "category": "Matriz",
            "operationType": "Producto escalar",
            "firstId": 1,
            "secondId": 2,
        })


def test_operation_response_supports_scalar_vector_and_matrix_results() -> None:
    base_payload = {
        "id": 1,
        "operationType": "Suma",
        "category": "Vector",
        "inputs": "Vector A + Vector B",
        "createdAt": datetime.now(timezone.utc),
        "user": "Ana Torres",
        "status": "Completada",
    }

    for result in (5.0, [1, 2], [[1, 2], [3, 4]]):
        response = OperationResponse.model_validate({**base_payload, "result": result})
        assert response.result is not None


def test_login_accepts_email_and_legacy_username_key() -> None:
    by_email = LoginRequest.model_validate({
        "email": "admin@matrixflow.pe",
        "password": "demo123",
    })
    by_username = LoginRequest.model_validate({
        "username": "admin@matrixflow.pe",
        "password": "demo123",
    })

    assert by_email.email == by_username.email


def test_user_password_and_email_are_validated() -> None:
    with pytest.raises(ValidationError):
        UserCreate.model_validate({
            "name": "Ana Torres",
            "email": "correo-invalido",
            "password": "123",
            "role": "Administrador",
            "status": "Activo",
        })


def test_dni_identification_requires_eight_digits() -> None:
    assert DniIdentificationRequest(dni="12345678").dni == "12345678"

    with pytest.raises(ValidationError):
        DniIdentificationRequest(dni="1234")
