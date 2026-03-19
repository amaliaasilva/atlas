import uuid
from datetime import date
from sqlalchemy import String, Text, ForeignKey, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class VersionStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class BudgetVersion(Base, TimestampMixin):
    __tablename__ = "budget_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id: Mapped[str] = mapped_column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    scenario_id: Mapped[str] = mapped_column(String(36), ForeignKey("scenarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    version_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(VersionStatus), nullable=False, default=VersionStatus.draft)
    effective_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="budget_versions")
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="budget_versions")
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])
    assumption_values: Mapped[list["AssumptionValue"]] = relationship("AssumptionValue", back_populates="budget_version", cascade="all, delete-orphan")
    calculated_results: Mapped[list["CalculatedResult"]] = relationship("CalculatedResult", back_populates="budget_version", cascade="all, delete-orphan")
