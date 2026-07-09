from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    UPLOADED = "UPLOADED"
    AI_PROCESSED = "AI_PROCESSED"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
    READY_TO_SUBMIT = "READY_TO_SUBMIT"
    PENDING_PM_REVIEW = "PENDING_PM_REVIEW"
    ESCALATED = "ESCALATED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


VALID_TRANSITIONS = {
    ApplicationStatus.DRAFT: [ApplicationStatus.UPLOADED, ApplicationStatus.WITHDRAWN],
    ApplicationStatus.UPLOADED: [ApplicationStatus.AI_PROCESSED, ApplicationStatus.WITHDRAWN],
    ApplicationStatus.AI_PROCESSED: [ApplicationStatus.CORRECTION_REQUIRED, ApplicationStatus.READY_TO_SUBMIT, ApplicationStatus.WITHDRAWN],
    ApplicationStatus.CORRECTION_REQUIRED: [ApplicationStatus.READY_TO_SUBMIT, ApplicationStatus.AI_PROCESSED, ApplicationStatus.WITHDRAWN],
    ApplicationStatus.READY_TO_SUBMIT: [ApplicationStatus.PENDING_PM_REVIEW, ApplicationStatus.WITHDRAWN],
    ApplicationStatus.PENDING_PM_REVIEW: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.ESCALATED],
    ApplicationStatus.ESCALATED: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
    ApplicationStatus.APPROVED: [],
    ApplicationStatus.REJECTED: [],
    ApplicationStatus.WITHDRAWN: [],
}


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String, unique=True, nullable=False, index=True)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime, nullable=True)

    applicant = relationship("User", back_populates="applications", foreign_keys=[applicant_id])
    applicant_details = relationship("ApplicantDetail", back_populates="application", uselist=False)
    validation_flags = relationship("ValidationFlag", back_populates="application")
    risk_assessment = relationship("RiskAssessment", back_populates="application", uselist=False)
    decisions = relationship("Decision", back_populates="application")
