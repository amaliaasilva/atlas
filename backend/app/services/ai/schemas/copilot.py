"""
Atlas Finance — AI Schemas: Copilot / Scenario
"""

from __future__ import annotations
from pydantic import BaseModel


class FunctionCall(BaseModel):
    function: str
    arguments: dict
    description: str = ""


class CopilotScenarioRequest(BaseModel):
    budget_version_id: str
    command: str
    dry_run: bool = True
    confirmed: bool = False


class CopilotScenarioResponse(BaseModel):
    status: str  # "planned" | "completed" | "error"
    planned_actions: list[FunctionCall] = []
    confirmation_required: bool = False
    actions_executed: list[dict] = []
    summary: str = ""
    model_used: str = "mock"
