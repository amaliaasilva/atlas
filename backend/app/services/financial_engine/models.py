"""
Atlas Finance — Financial Engine Data Models
Tipos de dados puros (sem ORM) para o motor financeiro.
Esses tipos garantem que o motor pode ser testado sem banco de dados.
"""

from dataclasses import dataclass, field


@dataclass
class ServicePlanMix:
    """
    Representa um plano de serviço no mix de receita (ex: Bronze/Prata/Ouro/Diamante).
    O preço médio ponderado é derivado de Σ(price_per_hour × mix_pct).
    """

    name: str = ""
    price_per_hour: float = 0.0  # R$/hora para este plano
    mix_pct: float = 0.0  # participação no mix 0.0–1.0 (deve somar 1.0)


@dataclass
class FinancingContractInputs:
    """
    Premissas de um contrato de financiamento individual.
    Permite modelar múltiplos contratos por BudgetVersion (ARCH-02/GAP-06).

    start_offset_months: meses a partir do mês 1 do horizonte em que este
    contrato passa a ter prestações (0 = começa imediatamente).
    """

    name: str = ""
    financed_amount: float = 0.0
    monthly_rate: float = 0.0  # ex.: 0.012 = 1.2% a.m.
    term_months: int = 0
    grace_period_months: int = 0
    down_payment_pct: float = 0.0  # % de entrada já paga (ex: 0.20 = 20%)
    start_offset_months: int = 0  # offset desde o início do horizonte


@dataclass
class RevenueInputs:
    """
    Premissas de receita para uma unidade de coworking B2B (venda de slots/hora para PTs).

    O modelo correto (GAP-01/02) é:
      receita = vagas_por_hora × horas_dia × dias_mes × taxa_ocupacao × preco_medio_ponderado
    onde preco_medio_ponderado é derivado do mix de planos (ServicePlan).

    Campos mantidos por compatibilidade com os dados de seed existentes (_legacy):
    poderão ser removidos quando a Financial Engine for refatorada.
    """

    # ── Modelo Coworking B2B ───────────────────────────────────────────────────
    # Campos operacionais da unidade (espelhados de Unit para o engine)
    slots_per_hour: int = 10  # vagas simultâneas por hora
    hours_per_day_weekday: float = 17.0  # horário seg–sex (ex: 05h–22h = 17h)
    hours_per_day_saturday: float = 7.0  # horário sábado (ex: 08h–15h = 7h)
    working_days_month: int = 22  # dias úteis no mês (seg–sex, sem feriados)
    saturdays_month: int = 4  # sábados no mês
    occupancy_rate: float = 0.0  # taxa de ocupação 0.0–1.0

    # Mix de planos de serviço (Bronze/Prata/Ouro/Diamante).
    # Se preenchido, calcula avg_price_per_hour automaticamente.
    service_plans: list["ServicePlanMix"] = field(default_factory=list)
    # Preço médio manual (usado se service_plans estiver vazio)
    avg_price_per_hour: float = 0.0

    # Outras receitas fixas mensais (ex: locação de sala)
    other_revenue: float = 0.0

    # ── Legado (mantido para compatibilidade) ─────────────────────────────────
    max_students: int = 0
    avg_ticket_monthly: float = 0.0
    avg_ticket_quarterly: float = 0.0
    avg_ticket_annual: float = 0.0
    mix_monthly_pct: float = 1.0
    mix_quarterly_pct: float = 0.0
    mix_annual_pct: float = 0.0
    num_personal_trainers: int = 0
    avg_personal_revenue_month: float = 0.0


@dataclass
class FixedCostInputs:
    """
    Premissas de custos fixos mensais.

    Utilities (GAP-03): modelo misto fixo + variável por ocupação.
      custo_energia = fixed_energy_cost + max_variable_energy_cost × occ_rate × (1 - automation_reduction)
      custo_agua    = fixed_water_cost  + max_variable_water_cost  × occ_rate

    Folha (GAP-04): social_charges_rate corrigido para ~0.80 (80% sobre salário,
      incluindo INSS empregador + FGTS + benefícios integrados).
      pro_labore NÃO incide encargos (separado do cálculo).
    """

    rent: float = 0.0
    condo_fee: float = 0.0
    iptu: float = 0.0

    # ── Equipe ────────────────────────────────────────────────────────────────
    cleaning_staff_salary: float = 0.0
    receptionist_salary: float = 0.0
    marketing_staff_salary: float = 0.0
    commercial_staff_salary: float = 0.0
    manager_salary: float = 0.0
    fitness_teacher_salary: float = 0.0
    pro_labore: float = 0.0  # NÃO incide encargos sociais
    # GAP-04: encargos totais reais (~80% sobre salário bruto, ex: INSS+FGTS+benefícios)
    social_charges_rate: float = 0.80
    benefits_per_employee: float = 0.0
    num_employees: int = 0

    # ── Utilities (modelo misto — GAP-03) ─────────────────────────────────────
    # Energia: parcela fixa + parcela variável proporcional à ocupação
    fixed_energy_cost: float = 0.0  # R$/mês (custo base independente de ocupação)
    max_variable_energy_cost: float = 0.0  # R$/mês a 100% ocupação
    automation_reduction: float = (
        0.0  # 0.0–1.0 (ex: 0.20 = 20% de economia por automação)
    )
    # Água: parcela fixa + parcela variável proporcional à ocupação
    fixed_water_cost: float = 0.0
    max_variable_water_cost: float = 0.0
    internet_phone: float = 0.0

    # Legado (mantido por compatibilidade com seed — remover após refatoração do engine)
    electricity_kwh: float = 0.0
    electricity_rate: float = 0.0
    water_m3: float = 0.0
    water_rate: float = 0.0

    # ── Administrative ────────────────────────────────────────────────────────
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
    depreciation_renovation: float = (
        0.0  # depreciação linear de obras (renovation_works / vida útil)
    )
    maintenance_equipment: float = 0.0
    # Other
    security_systems: float = 0.0
    financial_fees: float = 0.0
    other_fixed_costs: float = (
        0.0  # ARCH-04: acumula premissas desconhecidas da categoria CUSTO_FIXO
    )


