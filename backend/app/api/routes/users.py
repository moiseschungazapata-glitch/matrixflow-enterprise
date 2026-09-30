from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status

from app.api.dependencies import AdministratorUser, DatabaseSession
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.biometric import FaceEnrollmentResponse, FaceSessionResponse
from app.services.face_identity_service import FaceIdentityService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("", response_model=list[UserResponse])
def get_users(
    session: DatabaseSession,
    _current_user: AdministratorUser,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[UserResponse]:
    return UserService(session).list(offset=offset, limit=limit)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> UserResponse:
    return UserService(session).create(data)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> UserResponse:
    return UserService(session).get(user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> UserResponse:
    return UserService(session).update(user_id, data)


@router.post(
    "/{user_id}/face-reference",
    response_model=FaceEnrollmentResponse,
)
async def enroll_face_reference(
    user_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
    image: UploadFile = File(...),
) -> FaceEnrollmentResponse:
    if image.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="La fotografía debe estar en formato JPEG o PNG.",
        )
    content = await image.read()
    return FaceIdentityService(session).enroll_reference(user_id, content)


@router.post(
    "/{user_id}/face-enrollment/sessions",
    response_model=FaceSessionResponse,
)
def create_face_enrollment_session(
    user_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> FaceSessionResponse:
    return FaceIdentityService(session).create_enrollment_session(user_id)


@router.post(
    "/{user_id}/face-enrollment/sessions/{verification_id}/complete",
    response_model=FaceEnrollmentResponse,
)
def complete_face_enrollment_session(
    user_id: int,
    verification_id: UUID,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> FaceEnrollmentResponse:
    return FaceIdentityService(session).complete_enrollment_session(
        user_id,
        str(verification_id),
    )


@router.delete(
    "/{user_id}/face-reference",
    response_model=FaceEnrollmentResponse,
)
def remove_face_reference(
    user_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> FaceEnrollmentResponse:
    return FaceIdentityService(session).remove_reference(user_id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    session: DatabaseSession,
    _current_user: AdministratorUser,
) -> Response:
    user_service = UserService(session)
    user = user_service.get(user_id)
    if user.face_enrolled:
        FaceIdentityService(session).remove_reference(user_id)
    user_service.delete(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
