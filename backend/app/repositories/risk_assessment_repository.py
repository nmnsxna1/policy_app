from sqlalchemy.orm import Session
from typing import Optional

from app.models.risk_assessment import RiskAssessment
from app.repositories.base import BaseRepository


class RiskAssessmentRepository(BaseRepository[RiskAssessment]):
    def __init__(self, db: Session):
        super().__init__(db, RiskAssessment)

    def get_by_application_id(self, application_id: int) -> Optional[RiskAssessment]:
        return self.db.query(RiskAssessment).filter(RiskAssessment.application_id == application_id).first()