@dataclass
class VariableCostInputs:
    """Premissas de custos variáveis."""

    hygiene_kit_per_student: float = 0.0
    sales_commission_rate: float = 0.0  # % sobre receita
    card_fee_rate: float = (
        0.0  # % sobre receita (taxa adquirente cartão, ex: 0.035 = 3,5%)
    )
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
    # GAP-05: itens adicionais da planilha
    architect_fees: float = 0.0  # honorários de arquiteto
    ac_automation: float = 0.0  # automação de A/C
    branding_budget: float = 0.0  # identidade visual / branding
    # Vidas úteis para depreciação automática
    equipment_useful_life_months: int = 60  # depreciação mensal = equipment_value / 60
    renovation_useful_life_months: int = (
        120  # depreciação mensal = renovation_works / 120
    )


@dataclass
class FinancingInputs:
    """
    Premissas de financiamento — LEGADO (único contrato).
    Mantido para compatibilidade com seed existente.
    Use FinancingContract (entidade ORM) para os múltiplos contratos reais (GAP-06/ARCH-02).
    """

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
    # Múltiplos contratos de financiamento (ARCH-02). Se preenchido, sobrescreve `financing`.
    financing_contracts: list["FinancingContractInputs"] = field(default_factory=list)
    # Legado — contrato único
    financing: FinancingInputs = field(default_factory=FinancingInputs)
    taxes: TaxInputs = field(default_factory=TaxInputs)
    # Se True, apenas aluguel incide (período pré-operacional antes da inauguração)
    is_pre_operational: bool = False
    # Fração do mês efetivo (0.0–1.0). Usado no mês de abertura quando opening_date.day > 1.
    # Ex: abertura em 15/04 com 30 dias → fraction = 16/30 ≈ 0.533.
    # Receita, custos variáveis e utilitários variáveis são escalados por este fator.
    month_fraction: float = 1.0


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
    card_fee_cost: float = 0.0
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

    # KPIs — Coworking B2B
    active_students: int = 0  # Equivalente a horas vendidas (compat.)
    occupancy_rate: float = 0.0
    capacity_hours_month: float = 0.0  # Horas totais disponíveis no mês
    active_hours_month: float = 0.0  # Horas efetivamente vendidas
    avg_price_per_hour: float = 0.0  # Preço médio ponderado do mix
    # D-04: três variantes de preço médio/hora (denominadores distintos)
    avg_price_per_hour_sold: float = 0.0  # receita / horas vendidas
    avg_price_per_hour_occupied: float = (
        0.0  # receita / horas ocupadas (= sold para B2B)
    )
    avg_price_per_hour_available: float = (
        0.0  # receita / horas disponíveis (calendário)
    )

    # Breakeven
    break_even_students: int = 0  # Horas/mês para break-even (compat.)
    break_even_revenue: float = 0.0  # Receita mínima para break-even (R$)
    break_even_occupancy_pct: float = 0.0  # Ocupação mínima para break-even

    # Margem
    contribution_margin_pct: float = 0.0  # Margem de contribuição (%)

    burn_rate: float = 0.0  # Queima mensal (resultado negativo)
    ebitda: float = 0.0

    # Professores necessários por cenário de break-even (GAP-06)
    teachers_needed_pessimistic: int = 0  # 1.0 aluno/prof
    teachers_needed_medium: int = 0  # 1.5 alunos/prof
    teachers_needed_optimistic: int = 0  # 2.0 alunos/prof

    # Trilha de cálculo auditavel por período
    calculation_trace: dict = field(default_factory=dict)


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
