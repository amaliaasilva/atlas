"""
Atlas Finance — Variable Costs Calculator
"""

from app.services.financial_engine.models import VariableCostInputs


def calculate_total_variable_costs(
    inputs: VariableCostInputs, active_students: int, gross_revenue: float
) -> dict:
    # Prioriza o total mensal pré-calculado diretamente na aba Cálculo Kit Higiene.
    # Fallback para legado: custo unitário × professores ativos.
    if inputs.hygiene_kit_monthly > 0:
        hygiene_kit = round(inputs.hygiene_kit_monthly, 2)
    else:
        hygiene_kit = round(inputs.hygiene_kit_per_student * active_students, 2)
    sales_commission = round(inputs.sales_commission_rate * gross_revenue, 2)
    card_fee = round(inputs.card_fee_rate * gross_revenue, 2)
    other_rate_based = round(inputs.other_variable_cost_rate * gross_revenue, 2)
    other = round(inputs.other_variable_costs + other_rate_based, 2)
    total = round(hygiene_kit + sales_commission + card_fee + other, 2)
    return {
        "total_variable_costs": total,
        "hygiene_kit_cost": hygiene_kit,
        "sales_commission_cost": sales_commission,
        "card_fee_cost": card_fee,
        "other_variable_costs": other,
    }
