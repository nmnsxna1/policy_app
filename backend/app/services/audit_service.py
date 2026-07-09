from sqlalchemy.orm import Session

from app.repositories.audit_log_repository import AuditLogRepository
from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.repo = AuditLogRepository(db)

    def log(self, user_id: int | None, application_id: int | None, action: str, old_value: str | None = None, new_value: str | None = None) -> None:
        entry = AuditLog(
            user_id=user_id,
            application_id=application_id,
            action=action,
            old_value=old_value,
            new_value=new_value,
        )
        self.repo.create(entry)

    def get_application_logs(self, application_id: int) -> list:
        return self.repo.get_by_application_id(application_id)
