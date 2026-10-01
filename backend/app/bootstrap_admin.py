"""Create the first real administrator from operator-supplied environment values."""

import os

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.user_service import UserService


def main() -> None:
    keys = ("MATRIXFLOW_ADMIN_NAME", "MATRIXFLOW_ADMIN_EMAIL", "MATRIXFLOW_ADMIN_PASSWORD")
    missing = [key for key in keys if not os.environ.get(key)]
    if missing:
        raise SystemExit(f"Faltan variables de entorno: {', '.join(missing)}")

    with SessionLocal() as session:
        if session.scalar(select(User.id).limit(1)) is not None:
            raise SystemExit("Ya hay usuarios registrados. Gestiona las cuentas desde Usuarios.")
        user = UserCreate(
            name=os.environ[keys[0]],
            email=os.environ[keys[1]],
            password=os.environ[keys[2]],
            role="Administrador",
        )
        UserService(session).create(user)
    print("Administrador inicial creado.")


if __name__ == "__main__":
    main()
