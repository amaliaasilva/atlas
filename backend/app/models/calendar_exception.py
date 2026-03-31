"""Atlas Finance — CalendarException model (BE-A-01)"""

import uuid
import enum
from datetime import date

from sqlalchemy import String, Text, Date, Enum as SAEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class CalendarExceptionType(str, enum.Enum):
    holiday_national = "holiday_national"
    holiday_state = "holiday_state"
    holiday_municipal = "holiday_municipal"
    manual_close = "manual_close"
    manual_open = "manual_open"  # abre em dia que normalmente fecharia


class CalendarException(Base, TimestampMixin):
    """
    Exceção de calendário para uma unidade ou global (unit_id=None → nacional).

    - unit_id=None + type='holiday_national'  → feriado nacional (aplica a todos)
    - unit_id=<id>  + type='holiday_state'    → feriado estadual/municipal da unidade
    - unit_id=<id>  + type='manual_close'     → fechamento excepcional
    - unit_id=<id>  + type='manual_open'      → abertura excepcional (sábado/domingo)
    """

    __tablename__ = "calendar_exceptions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # NULL → exceção global (feriado nacional)
    unit_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    exception_date: Mapped[date] = mapped_column(Date, nullable=False)
    exception_type: Mapped[str] = mapped_column(
        SAEnum(CalendarExceptionType), nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)

    unit: Mapped["Unit | None"] = relationship("Unit", foreign_keys=[unit_id])

    __table_args__ = (
        Index("ix_calendar_exceptions_date_unit", "exception_date", "unit_id"),
    )
