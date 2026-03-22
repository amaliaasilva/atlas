"""
Atlas Finance — AI Schemas: Audit
"""
from __future__ import annotations
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class AuditAlert(BaseModel):
    severity: Literal["critical", "warning", "info"]
    category: str
    year: str | None = None
    message: str
    metric_affected: str = ""
    current_value: float | None = None
    threshold: float | None = None


class AuditReport(BaseModel):
    overall_health: Literal["healthy", "warning", "critical", "unavailable"] = "healthy"
    risk_score: int = Field(default=100, ge=0, le=100)
    alerts: list[AuditAlert] = []
    recommendations: list[str] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_used: str = "mock"
    version_id: str = ""
    tokens_used: int = 0
