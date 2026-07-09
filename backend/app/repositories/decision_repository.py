from sqlalchemy.orm import Session
from typing import List

from app.models.decision import Decision
from app.repositories.base import BaseRepository


class DecisionRepository(BaseRepository[Decision]):
    def __init__(self, db: Session):
        super().__init__(db, Decision)

    def get_by_application_id(self, application_id: int) -> List[Decision]:
        return self.db.query(Decision).filter(Decision.application_id == application_id).order_by(Decision.created_at.desc()).all()
