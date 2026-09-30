from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.face_verification_attempt import FaceVerificationAttempt
from app.repositories.base import BaseRepository


class FaceVerificationRepository(BaseRepository[FaceVerificationAttempt]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, FaceVerificationAttempt)

    def get_by_verification_id(
        self,
        verification_id: str,
    ) -> FaceVerificationAttempt | None:
        return self.session.get(FaceVerificationAttempt, verification_id)

    def count_since(self, user_id: int, since: datetime) -> int:
        statement = select(func.count(FaceVerificationAttempt.id)).where(
            FaceVerificationAttempt.user_id == user_id,
            FaceVerificationAttempt.created_at >= since,
        )
        return int(self.session.scalar(statement) or 0)
