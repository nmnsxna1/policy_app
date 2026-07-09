from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: Session):
        super().__init__(db, Notification)

    def get_unread_by_user(self, user_id: int) -> List[Notification]:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).order_by(Notification.created_at.desc()).all()

    def get_recent_by_user(self, user_id: int, limit: int = 20) -> List[Notification]:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def mark_as_read(self, notification_id: int):
        n = self.db.query(Notification).filter(Notification.id == notification_id).first()
        if n:
            n.is_read = True
            self.db.commit()

    def mark_all_as_read(self, user_id: int):
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).update({"is_read": True})
        self.db.commit()

    def unread_count(self, user_id: int) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).count()
