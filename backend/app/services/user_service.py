from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ResourceConflictError, ResourceNotFoundError
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import RoleRepository, UserRepository
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.base import BaseService


class UserService(BaseService):
    def __init__(self, session: Session) -> None:
        super().__init__(session)
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)

    def list(self, *, offset: int = 0, limit: int = 100) -> list[UserResponse]:
        return [
            UserResponse.model_validate(user)
            for user in self.users.list(offset=offset, limit=limit)
        ]

    def get(self, user_id: int) -> UserResponse:
        return UserResponse.model_validate(self._get_user(user_id))

    def create(self, data: UserCreate) -> UserResponse:
        email = str(data.email).lower()
        if self.users.get_by_email(email) is not None:
            raise ResourceConflictError("Ya existe un usuario con ese correo.")
        if data.dni is not None and self.users.get_by_dni(data.dni) is not None:
            raise ResourceConflictError("Ya existe un usuario con ese DNI.")

        password_hash = hash_password(data.password)
        with self.transaction():
            role = self._get_or_create_role(data.role.value)
            user = User(
                name=data.name,
                dni=data.dni,
                nationality=data.nationality,
                email=email,
                password_hash=password_hash,
                role_record=role,
                status=data.status.value,
            )
            self.users.add(user)
        return UserResponse.model_validate(user)

    def update(self, user_id: int, data: UserUpdate) -> UserResponse:
        user = self._get_user(user_id)
        values = data.model_dump(exclude_unset=True, mode="json")

        email = values.get("email")
        if email is not None:
            email = email.lower()
            values["email"] = email
            existing = self.users.get_by_email(email)
            if existing is not None and existing.id != user.id:
                raise ResourceConflictError("Ya existe un usuario con ese correo.")

        dni = values.get("dni")
        if dni is not None:
            existing = self.users.get_by_dni(dni)
            if existing is not None and existing.id != user.id:
                raise ResourceConflictError("Ya existe un usuario con ese DNI.")

        password = values.pop("password", None)
        if password is not None:
            values["password_hash"] = hash_password(password)
        role_name = values.pop("role", None)
        with self.transaction():
            if role_name is not None:
                user.role_record = self._get_or_create_role(role_name)
            self.users.update(user, values)
        return UserResponse.model_validate(user)

    def delete(self, user_id: int) -> None:
        user = self._get_user(user_id)
        with self.transaction():
            self.users.delete(user)

    def _get_user(self, user_id: int) -> User:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise ResourceNotFoundError("El usuario solicitado no existe.")
        return user

    def _get_or_create_role(self, name: str) -> Role:
        role = self.roles.get_by_name(name)
        if role is None:
            role = self.roles.add(Role(name=name))
        return role
