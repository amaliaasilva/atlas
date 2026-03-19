from datetime import datetime
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5)
    full_name: str = Field(..., min_length=2, max_length=200)
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: str | None = None
    status: str | None = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    status: str
    is_superuser: bool
    created_at: datetime

    model_config = {"from_attributes": True}
