from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    ApplicationError,
    AuthenticationError,
    ExternalServiceError,
    PermissionDeniedError,
    PersistenceError,
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceUnavailableError,
    TooManyRequestsError,
)


ERROR_STATUS_CODES: dict[type[ApplicationError], int] = {
    ResourceNotFoundError: status.HTTP_404_NOT_FOUND,
    ResourceConflictError: status.HTTP_409_CONFLICT,
    AuthenticationError: status.HTTP_401_UNAUTHORIZED,
    PermissionDeniedError: status.HTTP_403_FORBIDDEN,
    PersistenceError: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
    ServiceUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
    TooManyRequestsError: status.HTTP_429_TOO_MANY_REQUESTS,
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApplicationError)
    async def handle_application_error(
        _request: Request,
        exc: ApplicationError,
    ) -> JSONResponse:
        response_status = next(
            (
                status_code
                for error_type, status_code in ERROR_STATUS_CODES.items()
                if isinstance(exc, error_type)
            ),
            status.HTTP_400_BAD_REQUEST,
        )
        headers = (
            {"WWW-Authenticate": "Bearer"}
            if isinstance(exc, AuthenticationError)
            else None
        )
        return JSONResponse(
            status_code=response_status,
            content={"detail": str(exc), "code": exc.code},
            headers=headers,
        )
