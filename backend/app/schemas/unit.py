from datetime import datetime, date
from pydantic import BaseModel, Field


class UnitBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    # ARCH-03: data completa de inauguração (mês importa para offset no consolidado)
    opening_date: date | None = None
    status: str = "planning"
    city: str | None = None
    state: str | None = None
    area_m2: float | None = None
    notes: str | None = None
    sort_order: int = 0
    # GAP-01: parâmetros operacionais do coworking (slots / horário)
    slots_per_hour: int = 10
    hours_open_weekday: int = 17
    hours_open_saturday: int = 7


class UnitCreate(UnitBase):
    business_id: str


class UnitUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    city: str | None = None
    state: str | None = None
    area_m2: float | None = None
    notes: str | None = None
    opening_date: date | None = None
    sort_order: int | None = None
    slots_per_hour: int | None = None
    hours_open_weekday: int | None = None
    hours_open_saturday: int | None = None


class UnitOut(UnitBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
