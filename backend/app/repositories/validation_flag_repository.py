from sqlalchemy.orm import Session
from typing import List

from app.models.validation_flag import ValidationFlag
from app.repositories.base import BaseRepository


class ValidationFlagRepository(BaseRepository[ValidationFlag]):
    def __init__(self, db: Session):
        super().__init__(db, ValidationFlag)

    def get_by_application_id(self, application_id: int) -> List[ValidationFlag]:
        return self.db.query(ValidationFlag).filter(ValidationFlag.application_id == application_id).all()

    def delete_by_application_id(self, application_id: int) -> None:
        self.db.query(ValidationFlag).filter(ValidationFlag.application_id == application_id).delete()
        self.db.commit()
