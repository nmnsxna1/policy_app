from sqlalchemy.orm import Session
from typing import Optional

from app.models.applicant_detail import ApplicantDetail
from app.repositories.base import BaseRepository


class ApplicantDetailRepository(BaseRepository[ApplicantDetail]):
    def __init__(self, db: Session):
        super().__init__(db, ApplicantDetail)

    def get_by_application_id(self, application_id: int) -> Optional[ApplicantDetail]:
        return self.db.query(ApplicantDetail).filter(ApplicantDetail.application_id == application_id).first()
