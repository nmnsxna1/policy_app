from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ApplicantDetail(Base):
    __tablename__ = "applicant_details"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    aadhaar = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    employer = Column(String, nullable=True)
    annual_income = Column(Float, nullable=True)
    monthly_income = Column(Float, nullable=True)
    coverage_amount = Column(Float, nullable=True)
    policy_type = Column(String, nullable=True)
    credit_score = Column(Integer, nullable=True)
    bank_details = Column(Text, nullable=True)
    nominee = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    raw_extracted_json = Column(Text, nullable=True)

    application = relationship("Application", back_populates="applicant_details")
