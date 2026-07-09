import logging
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import engine, Base, SessionLocal
from app.services.auth_service import AuthService
from app.routers import auth, applications, notifications
import app.models  # noqa — ensures all models are loaded for create_all

logging.basicConfig(level=logging.INFO, stream=sys.stdout, force=True)

app = FastAPI(title="Policy Approval Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(notifications.router)

try:
    app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")
except Exception:
    pass


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        AuthService.seed_users(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, use_colors=False)
