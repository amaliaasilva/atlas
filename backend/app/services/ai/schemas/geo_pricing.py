"""
Atlas Finance — AI Schemas: Geo-Pricing
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class SuggestedPrice(BaseModel):
    plan: str
    current: float
    suggested: float
    rationale: str


class GeoPricingReport(BaseModel):
    unit_id: str
    city: str = ""
    state: str = ""
    location_profile: dict = {}
    suggested_prices: list[SuggestedPrice] = []
    revenue_impact: dict = {}
    confidence: Literal["high", "medium", "low"] = "low"
    data_sources: list[str] = []
    caveats: list[str] = []
    generated_at: datetime = datetime.utcnow()
    model_used: str = "mock"


class GeoPricingRequest(BaseModel):
    unit_id: str
    location: str | None = None  # CEP, bairro/cidade
