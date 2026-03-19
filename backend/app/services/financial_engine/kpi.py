"""
Atlas Finance — KPI Calculator
Calcula KPIs a partir dos resultados de um período.
"""
import math
from app.services.financial_engine.models import PeriodResult, FinancialInputs


def calculate_break_even_students(
    total_fixed_costs: float,
    avg_ticket: float,
    variable_cost_per_student: float,
    tax_rate: float,
) -> int:
    """
    Ponto de equilíbrio em número de alunos.
    Break-even = Custos Fixos / (Ticket Médio × (1 - Taxa de Imposto) - Custo Variável por Aluno)
    """
    if avg_ticket <= 0:
        return 0
    contribution_margin_per_student = avg_ticket * (1 - tax_rate) - variable_cost_per_student
    if contribution_margin_per_student <= 0:
        return 0
    return math.ceil(total_fixed_costs / contribution_margin_per_student)


def calculate_ebitda(result: PeriodResult) -> float:
    """
    EBITDA simplificado = Resultado Operacional + Depreciação
    Para MVP, usamos o operating_result como proxy (depreciação já está nos custos fixos).
    """
    return round(result.operating_result, 2)


def calculate_burn_rate(result: PeriodResult) -> float:
    """
    Taxa de queima = valor negativo do net_result (se negativo).
    Representa o caixa consumido por mês antes do break-even.
    """
    return round(abs(min(0.0, result.net_result)), 2)


def calculate_payback_months(
    total_capex: float, period_results: list[PeriodResult]
) -> int | None:
    """
    Payback simples: mês em que o fluxo de caixa acumulado fica positivo.
    """
    if total_capex <= 0:
        return None
    cumulative = -total_capex
    for i, period in enumerate(period_results):
        cumulative += period.net_result
        if cumulative >= 0:
            return i + 1
    return None  # Não atingiu payback no horizonte projetado


def calculate_runway_months(
    cash_balance: float, monthly_burn_rate: float
) -> float | None:
    """Runway = Caixa disponível / Queima mensal."""
    if monthly_burn_rate <= 0:
        return None
    return round(cash_balance / monthly_burn_rate, 1)
