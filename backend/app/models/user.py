from sqlalchemy import Column, Integer, String, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    APPLICANT = "APPLICANT"
    POLICY_MANAGER = "POLICY_MANAGER"
    SENIOR_MANAGER = "SENIOR_MANAGER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(SAEnum(UserRole), nullable=False)

    applications = relationship("Application", back_populates="applicant", foreign_keys="Application.applicant_id")
    decisions = relationship("Decision", back_populates="decision_maker")
    audit_logs = relationship("AuditLog", back_populates="user")
