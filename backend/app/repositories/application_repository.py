from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.application import Application, ApplicationStatus
from app.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self, db: Session):
        super().__init__(db, Application)

    def get_by_application_number(self, number: str) -> Optional[Application]:
        return self.db.query(Application).filter(Application.application_number == number).first()

    def get_by_applicant_id(self, applicant_id: int) -> List[Application]:
        return self.db.query(Application).filter(Application.applicant_id == applicant_id).order_by(Application.created_at.desc()).all()

    def get_by_status(self, status: ApplicationStatus) -> List[Application]:
        return self.db.query(Application).filter(Application.status == status).order_by(Application.created_at.desc()).all()

    def get_pending_review(self) -> List[Application]:
        return self.db.query(Application).filter(
            Application.status == ApplicationStatus.PENDING_PM_REVIEW
        ).order_by(Application.created_at.desc()).all()

    def get_escalated(self) -> List[Application]:
        return self.db.query(Application).filter(
            Application.status == ApplicationStatus.ESCALATED
        ).order_by(Application.created_at.desc()).all()

    def count_by_status(self, status: ApplicationStatus) -> int:
        return self.db.query(Application).filter(Application.status == status).count()

    def count_by_applicant_and_status(self, applicant_id: int, status: ApplicationStatus) -> int:
        return self.db.query(Application).filter(
            Application.applicant_id == applicant_id,
            Application.status == status,
        ).count()

    def search(self, query: str) -> List[Application]:
        return self.db.query(Application).filter(
            Application.application_number.contains(query)
        ).order_by(Application.created_at.desc()).all()
