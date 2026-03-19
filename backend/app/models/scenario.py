import uuid
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class ScenarioType(str, enum.Enum):
    base = "base"
    conservative = "conservative"
    aggressive = "aggressive"
    custom = "custom"


class Scenario(Base, TimestampMixin):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    scenario_type: Mapped[str] = mapped_column(
        SAEnum(ScenarioType), nullable=False, default=ScenarioType.base
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_scenario_business_name"),
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="scenarios")
    budget_versions: Mapped[list["BudgetVersion"]] = relationship(
        "BudgetVersion", back_populates="scenario"
    )
    consolidated_results: Mapped[list["ConsolidatedResult"]] = relationship(
        "ConsolidatedResult", back_populates="scenario"
    )
