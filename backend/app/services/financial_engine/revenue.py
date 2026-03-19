"""
Atlas Finance — Revenue Calculator
Calcula receita mensal com base em premissas de ocupação e ticket médio.
"""
import math
from app.services.financial_engine.models import RevenueInputs


def calculate_active_students(inputs: RevenueInputs) -> int:
    """Número de alunos ativos = capacidade × taxa de ocupação."""
    return math.floor(inputs.max_students * inputs.occupancy_rate)


def calculate_membership_revenue(inputs: RevenueInputs) -> float:
    """
    Receita de mensalidades considerando mix de planos.
    A lógica assume que os alunos anuais e trimestrais já pagam
    o equivalente mensal distribuído (ticket médio mensal equivalente).
    """
    active = calculate_active_students(inputs)
    if active == 0:
        return 0.0

    monthly_students = math.floor(active * inputs.mix_monthly_pct)
    quarterly_students = math.floor(active * inputs.mix_quarterly_pct)
    annual_students = active - monthly_students - quarterly_students

    # Receita normalizada mensalmente
    revenue = (
        monthly_students * inputs.avg_ticket_monthly
        + quarterly_students * inputs.avg_ticket_quarterly
        + annual_students * inputs.avg_ticket_annual
    )
    return round(revenue, 2)


def calculate_personal_training_revenue(inputs: RevenueInputs) -> float:
    """Receita de personal training."""
    return round(inputs.num_personal_trainers * inputs.avg_personal_revenue_month, 2)


def calculate_gross_revenue(inputs: RevenueInputs) -> dict:
    """Calcula receita bruta total e seus componentes."""
    membership = calculate_membership_revenue(inputs)
    personal = calculate_personal_training_revenue(inputs)
    other = round(inputs.other_revenue, 2)
    total = round(membership + personal + other, 2)
    return {
        "gross_revenue": total,
        "membership_revenue": membership,
        "personal_training_revenue": personal,
        "other_revenue": other,
        "active_students": calculate_active_students(inputs),
    }
