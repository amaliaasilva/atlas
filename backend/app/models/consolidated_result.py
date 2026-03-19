import uuid
from sqlalchemy import String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ConsolidatedResult(Base):
    __tablename__ = "consolidated_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    scenario_id: Mapped[str] = mapped_column(String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    period_date: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"
    metric_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    generated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="consolidated_results")
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="consolidated_results")
