"""
Atlas Finance — Fixed Costs Calculator

Correções: (GAP-03, GAP-04)
  - Folha: pro_labore NÃO incide encargos. Base CLT × social_charges_rate (80% real).
  - Utilities: modelo misto — custo_fixo + custo_variável_max × ocupação × (1 − automação).
"""

from app.services.financial_engine.models import FixedCostInputs


def calculate_staff_costs(inputs: FixedCostInputs) -> dict:
    """
    Folha de pagamento + encargos (80%) + benefícios.

    Pro-labore NÃO incide encargos (pró-labore é remuneração de sócio,
    não de CLT). Os encargos incidem apenas sobre os salários CLT.
    social_charges_rate ≈ 0.80  inclui INSS patronal + FGTS + outros (13°, férias etc.)
    """
    clt_base = round(
        inputs.cleaning_staff_salary
        + inputs.receptionist_salary
        + inputs.marketing_staff_salary
        + inputs.commercial_staff_salary
        + inputs.manager_salary
        + inputs.fitness_teacher_salary,
        2,
    )
    social_charges = round(clt_base * inputs.social_charges_rate, 2)
    benefits = round(inputs.num_employees * inputs.benefits_per_employee, 2)
    gross_payroll = round(clt_base + inputs.pro_labore, 2)
    total = round(gross_payroll + social_charges + benefits, 2)
    return {
        "gross_payroll": gross_payroll,
        "clt_base": clt_base,
        "pro_labore": round(inputs.pro_labore, 2),
        "social_charges": social_charges,
        "benefits": benefits,
        "total_staff": total,
    }


def calculate_utility_costs(
    inputs: FixedCostInputs, occupancy_rate: float = 0.0
) -> dict:
    """
    Energia e Água: modelo misto (fixo + variável proporcional à ocupação).

    Energia (GAP-01 — fórmula corrigida vs planilha):
      custo = (fixed_energy_cost + max_variable_energy_cost × occ) × (1 − automation_reduction)
      A automação reduz o consumo total (fixo + variável), não apenas a parcela variável.
    Água:
      custo = fixed_water_cost  + max_variable_water_cost  × occ

    Fallback legado (kWh × tarifa / m³ × tarifa) se os campos novos forem zero.
    """
    occ = max(0.0, min(1.0, occupancy_rate))

    # Energia
    if inputs.fixed_energy_cost > 0 or inputs.max_variable_energy_cost > 0:
        automation_factor = 1.0 - inputs.automation_reduction
        electricity = round(
            (inputs.fixed_energy_cost + inputs.max_variable_energy_cost * occ)
            * automation_factor,
            2,
        )
        elec_fixed = round(inputs.fixed_energy_cost * automation_factor, 2)
        elec_variable = round(
            inputs.max_variable_energy_cost * occ * automation_factor, 2
        )
    else:
        electricity = round(inputs.electricity_kwh * inputs.electricity_rate, 2)
        elec_fixed = electricity
        elec_variable = 0.0

    # Água
    if inputs.fixed_water_cost > 0 or inputs.max_variable_water_cost > 0:
        water = round(inputs.fixed_water_cost + inputs.max_variable_water_cost * occ, 2)
        water_fixed = inputs.fixed_water_cost
        water_variable = round(inputs.max_variable_water_cost * occ, 2)
    else:
        water = round(inputs.water_m3 * inputs.water_rate, 2)
        water_fixed = water
        water_variable = 0.0

    telecom = round(inputs.internet_phone, 2)
    total = round(electricity + water + telecom, 2)
    return {
        "electricity": electricity,
        "water": water,
        "internet_phone": telecom,
        "total_utilities": total,
        "detail": {
            "electricity_fixed": elec_fixed,
            "electricity_variable": elec_variable,
            "water_fixed": water_fixed,
            "water_variable": water_variable,
            "occupancy_rate_used": occ,
        },
    }


def calculate_admin_costs(inputs: FixedCostInputs) -> dict:
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
    return round(
        inputs.security_systems + inputs.financial_fees + inputs.other_fixed_costs, 2
    )


def calculate_total_fixed_costs(
    inputs: FixedCostInputs, occupancy_rate: float = 0.0
) -> dict:
    """
    Soma todos os custos fixos e retorna breakdown.
    occupancy_rate é necessário para o modelo misto de utilities.
    """
    rent = calculate_rent(inputs)
    staff = calculate_staff_costs(inputs)
    utilities = calculate_utility_costs(inputs, occupancy_rate)
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
        "detail": {
            "staff": staff,
            "utilities": utilities,
            "admin": admin,
            "marketing": marketing,
            "equipment": equipment,
            "insurance": insurance,
        },
    }
