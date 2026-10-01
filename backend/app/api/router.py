from fastapi import APIRouter

from app.api.routes import (
    auth,
    branches,
    companies,
    inventory,
    matrices,
    operations,
    products,
    reports,
    sales,
    targets,
    users,
    vectors,
)
from app.core.config import settings


api_router = APIRouter(prefix=settings.api_prefix)

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(companies.router)
api_router.include_router(branches.router)
api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(targets.router)
api_router.include_router(inventory.router)
api_router.include_router(vectors.router)
api_router.include_router(matrices.router)
api_router.include_router(operations.router)
api_router.include_router(reports.router)
