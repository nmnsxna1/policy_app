from pydantic import BaseModel
from typing import Optional


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str

    class Config:
        from_attributes = True
