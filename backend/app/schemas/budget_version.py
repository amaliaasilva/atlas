from datetime import datetime, date
from pydantic import BaseModel, Field


class BudgetVersionBase(BaseModel):
    version_name: str = Field(..., min_length=2, max_length=100)
    status: str = "draft"
    effective_start_date: date | None = None
    effective_end_date: date | None = None
    notes: str | None = None


class BudgetVersionCreate(BudgetVersionBase):
    unit_id: str
    scenario_id: str


class BudgetVersionUpdate(BaseModel):
    version_name: str | None = None
    status: str | None = None
    notes: str | None = None
    effective_start_date: date | None = None
    effective_end_date: date | None = None


class BudgetVersionOut(BudgetVersionBase):
    id: str
    unit_id: str
    scenario_id: str
    created_by: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
