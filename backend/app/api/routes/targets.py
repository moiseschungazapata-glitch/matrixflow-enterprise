from fastapi import APIRouter, Query, Response, status

from app.api.dependencies import AdministratorUser, BusinessUser, DatabaseSession
from app.schemas.target import TargetCreate, TargetResponse, TargetUpdate
from app.services.target_service import TargetService

router = APIRouter(prefix="/targets", tags=["Targets"])


@router.get("", response_model=list[TargetResponse])
def list_targets(
    session: DatabaseSession,
    _current_user: BusinessUser,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[TargetResponse]:
    return TargetService(session).list(offset=offset, limit=limit)


@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(
    data: TargetCreate,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> TargetResponse:
    return TargetService(session).create(data)


@router.patch("/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: int,
    data: TargetUpdate,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> TargetResponse:
    return TargetService(session).update(target_id, data)


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(
    target_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> Response:
    TargetService(session).delete(target_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
