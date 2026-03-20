"""
Atlas Finance — Assumption Expander (ETAPA-2 / ARCH-04)

Expande premissas com growth_rule por todos os períodos do horizonte,
evitando que o usuário precise digitar manualmente 120 valores mensais.

Tipos de regra suportados:
  - "flat"             → valor constante em todos os períodos (default)
  - "compound_growth"  → crescimento composto anual
                         params: rate (float), base_year (int, opcional)
  - "curve"            → vetor de valores absolutos por ano (10 elementos = 10 anos)
                         params: values (list[float])

Prioridade de resolução do valor por período (maior → menor):
  1. AssumptionValue com period_date explícito (override manual do usuário)
  2. Valor expandido pelo growth_rule
  3. AssumptionValue sem period_date (valor estático/genérico)
  4. default_value da AssumptionDefinition
"""

from __future__ import annotations


def expand_compound_growth(
    base_value: float,
    annual_rate: float,
    base_year: int,
    periods: list[str],
) -> dict[str, float]:
    """
    Cresce base_value anualmente: base_value * (1 + rate)^max(0, year - base_year).

    Exemplo: base=19000, rate=0.10, base_year=2026
      "2026-11" → 19000 * 1.00^0 = 19.000
      "2027-01" → 19000 * 1.10^1 = 20.900
      "2028-03" → 19000 * 1.10^2 = 22.990
    """
    return {
        p: base_value * (1.0 + annual_rate) ** max(0, int(p[:4]) - base_year)
        for p in periods
    }


def expand_curve(
    annual_values: list[float],
    periods: list[str],
) -> dict[str, float]:
    """
    Cada elemento de annual_values corresponde a um ano de projeção (índice 0 = 1º ano).
    O valor se repete pelos 12 meses do mesmo ano.
    Se houver mais anos de projeção do que elementos, repete o último.

    Exemplo: values=[0.03, 0.12, 0.25, ...], period "2027-06" → índice ano 1 → 0.12
    """
    result: dict[str, float] = {}
    for i, p in enumerate(periods):
        year_idx = i // 12
        if year_idx < len(annual_values):
            result[p] = annual_values[year_idx]
        else:
            result[p] = annual_values[-1] if annual_values else 0.0
    return result


def expand_assumption(
    growth_rule: dict,
    base_value: float,
    periods: list[str],
    base_year: int | None = None,
) -> dict[str, float]:
    """
    Ponto de entrada principal.

    :param growth_rule: JSON da AssumptionDefinition.growth_rule
    :param base_value:  Valor base (do AssumptionValue estático ou default_value)
    :param periods:     Lista de "YYYY-MM" gerada pelo generate_horizon_periods
    :param base_year:   Ano base para compound_growth (fallback: 1º ano de periods)
    :return: {period: value} para todos os periods
    """
    if not growth_rule or not periods:
        return {p: base_value for p in periods}

    rule_type = growth_rule.get("type", "flat")

    if rule_type == "compound_growth":
        rate = float(growth_rule.get("rate", 0.0))
        by = (
            growth_rule.get("base_year")
            or base_year
            or int(periods[0][:4])
        )
        return expand_compound_growth(base_value, rate, int(by), periods)

    elif rule_type == "curve":
        annual_values = growth_rule.get("values", [])
        if not annual_values:
            return {p: base_value for p in periods}
        return expand_curve(annual_values, periods)

    else:  # "flat" ou desconhecido
        return {p: base_value for p in periods}
