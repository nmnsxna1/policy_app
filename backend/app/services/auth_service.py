from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token, hash_password
from app.models.user import UserRole


class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def authenticate(self, username: str, password: str) -> dict | None:
        user = self.user_repo.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            return None
        token = create_access_token({"sub": str(user.id), "role": user.role.value})
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role.value,
            "user_id": user.id,
            "username": user.username,
        }

    @staticmethod
    def seed_users(db: Session):
        repo = UserRepository(db)
        if repo.get_by_username("applicant"):
            return

        users = [
            {"username": "applicant", "password": "app123", "role": UserRole.APPLICANT, "email": "applicant@test.com"},
            {"username": "manager", "password": "manager123", "role": UserRole.POLICY_MANAGER, "email": "manager@test.com"},
            {"username": "senior", "password": "senior123", "role": UserRole.SENIOR_MANAGER, "email": "senior@test.com"},
        ]
        for u in users:
            from app.models.user import User
            user = User(
                username=u["username"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                email=u["email"],
            )
            repo.create(user)
