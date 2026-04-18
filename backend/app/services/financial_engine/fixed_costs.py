"""
Atlas Finance — Fixed Costs Calculator

Correções: (GAP-03, GAP-04)
  - Folha: pro_labore NÃO incide encargos. Base CLT × social_charges_rate (80% real).
  - Utilities: modelo misto — (custo_fixo + custo_variável_max × ocupação) × (1 − automação).
"""

from app.services.financial_engine.models import FixedCostInputs


def calculate_staff_costs(inputs: FixedCostInputs) -> dict:
    """
    Folha fixa = base salarial CLT + encargos + pró-labore.

    - Pro-labore NÃO incide encargos.
    - Toda premissa salarial CLT entra na base e recebe `social_charges_rate`.
    - Benefícios deixaram de compor o cálculo automático da folha.
    """
    clt_base = round(
        inputs.cleaning_staff_salary
        + inputs.receptionist_salary
        + inputs.marketing_staff_salary
        + inputs.commercial_staff_salary
        + inputs.manager_salary
        + inputs.fitness_teacher_salary
        + inputs.additional_clt_salary_base,
        2,
    )
    social_charges = round(clt_base * inputs.social_charges_rate, 2)
    benefits = 0.0
    clt_total = round(clt_base + social_charges, 2)
    gross_payroll = round(clt_total + inputs.pro_labore, 2)
    extra_staff = round(inputs.extra_staff, 2)
    total = round(gross_payroll + extra_staff, 2)
    return {
        "gross_payroll": gross_payroll,
        "clt_base": clt_base,
        "clt_total": clt_total,
        "pro_labore": round(inputs.pro_labore, 2),
        "social_charges": social_charges,
        "benefits": benefits,
        "extra_staff": extra_staff,
        "total_staff": total,
    }


def calculate_utility_costs(
    inputs: FixedCostInputs, occupancy_rate: float = 0.0
) -> dict:
    """
    Energia e Água: modelo misto (fixo + variável proporcional à ocupação).

    Energia:
      custo = (fixed_energy_cost + max_variable_energy_cost × occ) × (1 − automation_reduction)
      A automação reduz o custo total de energia (fixo + variável), conforme a planilha.
    Água:
      custo = fixed_water_cost + max_variable_water_cost × occ

    Fallback legado (kWh × tarifa / m³ × tarifa) se os campos novos forem zero.
    """
    occ = max(0.0, min(1.0, occupancy_rate))

    # Energia
    if inputs.fixed_energy_cost > 0 or inputs.max_variable_energy_cost > 0:
        automation_factor = max(0.0, 1.0 - inputs.automation_reduction)
        base_energy = inputs.fixed_energy_cost + inputs.max_variable_energy_cost * occ
        electricity = round(base_energy * automation_factor, 2)
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
    extra_utility = round(inputs.extra_utility, 2)
    total = round(electricity + water + telecom + extra_utility, 2)
    return {
        "electricity": electricity,
        "water": water,
        "internet_phone": telecom,
        "extra_utility": extra_utility,
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
    office_supplies = round(inputs.office_supplies, 2)
    hygiene_cleaning = round(inputs.hygiene_cleaning, 2)
    management_software = round(inputs.management_software, 2)
    legal_fees = round(inputs.legal_fees, 2)
    accounting_fees = round(inputs.accounting_fees, 2)
    administrative_services = round(inputs.administrative_services, 2)
    extra_admin = round(inputs.extra_admin, 2)
    total = round(
        office_supplies
        + hygiene_cleaning
        + management_software
        + legal_fees
        + accounting_fees
        + administrative_services
        + extra_admin,
        2,
    )
    return {
        "total_admin": total,
        "office_supplies": office_supplies,
        "hygiene_cleaning": hygiene_cleaning,
        "management_software": management_software,
        "legal_fees": legal_fees,
        "accounting_fees": accounting_fees,
        "administrative_services": administrative_services,
        "extra_admin": extra_admin,
    }


def calculate_marketing_costs(inputs: FixedCostInputs) -> dict:
    digital_marketing = round(inputs.digital_marketing, 2)
    brand_materials = round(inputs.brand_materials, 2)
    promotional_materials = round(inputs.promotional_materials, 2)
    extra_marketing = round(inputs.extra_marketing, 2)
    total = round(digital_marketing + brand_materials + promotional_materials + extra_marketing, 2)
    return {
        "total_marketing": total,
        "digital_marketing": digital_marketing,
        "brand_materials": brand_materials,
        "promotional_materials": promotional_materials,
        "extra_marketing": extra_marketing,
    }


def calculate_equipment_costs(inputs: FixedCostInputs) -> dict:
    depreciation_equipment = round(inputs.depreciation_equipment, 2)
    depreciation_renovation = round(inputs.depreciation_renovation, 2)
    maintenance_equipment = round(inputs.maintenance_equipment, 2)
    extra_equipment = round(inputs.extra_equipment, 2)
    total = round(depreciation_equipment + depreciation_renovation + maintenance_equipment + extra_equipment, 2)
    return {
        "total_equipment": total,
        "depreciation_equipment": depreciation_equipment,
        "depreciation_renovation": depreciation_renovation,
        "maintenance_equipment": maintenance_equipment,
        "extra_equipment": extra_equipment,
    }


def calculate_insurance_costs(inputs: FixedCostInputs) -> dict:
    property_insurance = round(inputs.property_insurance, 2)
    equipment_insurance = round(inputs.equipment_insurance, 2)
    extra_insurance = round(inputs.extra_insurance, 2)
    total = round(property_insurance + equipment_insurance + extra_insurance, 2)
    return {
        "total_insurance": total,
        "property_insurance": property_insurance,
        "equipment_insurance": equipment_insurance,
        "extra_insurance": extra_insurance,
    }


def calculate_rent(inputs: FixedCostInputs) -> float:
    return round(inputs.rent + inputs.condo_fee + inputs.iptu + inputs.extra_rent, 2)


def calculate_other_fixed(inputs: FixedCostInputs) -> dict:
    security_systems = round(inputs.security_systems, 2)
    financial_fees = round(inputs.financial_fees, 2)
    other_fixed_costs = round(inputs.other_fixed_costs, 2)
    total = round(security_systems + financial_fees + other_fixed_costs, 2)
    return {
        "total_other": total,
        "security_systems": security_systems,
        "financial_fees": financial_fees,
        "other_fixed_costs": other_fixed_costs,
    }


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
        + other["total_other"],
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
        "other_fixed_costs": other["total_other"],
        "detail": {
            "staff": staff,
            "utilities": utilities,
            "admin": admin,
            "marketing": marketing,
            "equipment": equipment,
            "insurance": insurance,
            "other": other,
        },
    }
