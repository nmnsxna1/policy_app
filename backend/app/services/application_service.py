import os
import json
import random
from datetime import datetime, timezone
from typing import Tuple, List

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.repositories.application_repository import ApplicationRepository
from app.repositories.applicant_detail_repository import ApplicantDetailRepository
from app.repositories.validation_flag_repository import ValidationFlagRepository
from app.repositories.risk_assessment_repository import RiskAssessmentRepository
from app.repositories.decision_repository import DecisionRepository
from app.repositories.user_repository import UserRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.supporting_document_repository import SupportingDocumentRepository
from app.models.application import Application, ApplicationStatus
from app.models.applicant_detail import ApplicantDetail
from app.models.risk_assessment import RiskAssessment
from app.models.decision import Decision
from app.models.validation_flag import ValidationFlag
from app.models.notification import Notification
from app.docling.processor import process_pdf
from app.ai.extractor import extract_from_text
from app.validation.engine import validate_applicant_detail
from app.risk.engine import assess_risk
from app.workflow.engine import can_transition
from app.services.audit_service import AuditService
from app.notifications.email_service import send_decision_email
from app.core.config import get_settings

settings = get_settings()


class ApplicationService:
    def __init__(self, db: Session):
        self.db = db
        self.app_repo = ApplicationRepository(db)
        self.detail_repo = ApplicantDetailRepository(db)
        self.flag_repo = ValidationFlagRepository(db)
        self.risk_repo = RiskAssessmentRepository(db)
        self.decision_repo = DecisionRepository(db)
        self.user_repo = UserRepository(db)
        self.notif_repo = NotificationRepository(db)
        self.supporting_doc_repo = SupportingDocumentRepository(db)
        self.audit = AuditService(db)

    def generate_application_number(self, policy_type: str | None) -> str:
        prefix = "PL"
        ym = datetime.now(timezone.utc).strftime('%Y%m')
        code_map = {
            "HEALTH": "HE", "CAR": "CA", "BIKE": "BI", "LIFE": "LI",
            "HOME": "HO", "TRAVEL": "TR", "OTHER": "OT",
        }
        code = code_map.get((policy_type or "").strip().upper(), "OT")
        for _ in range(5):
            like_pattern = f"{prefix}-{ym}-{code}%"
            existing = self.db.query(Application).filter(
                Application.application_number.like(like_pattern)
            ).all()
            max_seq = -1
            for app in existing:
                suffix = app.application_number.split('-')[-1]
                seq_part = suffix[2:] if len(suffix) > 2 else ''
                if seq_part.isdigit():
                    max_seq = max(max_seq, int(seq_part))
            seq = max_seq + 1
            candidate = f"{prefix}-{ym}-{code}{seq:04d}"
            existing_match = self.db.query(Application).filter(
                Application.application_number == candidate
            ).first()
            if not existing_match:
                return candidate
            # Collision — retry with random offset
            seq = max_seq + random.randint(1, 99)
            candidate = f"{prefix}-{ym}-{code}{seq:04d}"
            existing_match = self.db.query(Application).filter(
                Application.application_number == candidate
            ).first()
            if not existing_match:
                return candidate
        raise RuntimeError("Failed to generate unique application number after retries")

    def _maybe_regenerate_number(self, app: Application, policy_type: str | None) -> None:
        # Only regenerate if the current number still has the legacy/placeholder format
        if not policy_type:
            return
        current = app.application_number or ""
        code_map = {
            "HEALTH": "HE", "CAR": "CA", "BIKE": "BI", "LIFE": "LI",
            "HOME": "HO", "TRAVEL": "TR", "OTHER": "OT",
        }
        code = code_map.get(policy_type.strip().upper(), "OT")
        # If number is not PL-YYYYMM-<code>NNNN, regenerate it
        if not current.startswith(f"PL-{datetime.now(timezone.utc).strftime('%Y%m')}-{code}"):
            new_num = self.generate_application_number(policy_type)
            app.application_number = new_num
            self.db.commit()

    def create_draft(self, applicant_id: int) -> Application:
        for _ in range(5):
            try:
                app_num = self.generate_application_number(None)
                app = Application(
                    application_number=app_num,
                    applicant_id=applicant_id,
                    status=ApplicationStatus.DRAFT,
                )
                self.app_repo.create(app)
                self.audit.log(applicant_id, app.id, "APPLICATION_CREATED", new_value=app_num)
                return app
            except IntegrityError:
                self.db.rollback()
                continue
        raise RuntimeError("Failed to create draft after retries")

    def upload_pdf(self, application_id: int, applicant_id: int, file_path: str) -> Application:
        app = self.app_repo.get_by_id(application_id)
        if not app or app.applicant_id != applicant_id:
            raise ValueError("Application not found or access denied")
        can_transition(app.status, ApplicationStatus.UPLOADED)
        app.pdf_path = file_path
        app.status = ApplicationStatus.UPLOADED
        self.db.commit()
        self.db.refresh(app)
        self.audit.log(applicant_id, application_id, "PDF_UPLOADED", new_value=file_path)
        return app

    def process_with_ai(self, application_id: int, applicant_id: int) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app or app.applicant_id != applicant_id:
            raise ValueError("Application not found or access denied")
        if not app.pdf_path:
            raise ValueError("No PDF uploaded")

        doc_result = process_pdf(app.pdf_path)
        extracted = extract_from_text(doc_result["markdown"]) or {}

        detail = self.detail_repo.get_by_application_id(application_id)
        if not detail:
            detail = ApplicantDetail(application_id=application_id)
            self.detail_repo.create(detail)

        detail.full_name = extracted.get("full_name")
        detail.dob = extracted.get("dob")
        detail.age = extracted.get("age")
        detail.gender = extracted.get("gender")
        detail.pan = extracted.get("pan")
        detail.aadhaar = extracted.get("aadhaar")
        detail.address = extracted.get("address")
        detail.email = extracted.get("email")
        detail.phone = extracted.get("phone")
        detail.occupation = extracted.get("occupation")
        detail.employer = extracted.get("employer")
        detail.annual_income = extracted.get("annual_income")
        detail.monthly_income = extracted.get("monthly_income")
        detail.coverage_amount = extracted.get("coverage_amount") or extracted.get("loan_amount")
        detail.policy_type = extracted.get("policy_type") or extracted.get("loan_type")
        detail.credit_score = extracted.get("credit_score")
        detail.bank_details = extracted.get("bank_details")
        detail.nominee = extracted.get("nominee")
        detail.ai_summary = extracted.get("summary") or (
            "AI extraction unavailable — please review and fill the details manually."
            if not extracted else None
        )
        detail.raw_extracted_json = json.dumps(extracted)

        self.db.commit()

        app.status = ApplicationStatus.AI_PROCESSED
        self.db.commit()
        self.db.refresh(app)

        self._maybe_regenerate_number(app, detail.policy_type)

        self.audit.log(applicant_id, application_id, "AI_PROCESSED", new_value=json.dumps(extracted))

        # Notify applicant
        notif = Notification(
            user_id=applicant_id,
            application_id=application_id,
            message=f"Your policy application has been processed. Please review the extracted details.",
            notification_type="INFO",
        )
        self.notif_repo.create(notif)

        flags = validate_applicant_detail(self._detail_to_dict(detail))
        self.flag_repo.delete_by_application_id(application_id)
        for f in flags:
            flag = ValidationFlag(
                application_id=application_id,
                field_name=f["field_name"],
                message=f["message"],
                severity=f["severity"],
                resolved=bool(f.get("resolved", False)),
            )
            self.flag_repo.create(flag)

        risk_level, risk_explanation = assess_risk(self._detail_to_dict(detail), flags)
        existing_risk = self.risk_repo.get_by_application_id(application_id)
        if existing_risk:
            existing_risk.risk_level = risk_level
            existing_risk.explanation = risk_explanation
        else:
            risk = RiskAssessment(
                application_id=application_id,
                risk_level=risk_level,
                explanation=risk_explanation,
            )
            self.risk_repo.create(risk)
        self.db.commit()

        return self._build_detail_response(app)

    def update_detail(self, application_id: int, applicant_id: int, data: dict) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app or app.applicant_id != applicant_id:
            raise ValueError("Application not found or access denied")

        detail = self.detail_repo.get_by_application_id(application_id)
        if not detail:
            raise ValueError("No detail record")

        old_data = self._detail_to_dict(detail)

        for key, val in data.items():
            if val is not None and hasattr(detail, key):
                setattr(detail, key, val)
        self.db.commit()

        if data.get("policy_type") is not None:
            self._maybe_regenerate_number(app, detail.policy_type)

        self.audit.log(
            applicant_id, application_id, "DETAIL_UPDATED",
            old_value=json.dumps(old_data, default=str),
            new_value=json.dumps(data, default=str),
        )

        flags = validate_applicant_detail(self._detail_to_dict(detail))
        self.flag_repo.delete_by_application_id(application_id)
        for f in flags:
            flag = ValidationFlag(
                application_id=application_id,
                field_name=f["field_name"],
                message=f["message"],
                severity=f["severity"],
            )
            self.flag_repo.create(flag)

        risk_level, risk_explanation = assess_risk(self._detail_to_dict(detail), flags)
        existing_risk = self.risk_repo.get_by_application_id(application_id)
        if existing_risk:
            existing_risk.risk_level = risk_level
            existing_risk.explanation = risk_explanation
        else:
            risk = RiskAssessment(
                application_id=application_id,
                risk_level=risk_level,
                explanation=risk_explanation,
            )
            self.risk_repo.create(risk)
        self.db.commit()

        return self._build_detail_response(app)

    def submit_application(self, application_id: int, applicant_id: int) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app or app.applicant_id != applicant_id:
            raise ValueError("Application not found or access denied")

        flags = self.flag_repo.get_by_application_id(application_id)
        unresolved = [f for f in flags if f.severity == "ERROR" and not f.resolved]
        if unresolved:
            raise ValueError("Cannot submit: unresolved validation errors exist")

        if not can_transition(app.status, ApplicationStatus.READY_TO_SUBMIT):
            raise ValueError(f"Cannot submit from status {app.status.value}")

        app.status = ApplicationStatus.READY_TO_SUBMIT
        app.submitted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(app)

        # Auto-advance to pending review
        app.status = ApplicationStatus.PENDING_PM_REVIEW
        self.db.commit()
        self.db.refresh(app)

        self.audit.log(applicant_id, application_id, "APPLICATION_SUBMITTED")

        # Notify applicant
        notif = Notification(
            user_id=applicant_id,
            application_id=application_id,
            message=f"Your policy application {app.application_number} has been submitted for review.",
            notification_type="INFO",
        )
        self.notif_repo.create(notif)

        return self._build_detail_response(app)

    def get_dashboard(self, user_id: int, role: str) -> dict:
        if role == "APPLICANT":
            apps = self.app_repo.get_by_applicant_id(user_id)
            draft_queue = sum(1 for a in apps if a.status in (
                ApplicationStatus.DRAFT, ApplicationStatus.UPLOADED,
                ApplicationStatus.AI_PROCESSED))
            in_review = sum(1 for a in apps if a.status == ApplicationStatus.PENDING_PM_REVIEW)
            flagged = sum(1 for a in apps if a.status == ApplicationStatus.CORRECTION_REQUIRED)
            approved = sum(1 for a in apps if a.status == ApplicationStatus.APPROVED)
            rejected = sum(1 for a in apps if a.status == ApplicationStatus.REJECTED)
            return {
                "draft_count": draft_queue,
                "in_review_count": in_review,
                "flagged_count": flagged,
                "approved_count": approved,
                "rejected_count": rejected,
                "applications": [self._app_to_list_item(a) for a in apps],
            }
        elif role == "POLICY_MANAGER":
            pending = self.app_repo.get_pending_review()
            escalated = self.app_repo.get_escalated()
            return {
                "pending_count": len(pending),
                "escalated_count": len(escalated),
                "pending_applications": [self._app_to_list_item(a) for a in pending],
                "escalated_applications": [self._app_to_list_item(a) for a in escalated],
            }
        elif role == "SENIOR_MANAGER":
            escalated = self.app_repo.get_escalated()
            total = self.app_repo.list_all()
            return {
                "pending_count": len(escalated),
                "total_count": len(total),
                "escalated_applications": [self._app_to_list_item(a) for a in escalated],
            }
        return {}

    def get_application_detail(self, application_id: int) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app:
            raise ValueError("Application not found")
        return self._build_detail_response(app)

    def approve_application(self, application_id: int, manager_id: int, role: str, reason: str = None) -> dict:
        return self._make_decision(application_id, manager_id, role, "APPROVED", reason)

    def reject_application(self, application_id: int, manager_id: int, role: str, reason: str = None) -> dict:
        return self._make_decision(application_id, manager_id, role, "REJECTED", reason)

    def escalate_application(self, application_id: int, manager_id: int, reason: str = None) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app:
            raise ValueError("Application not found")
        if not can_transition(app.status, ApplicationStatus.ESCALATED):
            raise ValueError(f"Cannot escalate from {app.status.value}")

        app.status = ApplicationStatus.ESCALATED
        self.db.commit()
        self.db.refresh(app)

        decision = Decision(
            application_id=application_id,
            decision_maker_id=manager_id,
            decision="ESCALATED",
            reason=reason,
        )
        self.decision_repo.create(decision)
        self.audit.log(manager_id, application_id, "ESCALATED", new_value=reason)

        # Notify applicant
        notif = Notification(
            user_id=app.applicant_id,
            application_id=application_id,
            message=f"Your policy application {app.application_number} has been escalated for senior review.",
            notification_type="ESCALATED",
        )
        self.notif_repo.create(notif)

        # Notify senior managers
        senior_managers = self.user_repo.get_by_role("SENIOR_MANAGER")
        for sm in senior_managers:
            notif = Notification(
                user_id=sm.id,
                application_id=application_id,
                message=f"Policy application {app.application_number} has been escalated for review.",
                notification_type="ESCALATED",
            )
            self.notif_repo.create(notif)

        return self._build_detail_response(app)

    def search_applications(self, query: str) -> list:
        return [self._app_to_list_item(a) for a in self.app_repo.search(query)]

    def advanced_search(self, query: str = "", status: str = "", risk_level: str = "",
                        policy_type: str = "", date_from: str = "", date_to: str = "") -> list:
        q = self.db.query(Application)

        if query:
            q = q.filter(Application.application_number.contains(query))

        if status:
            try:
                status_enum = ApplicationStatus(status)
                q = q.filter(Application.status == status_enum)
            except ValueError:
                pass

        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                q = q.filter(Application.created_at >= dt_from)
            except (ValueError, TypeError):
                pass

        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                q = q.filter(Application.created_at <= dt_to)
            except (ValueError, TypeError):
                pass

        apps = q.order_by(Application.created_at.desc()).all()

        results = []
        for app in apps:
            item = self._app_to_list_item(app)
            if risk_level or policy_type:
                detail = self.detail_repo.get_by_application_id(app.id)
                risk = self.risk_repo.get_by_application_id(app.id)
                rl = risk.risk_level.upper() if risk else ""
                pt = (detail.policy_type or "").upper() if detail else ""
                if risk_level and rl != risk_level.upper():
                    continue
                if policy_type and pt != policy_type.upper():
                    continue
                item["risk_level"] = risk.risk_level if risk else None
                item["policy_type"] = detail.policy_type if detail else None
            results.append(item)

        return results

    def withdraw_application(self, application_id: int, applicant_id: int) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app or app.applicant_id != applicant_id:
            raise ValueError("Application not found or access denied")
        if not can_transition(app.status, ApplicationStatus.WITHDRAWN):
            raise ValueError(f"Cannot withdraw from status {app.status.value}")

        app.status = ApplicationStatus.WITHDRAWN
        self.db.commit()
        self.db.refresh(app)

        self.audit.log(applicant_id, application_id, "APPLICATION_WITHDRAWN")
        return self._build_detail_response(app)

    def _make_decision(self, application_id: int, manager_id: int, role: str, decision_type: str, reason: str = None) -> dict:
        app = self.app_repo.get_by_id(application_id)
        if not app:
            raise ValueError("Application not found")

        if role == "POLICY_MANAGER":
            expected_status = ApplicationStatus.PENDING_PM_REVIEW
        elif role == "SENIOR_MANAGER":
            expected_status = ApplicationStatus.ESCALATED
        else:
            raise ValueError("Unauthorized role for decision")

        if app.status != expected_status:
            raise ValueError(f"Application is in {app.status.value}, expected {expected_status.value}")

        if not can_transition(app.status, ApplicationStatus(decision_type)):
            raise ValueError(f"Cannot {decision_type.lower()} from {app.status.value}")

        app.status = ApplicationStatus(decision_type)
        self.db.commit()
        self.db.refresh(app)

        decision = Decision(
            application_id=application_id,
            decision_maker_id=manager_id,
            decision=decision_type,
            reason=reason,
        )
        self.decision_repo.create(decision)
        self.audit.log(manager_id, application_id, f"{decision_type}", new_value=reason)

        # Send notifications in background threads
        detail = self.detail_repo.get_by_application_id(application_id)
        if detail and detail.email:
            send_decision_email(
                recipient_email=detail.email,
                application_number=app.application_number,
                decision=decision_type,
                reason=reason,
                applicant_name=detail.full_name,
                loan_amount=detail.coverage_amount,
                loan_type=detail.policy_type,
            )

        # Create notification for applicant
        if app.applicant_id:
            notif = Notification(
                user_id=app.applicant_id,
                application_id=application_id,
                message=f"Your policy application {app.application_number} has been {decision_type.lower()}.",
                notification_type=decision_type,
            )
            self.notif_repo.create(notif)

        return self._build_detail_response(app)

    def _detail_to_dict(self, detail) -> dict:
        if not detail:
            return {}
        return {
            "full_name": detail.full_name,
            "dob": detail.dob,
            "age": detail.age,
            "gender": detail.gender,
            "pan": detail.pan,
            "aadhaar": detail.aadhaar,
            "address": detail.address,
            "email": detail.email,
            "phone": detail.phone,
            "occupation": detail.occupation,
            "employer": detail.employer,
            "annual_income": detail.annual_income,
            "monthly_income": detail.monthly_income,
            "coverage_amount": detail.coverage_amount,
            "policy_type": detail.policy_type,
            "credit_score": detail.credit_score,
            "bank_details": detail.bank_details,
            "nominee": detail.nominee,
        }

    def _build_detail_response(self, app) -> dict:
        try:
            detail = self.detail_repo.get_by_application_id(app.id)
            flags = self.flag_repo.get_by_application_id(app.id)
            risk = self.risk_repo.get_by_application_id(app.id)
            decisions = self.decision_repo.get_by_application_id(app.id)
        except Exception:
            import traceback
            traceback.print_exc()
            raise ValueError("Database error fetching application details")

        supporting_docs = self.supporting_doc_repo.get_by_application_id(app.id)

        return {
            "application": {
                "id": app.id,
                "application_number": app.application_number,
                "applicant_id": app.applicant_id,
                "status": app.status.value,
                "pdf_path": app.pdf_path,
                "created_at": app.created_at.isoformat() if app.created_at else None,
                "updated_at": app.updated_at.isoformat() if app.updated_at else None,
                "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
            },
            "supporting_documents": [
                {
                    "id": d.id,
                    "application_id": d.application_id,
                    "doc_type": d.doc_type,
                    "filename": d.filename,
                    "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
                }
                for d in supporting_docs
            ],
            "applicant_details": {
                "id": detail.id,
                "application_id": detail.application_id,
                "full_name": detail.full_name,
                "dob": detail.dob,
                "age": detail.age,
                "gender": detail.gender,
                "pan": detail.pan,
                "aadhaar": detail.aadhaar,
                "address": detail.address,
                "email": detail.email,
                "phone": detail.phone,
                "occupation": detail.occupation,
                "employer": detail.employer,
                "annual_income": detail.annual_income,
                "monthly_income": detail.monthly_income,
                "coverage_amount": detail.coverage_amount,
                "policy_type": detail.policy_type,
                "credit_score": detail.credit_score,
                "bank_details": detail.bank_details,
                "nominee": detail.nominee,
                "ai_summary": detail.ai_summary,
            } if detail else None,
            "validation_flags": [
                {"id": f.id, "field_name": f.field_name, "message": f.message, "severity": f.severity, "resolved": f.resolved}
                for f in flags
            ],
            "risk_assessment": {
                "id": risk.id,
                "application_id": risk.application_id,
                "risk_level": risk.risk_level,
                "explanation": risk.explanation,
            } if risk else None,
            "decisions": [
                {"id": d.id, "application_id": d.application_id, "decision_maker_id": d.decision_maker_id,
                 "decision": d.decision, "reason": d.reason, "created_at": d.created_at.isoformat() if d.created_at else None}
                for d in decisions
            ],
        }

    def _app_to_list_item(self, app) -> dict:
        return {
            "id": app.id,
            "application_number": app.application_number,
            "status": app.status.value,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        }
