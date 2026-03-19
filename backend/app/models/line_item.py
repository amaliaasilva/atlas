import uuid
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class LineItemCategory(str, enum.Enum):
    revenue = "revenue"
    fixed_cost = "fixed_cost"
    variable_cost = "variable_cost"
    financial_cost = "financial_cost"
    capex = "capex"
    tax = "tax"
    staffing = "staffing"
    utility = "utility"
    benefit = "benefit"
    occupancy = "occupancy"
    financing = "financing"
    result = "result"


class CalculationType(str, enum.Enum):
    manual = "manual"
    formula = "formula"
    imported = "imported"
    derived = "derived"
    sum = "sum"


class LineItemDefinition(Base, TimestampMixin):
    __tablename__ = "line_item_definitions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(SAEnum(LineItemCategory), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calculation_type: Mapped[str] = mapped_column(
        SAEnum(CalculationType), nullable=False, default=CalculationType.formula
    )
    formula_reference: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON or string referencing assumption codes
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    indent_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_kpi: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_subtotal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship(
        "Business", back_populates="line_item_definitions"
    )
    calculated_results: Mapped[list["CalculatedResult"]] = relationship(
        "CalculatedResult", back_populates="line_item"
    )
