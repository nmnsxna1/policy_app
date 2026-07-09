from pydantic import BaseModel
from datetime import datetime


class ValidationFlagOut(BaseModel):
    id: int
    application_id: int
    field_name: str
    message: str
    severity: str
    resolved: bool

    class Config:
        from_attributes = True
