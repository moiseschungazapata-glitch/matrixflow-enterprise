from __future__ import annotations

from dataclasses import dataclass

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import app.models  # noqa: F401 - registers every SQLAlchemy table
from app.core.config import settings
from app.core.database import Base
from app.core.exceptions import (
    AuthenticationError,
    ResourceConflictError,
    ServiceUnavailableError,
)
from app.core.security import decode_access_token
from app.integrations.aws_rekognition import LivenessResult
from app.models.face_verification_attempt import FaceVerificationAttempt
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.face_identity_service import FaceIdentityService
from app.services.user_service import UserService


@dataclass
class FakeRekognitionGateway:
    similarity: float | None = 99.2
    liveness_confidence: float = 99.4
    deleted_face_id: str | None = None
    indexed_image: bytes | None = None

    def create_liveness_session(self, client_request_token: str) -> str:
        return f"aws-session-{client_request_token}"

    def get_liveness_result(self, session_id: str) -> LivenessResult:
        assert session_id.startswith("aws-session-")
        return LivenessResult(
            status="SUCCEEDED",
            confidence=self.liveness_confidence,
            reference_image=b"live-face",
        )

    def index_face(self, image: bytes, external_image_id: str) -> str:
        assert image in {b"reference-face", b"live-face"}
        assert external_image_id.startswith("matrixflow-user-")
        self.indexed_image = image
        return "aws-face-matrixflow-user"

    def delete_face(self, face_id: str) -> None:
        self.deleted_face_id = face_id

    def find_similarity(self, image: bytes, expected_face_id: str) -> float | None:
        assert image == b"live-face"
        assert expected_face_id == "aws-face-matrixflow-user"
        return self.similarity


@pytest.fixture
def session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


@pytest.fixture(autouse=True)
def enable_face_liveness(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "aws_face_liveness_enabled", True)


def create_face_user(session: Session) -> User:
    response = UserService(session).create(
        UserCreate(
            name="Usuario Biométrico",
            dni="99999999",
            nationality="Peruana",
            email="biometrico@matrixflow.pe",
            password="demo123",
            role="Administrador",
        )
    )
    user = session.scalar(select(User).where(User.id == response.id))
    assert user is not None
    return user


def test_enrollment_and_liveness_issue_a_real_application_session(
    session: Session,
) -> None:
    user = create_face_user(session)
    gateway = FakeRekognitionGateway()
    service = FaceIdentityService(session, gateway=gateway)

    enrollment = service.enroll_reference(user.id, b"reference-face")
    liveness_session = service.create_session("99999999")
    login = service.complete_session(liveness_session.verification_id)

    assert enrollment.face_enrolled is True
    assert login.verified is True
    assert login.user.id == user.id
    assert decode_access_token(login.access_token).sub == str(user.id)
    attempt = session.get(FaceVerificationAttempt, liveness_session.verification_id)
    assert attempt is not None
    assert attempt.status == "Verificada"
    assert attempt.liveness_confidence == pytest.approx(99.4)
    assert attempt.face_similarity == pytest.approx(99.2)


def test_wrong_face_is_rejected_without_issuing_a_token(session: Session) -> None:
    user = create_face_user(session)
    gateway = FakeRekognitionGateway(similarity=None)
    service = FaceIdentityService(session, gateway=gateway)
    service.enroll_reference(user.id, b"reference-face")
    liveness_session = service.create_session("99999999")

    with pytest.raises(AuthenticationError, match="no coincide"):
        service.complete_session(liveness_session.verification_id)

    attempt = session.get(FaceVerificationAttempt, liveness_session.verification_id)
    assert attempt is not None
    assert attempt.status == "Rechazada"


def test_live_enrollment_indexes_only_the_liveness_reference_image(
    session: Session,
) -> None:
    user = create_face_user(session)
    gateway = FakeRekognitionGateway()
    service = FaceIdentityService(session, gateway=gateway)

    enrollment_session = service.create_enrollment_session(user.id)
    enrollment = service.complete_enrollment_session(
        user.id,
        enrollment_session.verification_id,
    )

    assert enrollment.face_enrolled is True
    assert gateway.indexed_image == b"live-face"
    assert user.aws_face_id == "aws-face-matrixflow-user"
    attempt = session.get(
        FaceVerificationAttempt,
        enrollment_session.verification_id,
    )
    assert attempt is not None
    assert attempt.status == "RegistroVerificado"
    assert attempt.liveness_confidence == pytest.approx(99.4)


def test_live_enrollment_rejects_a_failed_liveness_check(
    session: Session,
) -> None:
    user = create_face_user(session)
    gateway = FakeRekognitionGateway(liveness_confidence=25.0)
    service = FaceIdentityService(session, gateway=gateway)

    enrollment_session = service.create_enrollment_session(user.id)
    with pytest.raises(ResourceConflictError, match="prueba de vida válida"):
        service.complete_enrollment_session(
            user.id,
            enrollment_session.verification_id,
        )

    assert gateway.indexed_image is None
    assert user.aws_face_id is None
    attempt = session.get(
        FaceVerificationAttempt,
        enrollment_session.verification_id,
    )
    assert attempt is not None
    assert attempt.status == "RegistroRechazado"


def test_disabled_face_liveness_never_calls_aws(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_face_user(session)
    monkeypatch.setattr(settings, "aws_face_liveness_enabled", False)

    with pytest.raises(ServiceUnavailableError, match="no está habilitada"):
        FaceIdentityService(session).enroll_reference(user.id, b"reference-face")
