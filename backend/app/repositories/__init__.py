"""Database access layer.

Only repository modules should build SQLAlchemy queries. Services coordinate
transactions and routers remain limited to HTTP concerns.
"""

from app.repositories.base import BaseRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.inventory_repository import (
    InventoryMovementRepository,
    InventoryRepository,
)
from app.repositories.matrix_repository import MatrixRepository
from app.repositories.operation_repository import OperationRepository
from app.repositories.product_repository import CategoryRepository, ProductRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.user_repository import RoleRepository, UserRepository
from app.repositories.vector_repository import VectorRepository

__all__ = [
    "BaseRepository",
    "BranchRepository",
    "CategoryRepository",
    "CompanyRepository",
    "InventoryMovementRepository",
    "InventoryRepository",
    "MatrixRepository",
    "OperationRepository",
    "ProductRepository",
    "ReportRepository",
    "RoleRepository",
    "SaleRepository",
    "UserRepository",
    "VectorRepository",
]
from app.repositories.face_verification_repository import FaceVerificationRepository

__all__ = ["FaceVerificationRepository"]
