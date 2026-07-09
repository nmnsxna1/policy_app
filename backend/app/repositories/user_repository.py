from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(db, User)

    def get_by_username(self, username: str) -> Optional[User]:
        return self.db.query(User).filter(User.username == username).first()

    def get_by_role(self, role: str) -> List[User]:
        return self.db.query(User).filter(User.role == role).all()
