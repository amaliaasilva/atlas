"""
Atlas Finance — KPI Calculator
Calcula KPIs financeiros para análise de viabilidade (Coworking B2B).

Breakeven por receita e ocupação:
  break_even_revenue      = custos_fixos / (1 − var_pct − tax_rate)
  break_even_occupancy_pct = break_even_revenue / (capacity_hours × avg_price)

Margem de contribuição:
  contribution_margin_pct = (receita − var_costs − impostos) / receita
"""

import math
from app.services.financial_engine.models import PeriodResult


# ──────────────────────────────────────────────────────────────────────────────
# Breakeven
# ──────────────────────────────────────────────────────────────────────────────


def calculate_break_even_revenue(
    total_fixed_costs: float,
    variable_cost_pct: float,  # % de custos variáveis sobre receita (0.0–1.0)
    tax_rate: float,            # % de impostos sobre receita (0.0–1.0)
) -> float:
    """
    Ponto de equilíbrio em R$ de receita mensal.
    BE_R$ = Custos Fixos / (1 − % Var − % Impostos)
    """
    denominator = 1.0 - variable_cost_pct - tax_rate
    if denominator <= 0:
        return 0.0
    return round(total_fixed_costs / denominator, 2)


def calculate_break_even_occupancy_pct(
    break_even_revenue: float,
    capacity_hours_month: float,  # horas totais disponíveis no mês
    avg_price_per_hour: float,    # preço médio ponderado R$/hora
) -> float:
    """
    % de ocupação mínima para atingir o break-even operacional.
    BE_occ = BE_R$ / (capacidade_horas × preço_médio)
    Retorna valor entre 0.0 e 1.0 (cap em 1.0 quando breakeven impossível).
    """
    max_revenue = capacity_hours_month * avg_price_per_hour
    if max_revenue <= 0:
        return 0.0
    return round(min(1.0, break_even_revenue / max_revenue), 4)


def calculate_break_even_classes(
    break_even_revenue: float,
    avg_price_per_hour: float,
) -> int:
    """Número de aulas/horas vendidas para atingir o break-even."""
    if avg_price_per_hour <= 0:
        return 0
    return math.ceil(break_even_revenue / avg_price_per_hour)


# Mantido por compatibilidade — use calculate_break_even_revenue / classes no novo código
def calculate_break_even_students(
    total_fixed_costs: float,
    avg_ticket: float,
    variable_cost_per_student: float,
    tax_rate: float,
) -> int:
    """
    Ponto de equilíbrio em número de alunos/slots.
    No modelo coworking, representa horas mínimas a vender por mês.
    BE = ceil(Custos Fixos / (Ticket × (1 − tax) − Custo Var por Slot))
    """
    if avg_ticket <= 0:
        return 0
    contribution = avg_ticket * (1 - tax_rate) - variable_cost_per_student
    if contribution <= 0:
        return 0
    return math.ceil(total_fixed_costs / contribution)


# ──────────────────────────────────────────────────────────────────────────────
# Margem de Contribuição
# ──────────────────────────────────────────────────────────────────────────────


def calculate_contribution_margin_pct(
    gross_revenue: float,
    total_variable_costs: float,
    taxes_on_revenue: float,
) -> float:
    """
    Margem de contribuição = (Receita − Var − Impostos) / Receita.
    Representa o % da receita disponível para cobrir os custos fixos.
    """
    if gross_revenue <= 0:
        return 0.0
    return round((gross_revenue - total_variable_costs - taxes_on_revenue) / gross_revenue, 4)


# ──────────────────────────────────────────────────────────────────────────────
# EBITDA, Burn Rate, Payback
# ──────────────────────────────────────────────────────────────────────────────


def calculate_ebitda(result: PeriodResult) -> float:
    """
    EBITDA = Resultado Operacional + Depreciação (já está nos custos fixos).
    Para MVP, usamos o operating_result como proxy.
    """
    return round(result.operating_result + result.equipment_costs, 2)


def calculate_burn_rate(result: PeriodResult) -> float:
    """
    Burn rate = caixa consumido por mês quando resultado líquido for negativo.
    Representa a 'queima' antes de atingir o break-even.
    """
    return round(abs(min(0.0, result.net_result)), 2)


# ──────────────────────────────────────────────────────────────────────────────
# Professores necessários (GAP-06)
# ──────────────────────────────────────────────────────────────────────────────


def calculate_teachers_needed(
    break_even_occupancy_pct: float,
    capacity_hours_month: float,
    classes_per_teacher_per_week: float = 2.0,
    weeks_per_month: float = 4.33,
) -> dict:
    """
    Número de educadores físicos necessários para cobrir o break-even.

    Fórmula da planilha "Ocupação e unit economics 2.0":
        BE_classes = break_even_occupancy_pct × capacity_hours_month
        professores = ceil(BE_classes / (classes_per_teacher_per_week × weeks_per_month × alunos_por_prof))

    Cenários:
        pessimistic: 1.0 alunos/prof
        medium:      1.5 alunos/prof
        optimistic:  2.0 alunos/prof
    """
    be_classes = break_even_occupancy_pct * capacity_hours_month
    base_capacity_per_teacher = classes_per_teacher_per_week * weeks_per_month
    results = {}
    for scenario, ratio in [("pessimistic", 1.0), ("medium", 1.5), ("optimistic", 2.0)]:
        divisor = base_capacity_per_teacher * ratio
        if divisor > 0 and be_classes > 0:
            results[f"teachers_needed_{scenario}"] = math.ceil(be_classes / divisor)
        else:
            results[f"teachers_needed_{scenario}"] = 0
    return results


def calculate_payback_months(
    total_capex: float, period_results: list[PeriodResult]
) -> int | None:
    """
    Payback simples: mês em que o fluxo de caixa acumulado zera.
    Começa negativo no valor do CAPEX total, acumula net_result por período.
    """
    if total_capex <= 0:
        return None
    cumulative = -total_capex
    for i, period in enumerate(period_results):
        cumulative += period.net_result
        if cumulative >= 0:
            return i + 1
    return None  # Payback não atingido no horizonte projetado


def calculate_runway_months(
    cash_balance: float, monthly_burn_rate: float
) -> float | None:
    """Runway = Caixa disponível / Queima mensal."""
    if monthly_burn_rate <= 0:
        return None
    return round(cash_balance / monthly_burn_rate, 1)
