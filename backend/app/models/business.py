import uuid
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class BusinessType(str, enum.Enum):
    cowork_gym = "cowork_gym"
    food_beverage = "food_beverage"
    retail = "retail"
    services = "services"
    other = "other"


class Business(Base, TimestampMixin):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    business_type: Mapped[str] = mapped_column(
        SAEnum(BusinessType), nullable=False, default=BusinessType.cowork_gym
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="businesses"
    )
    units: Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="business", cascade="all, delete-orphan"
    )
    scenarios: Mapped[list["Scenario"]] = relationship(
        "Scenario", back_populates="business", cascade="all, delete-orphan"
    )
    assumption_categories: Mapped[list["AssumptionCategory"]] = relationship(
        "AssumptionCategory", back_populates="business", cascade="all, delete-orphan"
    )
    assumption_definitions: Mapped[list["AssumptionDefinition"]] = relationship(
        "AssumptionDefinition", back_populates="business", cascade="all, delete-orphan"
    )
    line_item_definitions: Mapped[list["LineItemDefinition"]] = relationship(
        "LineItemDefinition", back_populates="business", cascade="all, delete-orphan"
    )
    consolidated_results: Mapped[list["ConsolidatedResult"]] = relationship(
        "ConsolidatedResult", back_populates="business"
    )
    service_plans: Mapped[list["ServicePlan"]] = relationship(
        "ServicePlan", back_populates="business", cascade="all, delete-orphan"
    )
