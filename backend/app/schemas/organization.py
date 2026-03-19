from datetime import datetime
from pydantic import BaseModel, Field


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")
    description: str | None = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    is_active: bool | None = None


class OrganizationOut(OrganizationBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
