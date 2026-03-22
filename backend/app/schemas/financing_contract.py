"""Schemas Pydantic para FinancingContract (múltiplos contratos por BudgetVersion)."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class FinancingContractBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    financed_amount: float = Field(..., ge=0)
    monthly_rate: float = Field(0.0, ge=0.0)  # ex: 0.012 = 1,2% a.m.
    term_months: int = Field(0, ge=0)  # 0 = pagamento único
    grace_period_months: int = Field(0, ge=0)
    down_payment_pct: float = Field(0.0, ge=0.0, le=1.0)
    start_date: date | None = None
    sort_order: int = 0


class FinancingContractCreate(FinancingContractBase):
    budget_version_id: str


class FinancingContractUpdate(BaseModel):
    name: str | None = None
    financed_amount: float | None = None
    monthly_rate: float | None = None
    term_months: int | None = None
    grace_period_months: int | None = None
    down_payment_pct: float | None = None
    start_date: date | None = None
    sort_order: int | None = None


class FinancingContractOut(FinancingContractBase):
    id: str
    budget_version_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
