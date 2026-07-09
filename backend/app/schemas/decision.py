from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DecisionOut(BaseModel):
    id: int
    application_id: int
    decision_maker_id: int
    decision: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DecisionCreate(BaseModel):
    decision: str
    reason: Optional[str] = None
