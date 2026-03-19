import uuid
from sqlalchemy import String, Float, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CalculatedResult(Base):
    __tablename__ = "calculated_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    budget_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("budget_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    line_item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("line_item_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_date: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    calculation_trace: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    budget_version: Mapped["BudgetVersion"] = relationship(
        "BudgetVersion", back_populates="calculated_results"
    )
    unit: Mapped["Unit"] = relationship("Unit", back_populates="calculated_results")
    scenario: Mapped["Scenario | None"] = relationship("Scenario")
    line_item: Mapped["LineItemDefinition"] = relationship(
        "LineItemDefinition", back_populates="calculated_results"
    )
