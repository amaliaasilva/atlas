"""Init para schemas de AI."""

from app.services.ai.schemas.audit import AuditAlert, AuditReport
from app.services.ai.schemas.copilot import (
    FunctionCall,
    CopilotScenarioRequest,
    CopilotScenarioResponse,
)
from app.services.ai.schemas.geo_pricing import (
    GeoPricingRequest,
    GeoPricingReport,
    SuggestedPrice,
)

__all__ = [
    "AuditAlert",
    "AuditReport",
    "FunctionCall",
    "CopilotScenarioRequest",
    "CopilotScenarioResponse",
    "GeoPricingRequest",
    "GeoPricingReport",
    "SuggestedPrice",
]
