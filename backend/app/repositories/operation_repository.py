from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.operation import Operation
from app.repositories.base import BaseRepository


class OperationRepository(BaseRepository[Operation]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Operation)

    def list_recent(self, *, offset: int = 0, limit: int = 100) -> Sequence[Operation]:
        statement = (
            select(Operation)
            .order_by(Operation.created_at.desc(), Operation.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return self.session.scalars(statement).all()
