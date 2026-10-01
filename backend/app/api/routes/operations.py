from fastapi import APIRouter, Query, status

from app.api.dependencies import BusinessUser, DatabaseSession
from app.schemas.operation import OperationCreate, OperationResponse
from app.services.operation_service import OperationService

router = APIRouter(
    prefix="/operations",
    tags=["Operations"],
)


@router.post(
    "",
    response_model=OperationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "description": "Operandos inválidos o dimensiones incompatibles."
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "El vector o la matriz solicitada no existe."
        },
    },
)
def create_operation(
    data: OperationCreate,
    session: DatabaseSession,
    current_user: BusinessUser,
) -> OperationResponse:
    return OperationService(session).execute(data, user=current_user.name)


@router.get("", response_model=list[OperationResponse])
def get_operations(
    session: DatabaseSession,
    _current_user: BusinessUser,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[OperationResponse]:
    return OperationService(session).list(offset=offset, limit=limit)


@router.get("/{operation_id}", response_model=OperationResponse)
def get_operation(
    operation_id: int,
    session: DatabaseSession,
    _current_user: BusinessUser,
) -> OperationResponse:
    return OperationService(session).get(operation_id)
