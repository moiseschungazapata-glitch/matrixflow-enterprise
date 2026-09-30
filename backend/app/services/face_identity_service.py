from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Protocol
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceUnavailableError,
    TooManyRequestsError,
)
from app.core.security import create_access_token
from app.integrations.aws_rekognition import AwsRekognitionGateway, LivenessResult
from app.models.face_verification_attempt import FaceVerificationAttempt
from app.models.user import User
from app.repositories.face_verification_repository import FaceVerificationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthenticatedUser
from app.schemas.biometric import (
    FaceEnrollmentResponse,
    FaceLoginResponse,
    FaceSessionResponse,
)
from app.schemas.common import RecordStatus
from app.services.base import BaseService


logger = logging.getLogger(__name__)


class RekognitionGateway(Protocol):
    def create_liveness_session(self, client_request_token: str) -> str: ...
    def get_liveness_result(self, session_id: str) -> LivenessResult: ...
    def index_face(self, image: bytes, external_image_id: str) -> str: ...
    def delete_face(self, face_id: str) -> None: ...
    def find_similarity(self, image: bytes, expected_face_id: str) -> float | None: ...


class FaceIdentityService(BaseService):
    MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024

    def __init__(
        self,
        session: Session,
        gateway: RekognitionGateway | None = None,
    ) -> None:
        super().__init__(session)
        self.users = UserRepository(session)
        self.attempts = FaceVerificationRepository(session)
        self._gateway = gateway

    @property
    def gateway(self) -> RekognitionGateway:
        if not settings.aws_face_liveness_enabled:
            raise ServiceUnavailableError(
                "La verificación facial todavía no está habilitada en este entorno."
            )
        if self._gateway is None:
            self._gateway = AwsRekognitionGateway()
        return self._gateway

    def enroll_reference(
        self,
        user_id: int,
        image: bytes,
    ) -> FaceEnrollmentResponse:
        user = self._get_user(user_id)
        if not image:
            raise ResourceConflictError("La fotografía de referencia está vacía.")
        if len(image) > self.MAX_REFERENCE_IMAGE_BYTES:
            raise ResourceConflictError("La fotografía no puede superar 5 MB.")

        new_face_id = self.gateway.index_face(
            image,
            external_image_id=f"matrixflow-user-{user.id}",
        )
        previous_face_id = user.aws_face_id
        enrolled_at = datetime.now(timezone.utc)
        with self.transaction():
            self.users.update(
                user,
                {
                    "aws_face_id": new_face_id,
                    "face_enrolled_at": enrolled_at,
                },
            )

        if previous_face_id and previous_face_id != new_face_id:
            try:
                self.gateway.delete_face(previous_face_id)
            except Exception:
                logger.exception("Could not remove the superseded Rekognition face")

        return FaceEnrollmentResponse(
            user_id=user.id,
            face_enrolled=True,
            enrolled_at=enrolled_at,
        )

    def remove_reference(self, user_id: int) -> FaceEnrollmentResponse:
        user = self._get_user(user_id)
        face_id = user.aws_face_id
        if face_id is None:
            return FaceEnrollmentResponse(
                user_id=user.id,
                face_enrolled=False,
                enrolled_at=None,
            )

        self.gateway.delete_face(face_id)
        with self.transaction():
            self.users.update(
                user,
                {"aws_face_id": None, "face_enrolled_at": None},
            )
        return FaceEnrollmentResponse(
            user_id=user.id,
            face_enrolled=False,
            enrolled_at=None,
        )

    def create_session(self, dni: str) -> FaceSessionResponse:
        user = self.users.get_by_dni(dni)
        if user is None or user.status != RecordStatus.ACTIVE.value:
            raise ResourceNotFoundError("No se encontró una cuenta activa con ese DNI.")
        if user.aws_face_id is None:
            raise ResourceConflictError(
                "La cuenta todavía no tiene un rostro de referencia registrado."
            )

        now = datetime.now(timezone.utc)
        window_start = now - timedelta(
            minutes=settings.face_attempt_window_minutes
        )
        if self.attempts.count_since(user.id, window_start) >= settings.face_max_attempts:
            raise TooManyRequestsError(
                "Se alcanzó el límite de verificaciones. Inténtalo nuevamente más tarde."
            )

        verification_id = str(uuid4())
        aws_session_id = self.gateway.create_liveness_session(verification_id)
        expires_at = now + timedelta(
            minutes=settings.face_verification_expire_minutes
        )
        attempt = FaceVerificationAttempt(
            id=verification_id,
            user_id=user.id,
            aws_session_id=aws_session_id,
            status="Pendiente",
            created_at=now,
            expires_at=expires_at,
        )
        with self.transaction():
            self.attempts.add(attempt)

        return FaceSessionResponse(
            verification_id=verification_id,
            session_id=aws_session_id,
            region=settings.aws_region,
            expires_at=expires_at,
        )

    def create_enrollment_session(self, user_id: int) -> FaceSessionResponse:
        user = self._get_user(user_id)
        if user.status != RecordStatus.ACTIVE.value:
            raise ResourceConflictError(
                "El usuario debe estar activo para registrar su identidad facial."
            )

        now = datetime.now(timezone.utc)
        window_start = now - timedelta(
            minutes=settings.face_attempt_window_minutes
        )
        if self.attempts.count_since(user.id, window_start) >= settings.face_max_attempts:
            raise TooManyRequestsError(
                "Se alcanzó el límite de verificaciones. Inténtalo nuevamente más tarde."
            )

        verification_id = str(uuid4())
        aws_session_id = self.gateway.create_liveness_session(verification_id)
        expires_at = now + timedelta(
            minutes=settings.face_verification_expire_minutes
        )
        attempt = FaceVerificationAttempt(
            id=verification_id,
            user_id=user.id,
            aws_session_id=aws_session_id,
            status="RegistroPendiente",
            created_at=now,
            expires_at=expires_at,
        )
        with self.transaction():
            self.attempts.add(attempt)

        return FaceSessionResponse(
            verification_id=verification_id,
            session_id=aws_session_id,
            region=settings.aws_region,
            expires_at=expires_at,
        )

    def complete_enrollment_session(
        self,
        user_id: int,
        verification_id: str,
    ) -> FaceEnrollmentResponse:
        user = self._get_user(user_id)
        attempt = self.attempts.get_by_verification_id(verification_id)
        if attempt is None or attempt.user_id != user.id:
            raise ResourceNotFoundError("La sesión de registro facial no existe.")
        if attempt.status != "RegistroPendiente":
            raise ResourceConflictError("Esta sesión de registro facial ya fue utilizada.")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            self._finish_attempt(
                attempt,
                status="RegistroExpirado",
                completed_at=now,
            )
            raise ResourceConflictError(
                "La sesión de registro facial expiró. Inicia una nueva."
            )

        result = self.gateway.get_liveness_result(attempt.aws_session_id)
        if (
            result.status != "SUCCEEDED"
            or result.confidence < settings.face_liveness_threshold
            or not result.reference_image
        ):
            self._finish_attempt(
                attempt,
                status="RegistroRechazado",
                completed_at=now,
                liveness_confidence=result.confidence,
            )
            raise ResourceConflictError(
                "No se pudo confirmar una prueba de vida válida para el registro."
            )

        new_face_id = self.gateway.index_face(
            result.reference_image,
            external_image_id=f"matrixflow-user-{user.id}",
        )
        previous_face_id = user.aws_face_id
        enrolled_at = datetime.now(timezone.utc)
        with self.transaction():
            self.users.update(
                user,
                {
                    "aws_face_id": new_face_id,
                    "face_enrolled_at": enrolled_at,
                },
            )
            self.attempts.update(
                attempt,
                {
                    "status": "RegistroVerificado",
                    "completed_at": enrolled_at,
                    "liveness_confidence": result.confidence,
                },
            )

        if previous_face_id and previous_face_id != new_face_id:
            try:
                self.gateway.delete_face(previous_face_id)
            except Exception:
                logger.exception("Could not remove the superseded Rekognition face")

        return FaceEnrollmentResponse(
            user_id=user.id,
            face_enrolled=True,
            enrolled_at=enrolled_at,
        )

    def complete_session(self, verification_id: str) -> FaceLoginResponse:
        attempt = self.attempts.get_by_verification_id(verification_id)
        if attempt is None:
            raise ResourceNotFoundError("La verificación facial no existe.")
        if attempt.status != "Pendiente":
            raise ResourceConflictError("Esta verificación facial ya fue utilizada.")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            self._finish_attempt(attempt, status="Expirada", completed_at=now)
            raise AuthenticationError(
                "La sesión facial expiró. Inicia una verificación nueva."
            )

        result = self.gateway.get_liveness_result(attempt.aws_session_id)
        if (
            result.status != "SUCCEEDED"
            or result.confidence < settings.face_liveness_threshold
            or not result.reference_image
        ):
            self._finish_attempt(
                attempt,
                status="Rechazada",
                completed_at=now,
                liveness_confidence=result.confidence,
            )
            raise AuthenticationError("No se pudo confirmar una prueba de vida válida.")

        user = attempt.user
        if user.status != RecordStatus.ACTIVE.value or user.aws_face_id is None:
            self._finish_attempt(attempt, status="Rechazada", completed_at=now)
            raise AuthenticationError("La cuenta no está habilitada para acceso facial.")

        similarity = self.gateway.find_similarity(
            result.reference_image,
            expected_face_id=user.aws_face_id,
        )
        if similarity is None:
            self._finish_attempt(
                attempt,
                status="Rechazada",
                completed_at=now,
                liveness_confidence=result.confidence,
            )
            raise AuthenticationError("El rostro no coincide con la cuenta identificada.")

        self._finish_attempt(
            attempt,
            status="Verificada",
            completed_at=now,
            liveness_confidence=result.confidence,
            face_similarity=similarity,
        )
        authenticated_user = AuthenticatedUser(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
        )
        return FaceLoginResponse(
            access_token=create_access_token(
                user_id=user.id,
                email=user.email,
                role=user.role,
            ),
            user=authenticated_user,
        )

    def _finish_attempt(
        self,
        attempt: FaceVerificationAttempt,
        *,
        status: str,
        completed_at: datetime,
        liveness_confidence: float | None = None,
        face_similarity: float | None = None,
    ) -> None:
        with self.transaction():
            self.attempts.update(
                attempt,
                {
                    "status": status,
                    "completed_at": completed_at,
                    "liveness_confidence": liveness_confidence,
                    "face_similarity": face_similarity,
                },
            )

    def _get_user(self, user_id: int) -> User:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise ResourceNotFoundError("El usuario solicitado no existe.")
        return user
