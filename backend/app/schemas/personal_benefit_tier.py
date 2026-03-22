"""Schemas Pydantic para PersonalBenefitTier (benefícios escalonados de PT por plano)."""

from datetime import datetime
from pydantic import BaseModel, Field


class PersonalBenefitTierBase(BaseModel):
    monthly_kit_value: float = Field(0.0, ge=0.0)
    insurance_value: float = Field(0.0, ge=0.0)
    bonus_pct_on_extra: float = Field(0.0, ge=0.0, le=1.0)


class PersonalBenefitTierCreate(PersonalBenefitTierBase):
    service_plan_id: str


class PersonalBenefitTierUpdate(BaseModel):
    monthly_kit_value: float | None = Field(None, ge=0.0)
    insurance_value: float | None = Field(None, ge=0.0)
    bonus_pct_on_extra: float | None = Field(None, ge=0.0, le=1.0)


class PersonalBenefitTierOut(PersonalBenefitTierBase):
    id: str
    service_plan_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
