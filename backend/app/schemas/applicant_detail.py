from pydantic import BaseModel
from typing import Optional


class ApplicantDetailOut(BaseModel):
    id: int
    application_id: int
    full_name: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    employer: Optional[str] = None
    annual_income: Optional[float] = None
    monthly_income: Optional[float] = None
    coverage_amount: Optional[float] = None
    policy_type: Optional[str] = None
    credit_score: Optional[int] = None
    bank_details: Optional[str] = None
    nominee: Optional[str] = None
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicantDetailUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    employer: Optional[str] = None
    annual_income: Optional[float] = None
    monthly_income: Optional[float] = None
    coverage_amount: Optional[float] = None
    policy_type: Optional[str] = None
    credit_score: Optional[int] = None
    bank_details: Optional[str] = None
    nominee: Optional[str] = None
