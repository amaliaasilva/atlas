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
    opening_year: int | None = None,
) -> dict[str, float]:
    """
    Cada elemento de annual_values corresponde a um ano de projeção.
    Se opening_year for fornecido, o índice é calculado como (ano_do_período - opening_year),
    garantindo que unidades abertas em anos futuros recebam Ano 0 da curva no seu primeiro mês.
    Sem opening_year, usa posição sequencial (comportamento legado).
    """
    base_year = opening_year if opening_year is not None else None
    result: dict[str, float] = {}
    for i, p in enumerate(periods):
        if base_year is not None:
            year_idx = max(0, int(p[:4]) - base_year)
        else:
            year_idx = i // 12
        if year_idx < len(annual_values):
            result[p] = annual_values[year_idx]
        else:
            result[p] = annual_values[-1] if annual_values else 0.0
    return result


def expand_annual_step(
    steps: dict[str, float],
    periods: list[str],
    default_mode: str = "last_known",
) -> dict[str, float]:
    """
    Retorna o valor do passo para o ano do período.

    Exemplo: steps={"2027": 2500, "2028": 3500}, "2026-11" → 2500 (last_known antes de 2027)

    :param steps:        Dict ano_str → valor. Ex: {"2027": 2500, "2028": 3500}
    :param periods:      Lista "YYYY-MM" do horizonte
    :param default_mode: "last_known" usa o maior ano ≤ período; qualquer outro → 0.0
    """
    sorted_years = sorted(steps.keys())
    result: dict[str, float] = {}
    for p in periods:
        year_str = p[:4]
        if year_str in steps:
            result[p] = steps[year_str]
        elif default_mode == "last_known":
            known = [y for y in sorted_years if y <= year_str]
            result[p] = steps[known[-1]] if known else (list(steps.values())[0] if steps else 0.0)
        else:
            result[p] = 0.0
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
        opening_year = base_year if base_year is not None else (int(periods[0][:4]) if periods else None)
        return expand_curve(annual_values, periods, opening_year=opening_year)

    elif rule_type == "annual_step":
        return expand_annual_step(
            steps=growth_rule.get("steps", {}),
            periods=periods,
            default_mode=growth_rule.get("default_for_unlisted_years", "last_known"),
        )

    elif rule_type == "occupancy_mixed":
        # O componente variável é calculado no engine (fixed_costs.py).
        # O expander retorna apenas o componente fixo como base.
        return {p: growth_rule.get("fixed_component", 0.0) for p in periods}

    else:  # "flat" ou desconhecido
        return {p: base_value for p in periods}
