from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session):
        super().__init__(db, AuditLog)

    def get_by_application_id(self, application_id: int) -> List[AuditLog]:
        return self.db.query(AuditLog).filter(AuditLog.application_id == application_id).order_by(AuditLog.timestamp.desc()).all()
