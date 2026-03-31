"""Atlas Finance — CalendarService (BE-A-04)

Serviço para cálculo de dias úteis por mês/unidade.
Integra calendar_exceptions (feriados e exceções manuais) com fallback de 22 dias.
"""

from __future__ import annotations

import calendar as _cal
from datetime import date
from dataclasses import dataclass


@dataclass
class MonthlyCalendarSummary:
    """Resumo de calendário para um (unit_id, year_month)."""

    unit_id: str | None
    year_month: str  # "YYYY-MM"
    calendar_days: int
    weekend_days: int       # sábados + domingos
    saturday_days: int      # só sábados
    sunday_days: int        # só domingos
    holiday_days: int       # feriados que caem em dias úteis (seg-sex)
    working_days: int       # calendar_days - weekend_days
    effective_working_days: int  # working_days - holiday_days
    is_estimate: bool        # True quando não há dados de exceptions → usa fallback


class CalendarService:
    """
    Calcula resumos mensais de calendário a partir de CalendarException.

    O serviço considera (em ordem de prioridade):
    1. Exceções globais (unit_id=None) — feriados nacionais
    2. Exceções da unidade específica (feriados estaduais/municipais, fechamentos)
    3. Fallback: 22 dias úteis / 4 sábados (se nenhum dado disponível)
    """

    FALLBACK_WORKING_DAYS = 22
    FALLBACK_SATURDAYS = 4

    def get_monthly_summary(
        self,
        db,
        unit_id: str | None,
        year_month: str,
    ) -> MonthlyCalendarSummary:
        """
        Retorna o resumo de calendário para (unit_id, year_month="YYYY-MM").
        Sempre computa a partir das calendar_exceptions — sem cache em DB.
        """
        from app.models.calendar_exception import (
            CalendarException,
            CalendarExceptionType,
        )

        year_str, month_str = year_month.split("-")
        year = int(year_str)
        month = int(month_str)

        # Dias do mês
        days_in_month = _cal.monthrange(year, month)[1]

        # Sábados e domingos
        saturday_days = 0
        sunday_days = 0
        for day in range(1, days_in_month + 1):
            weekday = date(year, month, day).weekday()  # 0=seg, 5=sab, 6=dom
            if weekday == 5:
                saturday_days += 1
            elif weekday == 6:
                sunday_days += 1
        weekend_days = saturday_days + sunday_days
        working_days = days_in_month - weekend_days  # seg-sex sem feriados

        # Busca exceções globais (feriados nacionais) para o mês
        global_exceptions = (
            db.query(CalendarException)
            .filter(
                CalendarException.unit_id.is_(None),
                CalendarException.exception_date.between(
                    date(year, month, 1), date(year, month, days_in_month)
                ),
            )
            .all()
        )

        # Busca exceções da unidade específica
        unit_exceptions = []
        if unit_id:
            unit_exceptions = (
                db.query(CalendarException)
                .filter(
                    CalendarException.unit_id == unit_id,
                    CalendarException.exception_date.between(
                        date(year, month, 1), date(year, month, days_in_month)
                    ),
                )
                .all()
            )

        all_exceptions = global_exceptions + unit_exceptions
        has_exception_data = len(global_exceptions) > 0  # feriados nacionais servem como indicador

        if not has_exception_data:
            # Sem dados de feriados → fallback
            return MonthlyCalendarSummary(
                unit_id=unit_id,
                year_month=year_month,
                calendar_days=days_in_month,
                weekend_days=weekend_days,
                saturday_days=saturday_days,
                sunday_days=sunday_days,
                holiday_days=0,
                working_days=working_days,
                effective_working_days=self.FALLBACK_WORKING_DAYS,
                is_estimate=True,
            )

        # Separa exceções por tipo
        holiday_types = {
            CalendarExceptionType.holiday_national,
            CalendarExceptionType.holiday_state,
            CalendarExceptionType.holiday_municipal,
        }
        close_types = {CalendarExceptionType.manual_close}
        open_types = {CalendarExceptionType.manual_open}

        # Dias que são feriado (descontados dos dias úteis)
        holiday_dates: set[date] = set()
        for exc in all_exceptions:
            if exc.exception_type in holiday_types or exc.exception_type in close_types:
                d = exc.exception_date
                # Feriado só conta se caísse em dia útil (seg-sex)
                if d.weekday() < 5:  # 0=seg..4=sex
                    holiday_dates.add(d)
            elif exc.exception_type in open_types:
                # manual_open: remove da contagem de fins de semana (dia é útil)
                holiday_dates.discard(exc.exception_date)

        holiday_days = len(holiday_dates)
        effective_working_days = max(0, working_days - holiday_days)

        return MonthlyCalendarSummary(
            unit_id=unit_id,
            year_month=year_month,
            calendar_days=days_in_month,
            weekend_days=weekend_days,
            saturday_days=saturday_days,
            sunday_days=sunday_days,
            holiday_days=holiday_days,
            working_days=working_days,
            effective_working_days=effective_working_days,
            is_estimate=False,
        )

    def get_working_days(self, db, unit_id: str | None, year_month: str) -> int:
        """Retorna effective_working_days para o mês (com fallback 22)."""
        summary = self.get_monthly_summary(db, unit_id, year_month)
        return summary.effective_working_days

    def get_saturdays(self, db, unit_id: str | None, year_month: str) -> int:
        """Retorna número de sábados no mês."""
        summary = self.get_monthly_summary(db, unit_id, year_month)
        return summary.saturday_days

    def get_year_summaries(
        self, db, unit_id: str | None, year: int
    ) -> list[MonthlyCalendarSummary]:
        """Retorna os 12 resumos mensais de um ano para uma unidade."""
        return [
            self.get_monthly_summary(db, unit_id, f"{year}-{month:02d}")
            for month in range(1, 13)
        ]


# Singleton para reutilizar sem instanciar a cada chamada
calendar_service = CalendarService()
