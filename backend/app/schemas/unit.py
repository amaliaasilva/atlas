from datetime import datetime
from pydantic import BaseModel, Field


class UnitBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    opening_year: int | None = None
    status: str = "planning"
    city: str | None = None
    state: str | None = None
    area_m2: float | None = None
    notes: str | None = None
    sort_order: int = 0


class UnitCreate(UnitBase):
    business_id: str


class UnitUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    city: str | None = None
    state: str | None = None
    area_m2: float | None = None
    notes: str | None = None
    opening_year: int | None = None
    sort_order: int | None = None


class UnitOut(UnitBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
