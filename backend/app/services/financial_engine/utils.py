"""
Atlas Finance — Financial Engine Utilities
Funções auxiliares usadas pelo motor e pelos endpoints de cálculo.
"""

from __future__ import annotations

from datetime import date


def generate_horizon_periods(
    opening_date: date,
    projection_years: int = 9,
    ending_date: date | None = None,
) -> list[str]:
    """
    Gera a lista de períodos mensais ("YYYY-MM") a partir de uma data de abertura.

    Exemplo:
        generate_horizon_periods(date(2026, 1, 1), 9)
        → ["2026-01", "2026-02", ..., "2034-12"]

    :param opening_date: Data de inauguração/início do horizonte.
    :param projection_years: Número de anos de projeção usado como fallback.
    :param ending_date: Data final explícita da projeção (inclui o mês final).
    :return: Lista de strings no formato "YYYY-MM".
    """
    year, month = opening_date.year, opening_date.month
    periods: list[str] = []

    if ending_date and ending_date >= opening_date:
        end_year, end_month = ending_date.year, ending_date.month
        while year < end_year or (year == end_year and month <= end_month):
            periods.append(f"{year}-{month:02d}")
            month += 1
            if month > 12:
                month = 1
                year += 1
        return periods

    for _ in range(projection_years * 12):
        periods.append(f"{year}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return periods
