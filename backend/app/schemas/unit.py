from datetime import datetime, date
from pydantic import BaseModel, Field, model_validator
from typing import Literal


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

    # ── Campos derivados de abertura ──────────────────────────────────────────
    months_since_opening: int | None = None
    days_to_opening: int | None = None
    # "future" | "pre_opening" | "operating" | "closed" | None
    opening_phase: str | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_opening_fields(self) -> "UnitOut":
        today = date.today()
        od = self.opening_date

        if od is None:
            self.opening_phase = None
            return self

        delta = (today - od).days

        if self.status == "closed":
            self.opening_phase = "closed"
            self.months_since_opening = max(0, (today.year - od.year) * 12 + today.month - od.month)
        elif delta < 0:
            # ainda não abriu
            self.opening_phase = "future"
            self.days_to_opening = abs(delta)
        elif delta == 0:
            self.opening_phase = "operating"
            self.months_since_opening = 0
        else:
            self.opening_phase = "operating"
            self.months_since_opening = (today.year - od.year) * 12 + today.month - od.month

        return self
