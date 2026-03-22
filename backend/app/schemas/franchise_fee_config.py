"""Schemas Pydantic para FranchiseFeeConfig (split de receita franqueador/franqueado)."""

from datetime import datetime
from pydantic import BaseModel, Field


class FranchiseFeeConfigBase(BaseModel):
    platform_fee_pct: float = Field(0.10, ge=0.0, le=1.0)
    referral_commission_pct: float = Field(0.02, ge=0.0, le=1.0)


class FranchiseFeeConfigCreate(FranchiseFeeConfigBase):
    business_id: str


class FranchiseFeeConfigUpdate(BaseModel):
    platform_fee_pct: float | None = Field(None, ge=0.0, le=1.0)
    referral_commission_pct: float | None = Field(None, ge=0.0, le=1.0)


class FranchiseFeeConfigOut(FranchiseFeeConfigBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Response do endpoint /split
class RevenueSplitPeriod(BaseModel):
    period: str                        # Ex: "2026-01"
    gross_revenue: float
    franchisee_revenue: float          # gross_revenue × (1 - platform_fee_pct)
    platform_revenue: float            # gross_revenue × platform_fee_pct
    referral_commission: float         # franchisee_revenue × referral_commission_pct


class RevenueSplitResponse(BaseModel):
    version_id: str
    business_id: str
    platform_fee_pct: float
    referral_commission_pct: float
    periods: list[RevenueSplitPeriod]
    totals: RevenueSplitPeriod         # totais anualizados (period="TOTAL")
