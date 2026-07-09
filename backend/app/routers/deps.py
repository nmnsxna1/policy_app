from fastapi import Header, HTTPException, Depends
from typing import Optional

from app.core.security import decode_access_token


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {
        "user_id": int(payload.get("sub")),
        "role": payload.get("role"),
    }


def require_role(current_user: dict, required_role: str):
    if current_user.get("role") != required_role:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
