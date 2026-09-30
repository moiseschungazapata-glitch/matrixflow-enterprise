from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.exceptions import ExternalServiceError, InvalidOperationError


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LivenessResult:
    status: str
    confidence: float
    reference_image: bytes


class AwsRekognitionGateway:
    """Small Rekognition adapter with no business or HTTP concerns."""

    def __init__(self, client: Any | None = None) -> None:
        self.client = client or boto3.client(
            "rekognition",
            region_name=settings.aws_region,
        )

    def create_liveness_session(self, client_request_token: str) -> str:
        response = self._call(
            self.client.create_face_liveness_session,
            ClientRequestToken=client_request_token,
            Settings={"AuditImagesLimit": 0},
        )
        session_id = response.get("SessionId")
        if not session_id:
            raise ExternalServiceError(
                "AWS no devolvió una sesión de verificación facial válida."
            )
        return str(session_id)

    def get_liveness_result(self, session_id: str) -> LivenessResult:
        response = self._call(
            self.client.get_face_liveness_session_results,
            SessionId=session_id,
        )
        reference_image = response.get("ReferenceImage", {}).get("Bytes", b"")
        return LivenessResult(
            status=str(response.get("Status", "UNKNOWN")),
            confidence=float(response.get("Confidence", 0.0)),
            reference_image=bytes(reference_image),
        )

    def index_face(self, image: bytes, external_image_id: str) -> str:
        response = self._call(
            self.client.index_faces,
            CollectionId=settings.aws_rekognition_collection_id,
            Image={"Bytes": image},
            ExternalImageId=external_image_id,
            MaxFaces=1,
            QualityFilter="AUTO",
            DetectionAttributes=["DEFAULT"],
        )
        records = response.get("FaceRecords", [])
        if len(records) != 1 or not records[0].get("Face", {}).get("FaceId"):
            raise InvalidOperationError(
                "No se detectó un rostro único y suficientemente claro en la fotografía."
            )
        return str(records[0]["Face"]["FaceId"])

    def delete_face(self, face_id: str) -> None:
        self._call(
            self.client.delete_faces,
            CollectionId=settings.aws_rekognition_collection_id,
            FaceIds=[face_id],
        )

    def find_similarity(self, image: bytes, expected_face_id: str) -> float | None:
        response = self._call(
            self.client.search_faces_by_image,
            CollectionId=settings.aws_rekognition_collection_id,
            Image={"Bytes": image},
            FaceMatchThreshold=settings.face_match_threshold,
            MaxFaces=5,
            QualityFilter="AUTO",
        )
        for match in response.get("FaceMatches", []):
            if str(match.get("Face", {}).get("FaceId")) == expected_face_id:
                return float(match.get("Similarity", 0.0))
        return None

    @staticmethod
    def _call(operation: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            return operation(**kwargs)
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Amazon Rekognition request failed")
            raise ExternalServiceError(
                "Amazon Rekognition no pudo completar la verificación."
            ) from exc
