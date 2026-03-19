from datetime import datetime
from pydantic import BaseModel, Field


class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")
    business_type: str = "cowork_gym"
    description: str | None = None


class BusinessCreate(BusinessBase):
    organization_id: str


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class BusinessOut(BusinessBase):
    id: str
    organization_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
