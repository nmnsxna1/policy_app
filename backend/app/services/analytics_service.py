from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.repositories.application_repository import ApplicationRepository
from app.repositories.decision_repository import DecisionRepository
from app.repositories.risk_assessment_repository import RiskAssessmentRepository
from app.models.application import Application, ApplicationStatus
from app.models.risk_assessment import RiskAssessment
from app.models.decision import Decision


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.app_repo = ApplicationRepository(db)
        self.decision_repo = DecisionRepository(db)
        self.risk_repo = RiskAssessmentRepository(db)

    def get_dashboard(self, days: int = 90) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        all_apps = self.db.query(Application).filter(
            Application.created_at >= cutoff
        ).all()

        total = len(all_apps)
        submitted = [a for a in all_apps if a.submitted_at is not None]
        submitted_count = len(submitted)

        status_counts = {}
        for app in all_apps:
            status_counts[app.status.value] = status_counts.get(app.status.value, 0) + 1

        approved = status_counts.get("APPROVED", 0)
        rejected = status_counts.get("REJECTED", 0)
        pending = status_counts.get("PENDING_PM_REVIEW", 0)
        escalated = status_counts.get("ESCALATED", 0)
        drafted = status_counts.get("DRAFT", 0)

        approval_rate = round((approved / submitted_count * 100), 1) if submitted_count > 0 else 0
        rejection_rate = round((rejected / submitted_count * 100), 1) if submitted_count > 0 else 0

        risk_levels = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
        risk_scores = []
        for app in all_apps:
            risk = self.risk_repo.get_by_application_id(app.id)
            if risk:
                rl = risk.risk_level.upper()
                if rl in risk_levels:
                    risk_levels[rl] += 1
                score = self._compute_risk_score(risk)
                risk_scores.append(score)

        avg_risk_score = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0

        applications = [self._app_to_list_item(a) for a in all_apps]

        return {
            "total_applications": total,
            "submitted_count": submitted_count,
            "approved_count": approved,
            "rejected_count": rejected,
            "pending_count": pending,
            "escalated_count": escalated,
            "draft_count": drafted,
            "approval_rate": approval_rate,
            "rejection_rate": rejection_rate,
            "avg_risk_score": avg_risk_score,
            "risk_distribution": risk_levels,
            "applications": applications,
        }

    def get_monthly_trends(self, days: int = 90) -> list:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        apps = self.db.query(Application).filter(
            Application.created_at >= cutoff
        ).order_by(Application.created_at).all()

        monthly = {}
        for app in apps:
            key = app.created_at.strftime("%Y-%m")
            if key not in monthly:
                monthly[key] = {"month": key, "submitted": 0, "approved": 0, "rejected": 0, "total": 0}
            monthly[key]["total"] += 1
            if app.status == ApplicationStatus.APPROVED:
                monthly[key]["approved"] += 1
            elif app.status == ApplicationStatus.REJECTED:
                monthly[key]["rejected"] += 1
            if app.submitted_at:
                monthly[key]["submitted"] += 1

        return sorted(monthly.values(), key=lambda x: x["month"])

    def get_risk_distribution(self) -> dict:
        risks = self.db.query(RiskAssessment).all()
        levels = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
        for r in risks:
            rl = r.risk_level.upper()
            if rl in levels:
                levels[rl] += 1
        total = sum(levels.values())
        return {
            "labels": list(levels.keys()),
            "values": list(levels.values()),
            "percentages": [
                round(v / total * 100, 1) if total > 0 else 0 for v in levels.values()
            ],
        }

    def _compute_risk_score(self, risk) -> int:
        level = risk.risk_level.upper()
        if level == "LOW":
            return 75
        elif level == "MEDIUM":
            return 45
        elif level == "HIGH":
            return 20
        return 50

    def _app_to_list_item(self, app) -> dict:
        risk = self.risk_repo.get_by_application_id(app.id)
        return {
            "id": app.id,
            "application_number": app.application_number,
            "status": app.status.value,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "risk_level": risk.risk_level if risk else None,
            "risk_score": self._compute_risk_score(risk) if risk else None,
        }
