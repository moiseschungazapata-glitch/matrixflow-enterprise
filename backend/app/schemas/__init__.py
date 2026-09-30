"""Validated HTTP contracts shared by routes and services."""

from app.schemas.auth import (
    AuthenticatedUser,
    DniIdentificationRequest,
    IdentityProfileResponse,
    LoginRequest,
    LoginResponse,
    TokenPayload,
)
from app.schemas.branch import BranchCreate, BranchResponse, BranchUpdate
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.schemas.inventory import (
    InventoryAdjustment,
    InventoryCreate,
    InventoryMovementCreate,
    InventoryMovementResponse,
    InventoryResponse,
)
from app.schemas.matrix import MatrixCreate, MatrixResponse, MatrixUpdate
from app.schemas.operation import OperationCreate, OperationResponse
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.schemas.report import ReportResponse
from app.schemas.sale import SaleCreate, SaleResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.vector import VectorCreate, VectorResponse, VectorUpdate

__all__ = [
    "AuthenticatedUser",
    "BranchCreate",
    "BranchResponse",
    "BranchUpdate",
    "CompanyCreate",
    "CompanyResponse",
    "CompanyUpdate",
    "DniIdentificationRequest",
    "IdentityProfileResponse",
    "InventoryAdjustment",
    "InventoryCreate",
    "InventoryMovementCreate",
    "InventoryMovementResponse",
    "InventoryResponse",
    "LoginRequest",
    "LoginResponse",
    "TokenPayload",
    "MatrixCreate",
    "MatrixResponse",
    "MatrixUpdate",
    "OperationCreate",
    "OperationResponse",
    "ProductCreate",
    "ProductResponse",
    "ProductUpdate",
    "ReportResponse",
    "SaleCreate",
    "SaleResponse",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "VectorCreate",
    "VectorResponse",
    "VectorUpdate",
]
