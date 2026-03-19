"""
Atlas Finance — Fixed Costs Calculator
Agrupa e calcula todos os custos fixos de uma unidade.
"""
from app.services.financial_engine.models import FixedCostInputs


def calculate_staff_costs(inputs: FixedCostInputs) -> dict:
    """Folha de pagamento + encargos + benefícios."""
    gross_payroll = (
        inputs.cleaning_staff_salary
        + inputs.receptionist_salary
        + inputs.marketing_staff_salary
        + inputs.commercial_staff_salary
        + inputs.manager_salary
        + inputs.fitness_teacher_salary
        + inputs.pro_labore
    )
    social_charges = round(gross_payroll * inputs.social_charges_rate, 2)
    benefits = round(inputs.num_employees * inputs.benefits_per_employee, 2)
    total = round(gross_payroll + social_charges + benefits, 2)
    return {
        "gross_payroll": round(gross_payroll, 2),
        "social_charges": social_charges,
        "benefits": benefits,
        "total_staff": total,
    }


def calculate_utility_costs(inputs: FixedCostInputs) -> dict:
    """Energia, água, telefone/internet."""
    electricity = round(inputs.electricity_kwh * inputs.electricity_rate, 2)
    water = round(inputs.water_m3 * inputs.water_rate, 2)
    telecom = round(inputs.internet_phone, 2)
    total = round(electricity + water + telecom, 2)
    return {
        "electricity": electricity,
        "water": water,
        "internet_phone": telecom,
        "total_utilities": total,
    }


def calculate_admin_costs(inputs: FixedCostInputs) -> dict:
    """Despesas administrativas."""
    total = round(
        inputs.office_supplies
        + inputs.hygiene_cleaning
        + inputs.management_software
        + inputs.legal_fees
        + inputs.accounting_fees
        + inputs.administrative_services,
        2,
    )
    return {"total_admin": total}


def calculate_marketing_costs(inputs: FixedCostInputs) -> dict:
    total = round(
        inputs.digital_marketing
        + inputs.brand_materials
        + inputs.promotional_materials,
        2,
    )
    return {"total_marketing": total}


def calculate_equipment_costs(inputs: FixedCostInputs) -> dict:
    total = round(inputs.depreciation_equipment + inputs.maintenance_equipment, 2)
    return {"total_equipment": total}


def calculate_insurance_costs(inputs: FixedCostInputs) -> dict:
    total = round(inputs.property_insurance + inputs.equipment_insurance, 2)
    return {"total_insurance": total}


def calculate_rent(inputs: FixedCostInputs) -> float:
    return round(inputs.rent + inputs.condo_fee + inputs.iptu, 2)


def calculate_other_fixed(inputs: FixedCostInputs) -> float:
    return round(inputs.security_systems + inputs.financial_fees, 2)


def calculate_total_fixed_costs(inputs: FixedCostInputs) -> dict:
    """Soma todos os custos fixos e retorna breakdown."""
    rent = calculate_rent(inputs)
    staff = calculate_staff_costs(inputs)
    utilities = calculate_utility_costs(inputs)
    admin = calculate_admin_costs(inputs)
    marketing = calculate_marketing_costs(inputs)
    equipment = calculate_equipment_costs(inputs)
    insurance = calculate_insurance_costs(inputs)
    other = calculate_other_fixed(inputs)

    total = round(
        rent
        + staff["total_staff"]
        + utilities["total_utilities"]
        + admin["total_admin"]
        + marketing["total_marketing"]
        + equipment["total_equipment"]
        + insurance["total_insurance"]
        + other,
        2,
    )
    return {
        "total_fixed_costs": total,
        "rent_total": rent,
        "staff_costs": staff["total_staff"],
        "utility_costs": utilities["total_utilities"],
        "admin_costs": admin["total_admin"],
        "marketing_costs": marketing["total_marketing"],
        "equipment_costs": equipment["total_equipment"],
        "insurance_costs": insurance["total_insurance"],
        "other_fixed_costs": other,
        # breakdown detail
        "detail": {
            "staff": staff,
            "utilities": utilities,
            "admin": admin,
            "marketing": marketing,
            "equipment": equipment,
            "insurance": insurance,
        },
    }
