import uuid
from datetime import datetime
from sqlalchemy import (
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Enum as SAEnum,
    JSON,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class DataType(str, enum.Enum):
    numeric = "numeric"
    percentage = "percentage"
    boolean = "boolean"
    text = "text"
    currency = "currency"
    integer = "integer"


class Periodicity(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"
    one_time = "one_time"
    static = "static"


class AppliesTo(str, enum.Enum):
    business = "business"
    unit = "unit"
    scenario = "scenario"
    version = "version"


class SourceType(str, enum.Enum):
    manual = "manual"
    imported = "imported"
    derived = "derived"


class AssumptionCategory(Base, TimestampMixin):
    __tablename__ = "assumption_categories"

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
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship(
        "Business", back_populates="assumption_categories"
    )
    definitions: Mapped[list["AssumptionDefinition"]] = relationship(
        "AssumptionDefinition", back_populates="category", cascade="all, delete-orphan"
    )


class AssumptionDefinition(Base, TimestampMixin):
    __tablename__ = "assumption_definitions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assumption_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_type: Mapped[str] = mapped_column(
        SAEnum(DataType), nullable=False, default=DataType.currency
    )
    unit_of_measure: Mapped[str | None] = mapped_column(String(50), nullable=True)
    default_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    editable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    periodicity: Mapped[str] = mapped_column(
        SAEnum(Periodicity), nullable=False, default=Periodicity.monthly
    )
    applies_to: Mapped[str] = mapped_column(
        SAEnum(AppliesTo), nullable=False, default=AppliesTo.version
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_in_dre: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    ui_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # ARCH-01: granularidade explícita (monthly / yearly / one_time)
    granularity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="monthly"
    )
    # ARCH-04: regra de progressão anual (JSON: {type, rate, base_year, …})
    growth_rule: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship(
        "Business", back_populates="assumption_definitions"
    )
    category: Mapped["AssumptionCategory"] = relationship(
        "AssumptionCategory", back_populates="definitions"
    )
    values: Mapped[list["AssumptionValue"]] = relationship(
        "AssumptionValue", back_populates="definition", cascade="all, delete-orphan"
    )


class AssumptionValue(Base):
    __tablename__ = "assumption_values"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    budget_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("budget_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assumption_definition_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assumption_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_date: Mapped[str | None] = mapped_column(
        String(7), nullable=True
    )  # "YYYY-MM"
    value_numeric: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    source_type: Mapped[str] = mapped_column(
        SAEnum(SourceType), nullable=False, default=SourceType.manual
    )
    source_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    budget_version: Mapped["BudgetVersion"] = relationship(
        "BudgetVersion", back_populates="assumption_values"
    )
    definition: Mapped["AssumptionDefinition"] = relationship(
        "AssumptionDefinition", back_populates="values"
    )
    updater: Mapped["User | None"] = relationship("User", foreign_keys=[updated_by])
