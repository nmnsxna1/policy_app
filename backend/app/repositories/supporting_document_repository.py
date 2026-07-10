from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.supporting_document import SupportingDocument
from app.repositories.base import BaseRepository


class SupportingDocumentRepository(BaseRepository[SupportingDocument]):
    def __init__(self, db: Session):
        super().__init__(db, SupportingDocument)

    def get_by_application_id(self, application_id: int) -> List[SupportingDocument]:
        return self.db.query(SupportingDocument).filter(
            SupportingDocument.application_id == application_id
        ).order_by(SupportingDocument.uploaded_at.desc()).all()

    def get_by_id_and_application(self, doc_id: int, application_id: int) -> Optional[SupportingDocument]:
        return self.db.query(SupportingDocument).filter(
            SupportingDocument.id == doc_id,
            SupportingDocument.application_id == application_id,
        ).first()
