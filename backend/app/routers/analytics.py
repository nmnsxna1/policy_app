from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_analytics_dashboard(
    days: Optional[int] = Query(90, description="Lookback period in days"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Only managers can access analytics")
    service = AnalyticsService(db)
    return service.get_dashboard(days=days)


@router.get("/trends")
def get_analytics_trends(
    days: int = Query(90, description="Lookback period in days"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Only managers can access analytics")
    service = AnalyticsService(db)
    return service.get_monthly_trends(days=days)


@router.get("/risk-distribution")
def get_risk_distribution(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in ("POLICY_MANAGER", "SENIOR_MANAGER"):
        raise HTTPException(status_code=403, detail="Only managers can access analytics")
    service = AnalyticsService(db)
    return service.get_risk_distribution()
