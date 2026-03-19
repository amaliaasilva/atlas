from datetime import datetime
from pydantic import BaseModel, Field


class AssumptionCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=50)
    sort_order: int = 0


class AssumptionCategoryCreate(AssumptionCategoryBase):
    business_id: str


class AssumptionCategoryOut(AssumptionCategoryBase):
    id: str
    business_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssumptionDefinitionBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    data_type: str = "currency"
    unit_of_measure: str | None = None
    default_value: float | None = None
    editable: bool = True
    periodicity: str = "monthly"
    applies_to: str = "version"
    sort_order: int = 0


class AssumptionDefinitionCreate(AssumptionDefinitionBase):
    business_id: str
    category_id: str


class AssumptionDefinitionOut(AssumptionDefinitionBase):
    id: str
    business_id: str
    category_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssumptionValueBase(BaseModel):
    period_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}$")  # "YYYY-MM"
    value_numeric: float | None = None
    value_text: str | None = None
    value_boolean: bool | None = None
    source_type: str = "manual"


class AssumptionValueCreate(AssumptionValueBase):
    assumption_definition_id: str
    budget_version_id: str


class AssumptionValueUpdate(BaseModel):
    value_numeric: float | None = None
    value_text: str | None = None
    value_boolean: bool | None = None
    period_date: str | None = None


class AssumptionValueOut(AssumptionValueBase):
    id: str
    budget_version_id: str
    assumption_definition_id: str
    updated_by: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssumptionValueBulkUpdate(BaseModel):
    """Batch update for a full set of assumption values for a budget version."""

    values: list[AssumptionValueCreate]
