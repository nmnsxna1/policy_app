from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ApplicationOut(BaseModel):
    id: int
    application_number: str
    applicant_id: int
    status: str
    pdf_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationListItem(BaseModel):
    id: int
    application_number: str
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationDetail(BaseModel):
    application: ApplicationOut
    applicant_details: Optional[dict] = None
    validation_flags: list = []
    risk_assessment: Optional[dict] = None
    decisions: list = []
