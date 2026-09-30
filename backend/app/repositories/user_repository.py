from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.role import Role
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, User)

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.lower())
        return self.session.scalar(statement)

    def get_by_dni(self, dni: str) -> User | None:
        statement = select(User).where(User.dni == dni)
        return self.session.scalar(statement)


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Role)

    def get_by_name(self, name: str) -> Role | None:
        statement = select(Role).where(Role.name == name)
        return self.session.scalar(statement)
