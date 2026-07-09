from pydantic import BaseModel
from typing import Optional


class RiskAssessmentOut(BaseModel):
    id: int
    application_id: int
    risk_level: str
    explanation: Optional[str] = None

    class Config:
        from_attributes = True
