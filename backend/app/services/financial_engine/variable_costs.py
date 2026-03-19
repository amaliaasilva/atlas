"""
Atlas Finance — Variable Costs Calculator
"""

from app.services.financial_engine.models import VariableCostInputs


def calculate_total_variable_costs(
    inputs: VariableCostInputs, active_students: int, gross_revenue: float
) -> dict:
    hygiene_kit = round(inputs.hygiene_kit_per_student * active_students, 2)
    sales_commission = round(inputs.sales_commission_rate * gross_revenue, 2)
    other = round(inputs.other_variable_costs, 2)
    total = round(hygiene_kit + sales_commission + other, 2)
    return {
        "total_variable_costs": total,
        "hygiene_kit_cost": hygiene_kit,
        "sales_commission_cost": sales_commission,
        "other_variable_costs": other,
    }
