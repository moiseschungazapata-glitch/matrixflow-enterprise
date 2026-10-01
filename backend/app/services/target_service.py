from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.models.branch import Branch
from app.models.target import Target
from app.schemas.target import TargetCreate, TargetResponse, TargetUpdate
from app.services.base import BaseService


class TargetService(BaseService):
    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list(self, *, offset: int = 0, limit: int = 100) -> list[TargetResponse]:
        records = self.session.scalars(
            select(Target).order_by(Target.id).offset(offset).limit(limit)
        ).all()
        return [TargetResponse.model_validate(record) for record in records]

    def get(self, target_id: int) -> TargetResponse:
        return TargetResponse.model_validate(self._get(target_id))

    def create(self, data: TargetCreate) -> TargetResponse:
        self._require_branch(data.branch_id)
        record = Target(**data.model_dump())
        with self.transaction():
            self.session.add(record)
        return TargetResponse.model_validate(record)

    def update(self, target_id: int, data: TargetUpdate) -> TargetResponse:
        record = self._get(target_id)
        values = data.model_dump(exclude_unset=True)
        if "branch_id" in values:
            self._require_branch(values["branch_id"])
        with self.transaction():
            for key, value in values.items():
                setattr(record, key, value)
        return TargetResponse.model_validate(record)

    def delete(self, target_id: int) -> None:
        record = self._get(target_id)
        with self.transaction():
            self.session.delete(record)

    def _get(self, target_id: int) -> Target:
        record = self.session.get(Target, target_id)
        if record is None:
            raise ResourceNotFoundError("La meta solicitada no existe.")
        return record

    def _require_branch(self, branch_id: int) -> None:
        if self.session.get(Branch, branch_id) is None:
            raise ResourceNotFoundError("La sucursal indicada no existe.")
