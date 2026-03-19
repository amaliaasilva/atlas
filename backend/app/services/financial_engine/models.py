"""
Atlas Finance — Financial Engine Data Models
Tipos de dados puros (sem ORM) para o motor financeiro.
Esses tipos garantem que o motor pode ser testado sem banco de dados.
"""

from dataclasses import dataclass, field


@dataclass
class RevenueInputs:
    """Premissas de receita para uma unidade em um período."""

    max_students: int = 0
    occupancy_rate: float = 0.0  # 0.0–1.0 (ex.: 0.45 = 45%)
    avg_ticket_monthly: float = 0.0  # R$
    avg_ticket_quarterly: float = 0.0  # R$
    avg_ticket_annual: float = 0.0  # R$ (valor mensal equivalente)
    mix_monthly_pct: float = 1.0  # soma mix = 1.0
    mix_quarterly_pct: float = 0.0
    mix_annual_pct: float = 0.0
    num_personal_trainers: int = 0
    avg_personal_revenue_month: float = 0.0
    other_revenue: float = 0.0


@dataclass
class FixedCostInputs:
    """Premissas de custos fixos."""

    rent: float = 0.0
    condo_fee: float = 0.0
    iptu: float = 0.0
    # Equipe
    cleaning_staff_salary: float = 0.0
    receptionist_salary: float = 0.0
    marketing_staff_salary: float = 0.0
    commercial_staff_salary: float = 0.0
    manager_salary: float = 0.0
    fitness_teacher_salary: float = 0.0
    pro_labore: float = 0.0
    social_charges_rate: float = 0.08  # % sobre folha (FGTS 8%)
    benefits_per_employee: float = 0.0
    num_employees: int = 0
    # Utilities
    electricity_kwh: float = 0.0
    electricity_rate: float = 0.0
    water_m3: float = 0.0
    water_rate: float = 0.0
    internet_phone: float = 0.0
    # Administrative
    office_supplies: float = 0.0
    hygiene_cleaning: float = 0.0
    management_software: float = 0.0
    legal_fees: float = 0.0
    accounting_fees: float = 0.0
    administrative_services: float = 0.0
    # Insurance
    property_insurance: float = 0.0
    equipment_insurance: float = 0.0
    # Marketing
    digital_marketing: float = 0.0
    brand_materials: float = 0.0
    promotional_materials: float = 0.0
    # Equipment
    depreciation_equipment: float = 0.0
    maintenance_equipment: float = 0.0
    # Other
    security_systems: float = 0.0
    financial_fees: float = 0.0


@dataclass
class VariableCostInputs:
    """Premissas de custos variáveis."""

    hygiene_kit_per_student: float = 0.0
    sales_commission_rate: float = 0.0  # % sobre receita
    other_variable_costs: float = 0.0


@dataclass
class CapexInputs:
    """Premissas de investimento inicial."""

    equipment_value: float = 0.0
    renovation_works: float = 0.0
    pre_operational_expenses: float = 0.0
    working_capital: float = 0.0
    furniture_fixtures: float = 0.0
    technology_setup: float = 0.0
    other_capex: float = 0.0


@dataclass
class FinancingInputs:
    """Premissas de financiamento."""

    financed_amount: float = 0.0
    monthly_interest_rate: float = 0.0  # ex.: 0.015 = 1.5% a.m.
    term_months: int = 0
    grace_period_months: int = 0


@dataclass
class TaxInputs:
    """Premissas fiscais."""

    tax_rate_on_revenue: float = 0.06  # Simples/Presumido


@dataclass
class FinancialInputs:
    """Todos os inputs de uma versão de orçamento para um período específico."""

    period: str = ""  # "YYYY-MM"
    revenue: RevenueInputs = field(default_factory=RevenueInputs)
    fixed_costs: FixedCostInputs = field(default_factory=FixedCostInputs)
    variable_costs: VariableCostInputs = field(default_factory=VariableCostInputs)
    capex: CapexInputs = field(default_factory=CapexInputs)
    financing: FinancingInputs = field(default_factory=FinancingInputs)
    taxes: TaxInputs = field(default_factory=TaxInputs)
    # Ramp-up override (se False, usa o cálculo padrão via occupancy_rate)
    is_pre_operational: bool = False


@dataclass
class PeriodResult:
    """Resultado calculado para um único período."""

    period: str = ""

    # Receita
    gross_revenue: float = 0.0
    membership_revenue: float = 0.0
    personal_training_revenue: float = 0.0
    other_revenue: float = 0.0

    # Custos fixos
    total_fixed_costs: float = 0.0
    rent_total: float = 0.0
    staff_costs: float = 0.0
    utility_costs: float = 0.0
    admin_costs: float = 0.0
    marketing_costs: float = 0.0
    equipment_costs: float = 0.0
    insurance_costs: float = 0.0
    other_fixed_costs: float = 0.0

    # Custos variáveis
    total_variable_costs: float = 0.0
    hygiene_kit_cost: float = 0.0
    sales_commission_cost: float = 0.0
    other_variable_costs: float = 0.0

    # Impostos
    taxes_on_revenue: float = 0.0

    # Financiamento
    financing_payment: float = 0.0
    financing_principal: float = 0.0
    financing_interest: float = 0.0

    # Resultados
    total_costs: float = 0.0
    operating_result: float = 0.0  # Receita - Custos fixos - Variáveis - Impostos
    net_result: float = 0.0  # Resultado Operacional - Financiamento
    net_margin: float = 0.0  # Net Result / Gross Revenue

    # KPIs
    active_students: int = 0
    occupancy_rate: float = 0.0
    break_even_students: int = 0
    burn_rate: float = 0.0  # Queima mensal (resultado negativo)
    ebitda: float = 0.0


@dataclass
class FinancialOutputs:
    """Outputs completos de um budget_version (todos os períodos)."""

    budget_version_id: str = ""
    unit_id: str = ""
    scenario_id: str = ""

    periods: list[PeriodResult] = field(default_factory=list)

    # Totais anuais — calculados pelo engine após os períodos
    annual_summaries: dict = field(default_factory=dict)

    # KPIs globais
    total_capex: float = 0.0
    payback_months: int | None = None
    total_revenue_all_periods: float = 0.0
    total_net_result_all_periods: float = 0.0
