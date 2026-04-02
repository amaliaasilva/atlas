from datetime import datetime
from pydantic import BaseModel, Field


class ScenarioBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    scenario_type: str = "base"
    description: str | None = None
    occupancy_multiplier: float = 1.0


class ScenarioCreate(ScenarioBase):
    business_id: str


class ScenarioUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    occupancy_multiplier: float | None = None


class ScenarioOut(ScenarioBase):
    id: str
    business_id: str
    is_active: bool
    occupancy_multiplier: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
