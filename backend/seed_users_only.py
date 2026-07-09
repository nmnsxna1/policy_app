from app.core.database import SessionLocal
from app.services.auth_service import AuthService

db = SessionLocal()
AuthService.seed_users(db)
db.close()
print("Users seeded.")
