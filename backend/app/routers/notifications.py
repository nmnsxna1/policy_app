from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user["user_id"]
    repo = NotificationRepository(db)
    notifications = repo.get_recent_by_user(user_id)
    unread_count = repo.unread_count(user_id)
    return {
        "notifications": [
            {
                "id": n.id,
                "application_id": n.application_id,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = NotificationRepository(db)
    repo.mark_as_read(notification_id)
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = NotificationRepository(db)
    repo.mark_all_as_read(current_user["user_id"])
    return {"ok": True}
