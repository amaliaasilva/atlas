"""Schemas Pydantic para ServicePlan (Planos de PT — Bronze/Prata/Ouro/Diamante)."""

from datetime import datetime
from pydantic import BaseModel, Field


class ServicePlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    description: str | None = None
    price_per_hour: float = Field(..., gt=0)
    target_mix_pct: float = Field(0.25, ge=0.0, le=1.0)
    min_classes_month: int = Field(0, ge=0)
    max_classes_month: int = Field(0, ge=0)
    sort_order: int = 0
    is_active: bool = True


class ServicePlanCreate(ServicePlanBase):
    business_id: str


class ServicePlanUpdate(BaseModel):
    name: str | None = None
    price_per_hour: float | None = None
    target_mix_pct: float | None = None
    min_classes_month: int | None = None
    max_classes_month: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ServicePlanOut(ServicePlanBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
