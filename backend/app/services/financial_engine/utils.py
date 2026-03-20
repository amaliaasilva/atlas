"""
Atlas Finance — Financial Engine Utilities
Funções auxiliares usadas pelo motor e pelos endpoints de cálculo.
"""

from __future__ import annotations

from datetime import date


def generate_horizon_periods(opening_date: date, projection_years: int = 10) -> list[str]:
    """
    Gera a lista de períodos mensais ("YYYY-MM") a partir de uma data de abertura.

    Exemplo:
        generate_horizon_periods(date(2026, 11, 1), 10)
        → ["2026-11", "2026-12", "2027-01", ..., "2036-10"]  (120 períodos)

    :param opening_date: Data de inauguração/início do horizonte.
    :param projection_years: Número de anos de projeção (default 10 = 120 meses).
    :return: Lista de strings no formato "YYYY-MM" com len = projection_years * 12.
    """
    year, month = opening_date.year, opening_date.month
    periods: list[str] = []
    for _ in range(projection_years * 12):
        periods.append(f"{year}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return periods
