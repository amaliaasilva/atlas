"""
Atlas Finance — Calculations Endpoint
Dispara o motor financeiro para recalcular uma versão de orçamento.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.unit import Unit
from app.models.budget_version import BudgetVersion
from app.models.assumption import (
    AssumptionValue,
    AssumptionDefinition,
    AssumptionCategory,
)
from app.models.financing_contract import FinancingContract
from app.models.service_plan import ServicePlan
from app.services.financial_engine import FinancialEngine
from app.services.financial_engine.models import (
    FinancialInputs,
    RevenueInputs,
    FixedCostInputs,
    VariableCostInputs,
    CapexInputs,
    FinancingInputs,
    FinancingContractInputs,
    ServicePlanMix,
    TaxInputs,
)
from app.services.financial_engine.consolidator import consolidate_business
from app.services.financial_engine.utils import generate_horizon_periods
from app.services.financial_engine.expander import expand_assumption

router = APIRouter()


def _load_assumption_values(version_id: str, db: Session) -> dict:
    """
    Carrega os assumption_values de uma versão e retorna um dict
    {(definition_code, period_date): value_numeric}.
    """
    rows = (
        db.query(AssumptionValue, AssumptionDefinition)
        .join(
            AssumptionDefinition,
            AssumptionValue.assumption_definition_id == AssumptionDefinition.id,
        )
        .filter(AssumptionValue.budget_version_id == version_id)
        .all()
    )
    result = {}
    for val, defn in rows:
        key = (defn.code, val.period_date)
        result[key] = (
            val.value_numeric
            if val.value_numeric is not None
            else defn.default_value or 0.0
        )
    return result


def _get(
    values: dict, code: str, period: str | None = None, default: float = 0.0
) -> float:
    """Helper para buscar um valor por code e período."""
    v = values.get((code, period)) or values.get((code, None))
    return float(v) if v is not None else default


def _build_inputs_for_version(
    version_id: str, db: Session
) -> tuple[list[FinancialInputs], CapexInputs, list[str]]:
    """
    Constrói a lista de FinancialInputs por período e o CapexInputs
    a partir dos assumption_values de uma versão.

    ETAPA-1: Usa opening_date + projection_horizon_years para gerar o
    horizonte de 120 meses, independentemente de quantos AssumptionValues
    com period_date existirem.
    """
    values = _load_assumption_values(version_id, db)

    # ── ETAPA-1: Gera horizonte temporal a partir da data de abertura ──────
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    unit = (
        db.query(Unit).filter(Unit.id == version.unit_id).first() if version else None
    )

    opening = None
    if version and version.effective_start_date:
        opening = version.effective_start_date
    elif unit and unit.opening_date:
        opening = unit.opening_date

    horizon_years = (version.projection_horizon_years or 10) if version else 10

    if opening:
        periods = generate_horizon_periods(opening, horizon_years)
    else:
        # Fallback: usa períodos já gravados nos assumption_values
        periods = sorted(set(p for (_, p) in values.keys() if p is not None))
        if not periods:
            periods = ["2026-11"]

    # ── ETAPA-2: Expande premissas via growth_rule ─────────────────────────
    # Carrega todas as AssumptionDefinitions que têm growth_rule definido.
    # Para cada uma, gera valores expandidos por período — sem sobrescrever
    # valores explicitamente salvos pelo usuário.
    if unit:
        defns_with_rule = (
            db.query(AssumptionDefinition)
            .filter(
                AssumptionDefinition.business_id == unit.business_id,
                AssumptionDefinition.growth_rule.isnot(None),
            )
            .all()
        )
        base_year = (
            opening.year if opening else (int(periods[0][:4]) if periods else 2026)
        )
        for defn in defns_with_rule:
            # Base value: valor estático explícito do usuário > primeiro período explícito > default da definição
            # O frontend salva valores com period_date='YYYY-MM', não None.
            # Por isso precisamos checar o primeiro período SE não houver valor estático.
            base = values.get((defn.code, None))
            if base is None and periods:
                base = values.get((defn.code, periods[0]))
            if base is None:
                base = defn.default_value or 0.0
            expanded = expand_assumption(
                defn.growth_rule, float(base), periods, base_year
            )
            for period, val in expanded.items():
                # Só preenche se NÃO houver valor explícito para esse período
                if (defn.code, period) not in values:
                    values[(defn.code, period)] = val

    # ── ARCH-04: Mapeamento code → category_code para soma dinâmica ───────
    # Carrega todas as definições do negócio para identificar categorias
    code_category_map: dict[str, str] = {}
    if unit:
        all_defns_with_cat = (
            db.query(AssumptionDefinition.code, AssumptionCategory.code)
            .join(
                AssumptionCategory,
                AssumptionDefinition.category_id == AssumptionCategory.id,
            )
            .filter(AssumptionDefinition.business_id == unit.business_id)
            .all()
        )
        code_category_map = {
            defn_code: cat_code for defn_code, cat_code in all_defns_with_cat
        }

    # Codes já mapeados em inputs estruturados — não devem ser somados duas vezes
    KNOWN_FIXED_CODES = {
        "aluguel_mensal",
        "condominio_mensal",
        "iptu_mensal",
        "salario_limpeza",
        "salario_recepcao",
        "salario_marketing",
        "salario_comercial",
        "salario_gerente",
        "salario_educador_fisico",
        "pro_labore",
        "encargos_folha_pct",
        "beneficios_por_funcionario",
        "num_funcionarios",
        "contabilidade_mensal",
        "marketing_digital_mensal",
        "material_identidade_visual",
        "seguro_imovel",
        "seguro_equipamentos",
        "sistemas_seguranca",
        "servicos_administrativos",
        "juridico_mensal",
        "sistema_gestao_mensal",
        "material_escritorio",
        "higiene_limpeza_mensal",
        "material_publicitario",
        "custo_energia_fixo",
        "custo_energia_variavel_max",
        "automacao_reducao_pct",
        "kwh_consumo_mensal",
        "tarifa_kwh",
        "custo_agua_fixo",
        "custo_agua_variavel_max",
        "consumo_agua_m3_mensal",
        "tarifa_agua_m3",
        "internet_telefonia_mensal",
        "depreciacao_equipamentos",
        "manutencao_equipamentos",
        "despesas_financeiras_taxas",
    }
    KNOWN_VARIABLE_CODES = {
        "kit_higiene_por_aluno",
        "comissao_vendas_pct",
        "taxa_cartao_pct",
        "outros_custos_variaveis",
    }

    # Identifica codes desconhecidos por categoria (conjuntos reutilizados no loop)
    extra_fixed_codes = {
        code
        for (code, _) in values.keys()
        if code not in KNOWN_FIXED_CODES and code_category_map.get(code) == "CUSTO_FIXO"
    }
    extra_var_codes = {
        code
        for (code, _) in values.keys()
        if code not in KNOWN_VARIABLE_CODES
        and code_category_map.get(code) == "CUSTO_VARIAVEL"
    }

    # ── ARCH-02: Carrega múltiplos contratos de financiamento ──────────────
    db_contracts = (
        (
            db.query(FinancingContract)
            .filter(FinancingContract.budget_version_id == version_id)
            .order_by(FinancingContract.sort_order)
            .all()
        )
        if version
        else []
    )

    contract_inputs: list[FinancingContractInputs] = [
        FinancingContractInputs(
            name=c.name,
            financed_amount=c.financed_amount,
            monthly_rate=c.monthly_rate,
            term_months=c.term_months,
            grace_period_months=c.grace_period_months,
            down_payment_pct=c.down_payment_pct,
            start_offset_months=0,  # TODO: derivar de c.start_date vs opening
        )
        for c in db_contracts
    ]

    # ── GAP-02: Carrega mix de planos de serviço (Bronze/Prata/Ouro/Diamante) ─
    db_plans: list[ServicePlan] = []
    if unit:
        db_plans = (
            db.query(ServicePlan)
            .filter(
                ServicePlan.business_id == unit.business_id,
                ServicePlan.is_active == True,
            )
            .order_by(ServicePlan.sort_order)
            .all()
        )

    service_plan_mix: list[ServicePlanMix] = (
        [
            ServicePlanMix(
                name=sp.name,
                price_per_hour=sp.price_per_hour,
                mix_pct=sp.target_mix_pct,
            )
            for sp in db_plans
        ]
        if db_plans
        else []
    )

    capex = CapexInputs(
        equipment_value=_get(values, "valor_equipamentos"),
        renovation_works=_get(values, "custo_obras_adaptacoes"),
        pre_operational_expenses=_get(values, "despesas_preoperacionais"),
        working_capital=_get(values, "capital_giro_inicial"),
        furniture_fixtures=_get(values, "moveis_e_fixtures"),
        technology_setup=_get(values, "tecnologia_setup"),
        other_capex=_get(values, "outros_capex"),
        # GAP-05: novos itens de CAPEX
        architect_fees=_get(values, "honorarios_arquiteto"),
        ac_automation=_get(values, "automacao_ac"),
        branding_budget=_get(values, "branding_identidade_visual"),
        equipment_useful_life_months=int(
            _get(values, "vida_util_equipamentos_meses", default=60)
        ),
        renovation_useful_life_months=int(
            _get(values, "vida_util_reforma_meses", default=120)
        ),
    )

    # Legado: contrato único (usado apenas se não houver FinancingContract cadastrados)
    financing = FinancingInputs(
        financed_amount=_get(values, "valor_financiado"),
        monthly_interest_rate=_get(values, "taxa_juros_mensal"),
        term_months=int(_get(values, "prazo_meses")),
        grace_period_months=int(_get(values, "carencia_meses")),
    )

    tax_rate = _get(values, "aliquota_imposto_receita", default=0.06)

    inputs_list = []
    for period in periods:
        p = period  # alias
        revenue = RevenueInputs(
            # ── B2B Coworking (slot/hora) ──────────────────────────────────────
            slots_per_hour=int(_get(values, "slots_por_hora", p, default=10)),
            hours_per_day_weekday=float(
                _get(values, "horas_dia_util", p, default=17.0)
            ),
            hours_per_day_saturday=float(
                _get(values, "horas_dia_sabado", p, default=7.0)
            ),
            working_days_month=int(_get(values, "dias_uteis_mes", p, default=22)),
            saturdays_month=int(_get(values, "sabados_mes", p, default=4)),
            avg_price_per_hour=float(_get(values, "preco_medio_hora", p, default=60.0)),
            # GAP-02: mix real de planos (Bronze/Prata/Ouro/Diamante) do banco
            service_plans=service_plan_mix,
            # ── Legado (mantido para compat. de versões antigas) ──────────────
            max_students=int(_get(values, "alunos_capacidade_maxima", p, default=0)),
            occupancy_rate=_get(values, "taxa_ocupacao", p, default=0.0),
            avg_ticket_monthly=_get(
                values, "ticket_medio_plano_mensal", p, default=0.0
            ),
            avg_ticket_quarterly=_get(
                values, "ticket_medio_plano_trimestral", p, default=0.0
            ),
            avg_ticket_annual=_get(values, "ticket_medio_plano_anual", p, default=0.0),
            mix_monthly_pct=_get(values, "mix_plano_mensal_pct", p, default=1.0),
            mix_quarterly_pct=_get(values, "mix_plano_trimestral_pct", p, default=0.0),
            mix_annual_pct=_get(values, "mix_plano_anual_pct", p, default=0.0),
            num_personal_trainers=int(
                _get(values, "num_personal_trainers", p, default=0)
            ),
            avg_personal_revenue_month=_get(
                values, "receita_media_personal_mes", p, default=0.0
            ),
            other_revenue=_get(values, "outras_receitas", p, default=0.0),
        )

        fixed = FixedCostInputs(
            rent=_get(values, "aluguel_mensal", p),
            condo_fee=_get(values, "condominio_mensal", p),
            iptu=_get(values, "iptu_mensal", p),
            cleaning_staff_salary=_get(values, "salario_limpeza", p),
            receptionist_salary=_get(values, "salario_recepcao", p),
            marketing_staff_salary=_get(values, "salario_marketing", p),
            commercial_staff_salary=_get(values, "salario_comercial", p),
            manager_salary=_get(values, "salario_gerente", p),
            fitness_teacher_salary=_get(values, "salario_educador_fisico", p),
            pro_labore=_get(values, "pro_labore", p),
            social_charges_rate=_get(values, "encargos_folha_pct", p, default=0.80),
            benefits_per_employee=_get(values, "beneficios_por_funcionario", p),
            num_employees=int(_get(values, "num_funcionarios", p)),
            # ── Energia: modelo misto (fixo + variável × ocupação) ─────────────
            fixed_energy_cost=_get(values, "custo_energia_fixo", p, default=0.0),
            max_variable_energy_cost=_get(
                values, "custo_energia_variavel_max", p, default=0.0
            ),
            automation_reduction=_get(values, "automacao_reducao_pct", p, default=0.0),
            # ── Água: modelo misto (fixo + variável × ocupação) ────────────────
            fixed_water_cost=_get(values, "custo_agua_fixo", p, default=0.0),
            max_variable_water_cost=_get(
                values, "custo_agua_variavel_max", p, default=0.0
            ),
            # ── Legado (kWh × tarifa) — usado se fixo/variável = 0 ────────────
            electricity_kwh=_get(values, "kwh_consumo_mensal", p, default=0.0),
            electricity_rate=_get(values, "tarifa_kwh", p, default=0.0),
            water_m3=_get(values, "consumo_agua_m3_mensal", p, default=0.0),
            water_rate=_get(values, "tarifa_agua_m3", p, default=0.0),
            internet_phone=_get(values, "internet_telefonia_mensal", p),
            office_supplies=_get(values, "material_escritorio", p),
            hygiene_cleaning=_get(values, "higiene_limpeza_mensal", p),
            management_software=_get(values, "sistema_gestao_mensal", p),
            legal_fees=_get(values, "juridico_mensal", p),
            accounting_fees=_get(values, "contabilidade_mensal", p),
            administrative_services=_get(values, "servicos_administrativos", p),
            property_insurance=_get(values, "seguro_imovel", p),
            equipment_insurance=_get(values, "seguro_equipamentos", p),
            digital_marketing=_get(values, "marketing_digital_mensal", p),
            brand_materials=_get(values, "material_identidade_visual", p),
            promotional_materials=_get(values, "material_publicitario", p),
            depreciation_equipment=_get(values, "depreciacao_equipamentos", p),
            maintenance_equipment=_get(values, "manutencao_equipamentos", p),
            security_systems=_get(values, "sistemas_seguranca", p),
            financial_fees=_get(values, "despesas_financeiras_taxas", p),
        )

        variable = VariableCostInputs(
            hygiene_kit_per_student=_get(values, "kit_higiene_por_aluno", p),
            sales_commission_rate=_get(values, "comissao_vendas_pct", p),
            card_fee_rate=_get(values, "taxa_cartao_pct", p, default=0.0),
            other_variable_costs=_get(values, "outros_custos_variaveis", p),
        )

        # ── ARCH-04: Acumula premissas desconhecidas por categoria ─────────
        for code in extra_fixed_codes:
            extra_val = _get(values, code, p, default=0.0)
            fixed.other_fixed_costs = round(fixed.other_fixed_costs + extra_val, 2)

        for code in extra_var_codes:
            extra_val = _get(values, code, p, default=0.0)
            variable.other_variable_costs = round(
                variable.other_variable_costs + extra_val, 2
            )

        inputs_list.append(
            FinancialInputs(
                period=period,
                revenue=revenue,
                fixed_costs=fixed,
                variable_costs=variable,
                capex=capex,
                # ARCH-02: múltiplos contratos têm prioridade sobre legado
                financing_contracts=contract_inputs,
                financing=financing,
                taxes=TaxInputs(tax_rate_on_revenue=tax_rate),
            )
        )

    return inputs_list, capex, periods


class RecalculateResponse(BaseModel):
    budget_version_id: str
    periods_calculated: int
    total_revenue: float
    total_net_result: float
    payback_months: int | None
    annual_summaries: dict


@router.post("/recalculate/{version_id}", response_model=RecalculateResponse)
def recalculate_version(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executa o motor financeiro para uma versão de orçamento.
    Apaga resultados anteriores e gera novos.
    """
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versão não encontrada")

    if version.status == "archived":
        raise HTTPException(
            status_code=409, detail="Versão arquivada não pode ser recalculada"
        )

    inputs_list, capex, periods = _build_inputs_for_version(version_id, db)

    engine = FinancialEngine()
    outputs = engine.calculate(
        inputs_by_period=inputs_list,
        capex=capex,
        budget_version_id=version_id,
        unit_id=version.unit_id,
        scenario_id=version.scenario_id,
    )

    engine.persist(outputs, db)

    return RecalculateResponse(
        budget_version_id=version_id,
        periods_calculated=len(outputs.periods),
        total_revenue=outputs.total_revenue_all_periods,
        total_net_result=outputs.total_net_result_all_periods,
        payback_months=outputs.payback_months,
        annual_summaries=outputs.annual_summaries,
    )


@router.post("/consolidate/{business_id}/{scenario_id}")
def consolidate(
    business_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Consolida resultados de todas as unidades publicadas de um negócio.
    """
    rows = consolidate_business(business_id, scenario_id, db)
    return {
        "consolidated_rows": len(rows),
        "business_id": business_id,
        "scenario_id": scenario_id,
    }


@router.get("/results/{version_id}")
def get_results(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os resultados calculados de uma versão de orçamento."""
    from app.models.calculated_result import CalculatedResult
    from app.models.line_item import LineItemDefinition

    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(CalculatedResult.budget_version_id == version_id)
        .order_by(CalculatedResult.period_date, LineItemDefinition.display_order)
        .all()
    )
    return [
        {
            "period_date": r.period_date,
            "metric_code": li.code,
            "metric_name": li.name,
            "category": li.category,
            "value": r.value,
        }
        for r, li in results
    ]
