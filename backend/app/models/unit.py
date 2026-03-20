import uuid
from datetime import date
from sqlalchemy import String, Text, Integer, ForeignKey, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class UnitStatus(str, enum.Enum):
    planning = "planning"
    pre_opening = "pre_opening"
    active = "active"
    closed = "closed"


class Unit(Base, TimestampMixin):
    __tablename__ = "units"

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
    # ARCH-03: data completa de inauguração (mês importa para offset no consolidado)
    opening_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # GAP-01: parâmetros operacionais do coworking
    slots_per_hour: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    hours_open_weekday: Mapped[int] = mapped_column(Integer, default=17, nullable=False)
    hours_open_saturday: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(UnitStatus), nullable=False, default=UnitStatus.planning
    )
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    area_m2: Mapped[float | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="units")
    budget_versions: Mapped[list["BudgetVersion"]] = relationship(
        "BudgetVersion", back_populates="unit", cascade="all, delete-orphan"
    )
    calculated_results: Mapped[list["CalculatedResult"]] = relationship(
        "CalculatedResult", back_populates="unit"
    )
