"""
Atlas Finance — Calculations Endpoint
Dispara o motor financeiro para recalcular uma versão de orçamento.
"""

import calendar as _cal
import unicodedata

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.unit import Unit
from app.models.budget_version import BudgetVersion
from app.models.scenario import Scenario
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
from app.services.calendar_service import calendar_service
from app.models.calculated_result import CalculatedResult
from app.models.line_item import LineItemDefinition

router = APIRouter()

DEFAULT_TAX_GROWTH_RULE = {
    "type": "curve",
    "values": [0.06, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633],
}

WORKING_CAPITAL_CODE = "capital_giro_inicial"
WORKING_CAPITAL_BURN_NO_REVENUE_MONTHS_CODE = "caixa_meses_burn_sem_receita"
WORKING_CAPITAL_BURN_WITH_REVENUE_MONTHS_CODE = "caixa_meses_com_receita"
WORKING_CAPITAL_BURN_NO_REVENUE_MONTHS_CODE_LEGACY = "meses_de_burn_sem_receita_caixa"
WORKING_CAPITAL_BURN_WITH_REVENUE_MONTHS_CODE_LEGACY = "meses_considerando_receita_caixa"
DEFAULT_BURN_NO_REVENUE_MONTHS = 3.0
DEFAULT_BURN_WITH_REVENUE_MONTHS = 9.0


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
        if (
            val.period_date is not None
            and val.source_type == "calculated"
            and defn.growth_rule
        ):
            # Valores autoexpandidos não devem bloquear uma nova growth_rule.
            continue

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


def _upsert_assumption_value(
    *,
    db: Session,
    version_id: str,
    assumption_definition_id: str,
    numeric_value: float,
    updated_by: str,
    period_date: str | None = None,
    source_type: str = "derived",
) -> None:
    row = (
        db.query(AssumptionValue)
        .filter(
            AssumptionValue.budget_version_id == version_id,
            AssumptionValue.assumption_definition_id == assumption_definition_id,
            AssumptionValue.period_date == period_date,
        )
        .first()
    )
    if row:
        row.value_numeric = numeric_value
        row.source_type = source_type
        row.updated_by = updated_by
        return

    db.add(
        AssumptionValue(
            budget_version_id=version_id,
            assumption_definition_id=assumption_definition_id,
            period_date=period_date,
            value_numeric=numeric_value,
            source_type=source_type,
            updated_by=updated_by,
        )
    )


def _auto_update_working_capital_from_results(
    *,
    db: Session,
    version: BudgetVersion,
    updated_by: str,
) -> None:
    unit = db.query(Unit).filter(Unit.id == version.unit_id).first()
    if not unit:
        return

    definitions = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.business_id == unit.business_id,
            AssumptionDefinition.code.in_(
                [
                    WORKING_CAPITAL_CODE,
                    WORKING_CAPITAL_BURN_NO_REVENUE_MONTHS_CODE,
                    WORKING_CAPITAL_BURN_WITH_REVENUE_MONTHS_CODE,
                ]
            ),
            AssumptionDefinition.is_active == True,
        )
        .all()
    )
    def_by_code = {d.code: d for d in definitions}
    working_cap_def = def_by_code.get(WORKING_CAPITAL_CODE)
    if not working_cap_def:
        return
    if working_cap_def.include_in_dre:
        working_cap_def.include_in_dre = False

    assump_values = _load_assumption_values(version.id, db)

    def _get_first_available(codes: list[str], default: float) -> float:
        for code in codes:
            if (code, None) in assump_values:
                return _get(assump_values, code, default=default)
        return default

    burn_no_revenue_months = _get_first_available(
        [
            WORKING_CAPITAL_BURN_NO_REVENUE_MONTHS_CODE,
            WORKING_CAPITAL_BURN_NO_REVENUE_MONTHS_CODE_LEGACY,
        ],
        DEFAULT_BURN_NO_REVENUE_MONTHS,
    )
    burn_with_revenue_months = _get_first_available(
        [
            WORKING_CAPITAL_BURN_WITH_REVENUE_MONTHS_CODE,
            WORKING_CAPITAL_BURN_WITH_REVENUE_MONTHS_CODE_LEGACY,
        ],
        DEFAULT_BURN_WITH_REVENUE_MONTHS,
    )

    rows = (
        db.query(
            CalculatedResult.period_date,
            LineItemDefinition.code,
            CalculatedResult.value,
        )
        .join(LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id)
        .filter(
            CalculatedResult.budget_version_id == version.id,
            LineItemDefinition.code.in_(
                ["revenue_total", "total_variable_costs", "total_fixed_costs"]
            ),
        )
        .all()
    )

    if not rows:
        return

    period_metrics: dict[str, dict[str, float]] = {}
    for period, code, value in rows:
        period_metrics.setdefault(period, {})[code] = float(value or 0.0)

    periods = sorted(period_metrics.keys())[:12]
    if not periods:
        return

    burn_no_revenue_values: list[float] = []
    burn_with_revenue_values: list[float] = []
    for period in periods:
        metrics = period_metrics.get(period, {})
        revenue = abs(float(metrics.get("revenue_total", 0.0)))
        variable_costs = abs(float(metrics.get("total_variable_costs", 0.0)))
        fixed_costs = abs(float(metrics.get("total_fixed_costs", 0.0)))
        total_costs = variable_costs + fixed_costs
        monthly_result = revenue - total_costs

        burn_no_revenue_values.append(total_costs)
        burn_with_revenue_values.append(max(0.0, -monthly_result))

    avg_burn_no_revenue = sum(burn_no_revenue_values) / len(burn_no_revenue_values)
    avg_burn_with_revenue = sum(burn_with_revenue_values) / len(burn_with_revenue_values)

    required_by_no_revenue = avg_burn_no_revenue * max(0.0, burn_no_revenue_months)
    required_by_with_revenue = avg_burn_with_revenue * max(0.0, burn_with_revenue_months)
    working_capital_value = round(
        max(required_by_no_revenue, required_by_with_revenue),
        2,
    )

    first_period = periods[0]
    _upsert_assumption_value(
        db=db,
        version_id=version.id,
        assumption_definition_id=working_cap_def.id,
        numeric_value=working_capital_value,
        updated_by=updated_by,
        period_date=None,
        source_type="derived",
    )
    _upsert_assumption_value(
        db=db,
        version_id=version.id,
        assumption_definition_id=working_cap_def.id,
        numeric_value=working_capital_value,
        updated_by=updated_by,
        period_date=first_period,
        source_type="derived",
    )


def _build_inputs_for_version(
    version_id: str, db: Session
) -> tuple[list[FinancialInputs], CapexInputs, list[str]]:
    """
    Constrói a lista de FinancialInputs por período e o CapexInputs
    a partir dos assumption_values de uma versão.

    ETAPA-1: Usa a janela configurada na BudgetVersion (início + fim explícito
    ou projection_horizon_years) para gerar todo o horizonte temporal,
    independentemente de quantos AssumptionValues com period_date existirem.
    """
    values = _load_assumption_values(version_id, db)

    # ── ETAPA-1: Gera horizonte temporal a partir da data de abertura ──────
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    unit = (
        db.query(Unit).filter(Unit.id == version.unit_id).first() if version else None
    )

    # ── Multiplicador de Ocupação: herda taxa_ocupacao do cenário base ──────
    # Se o scenario desta versão tem occupancy_multiplier != 1.0, substitui os
    # valores de taxa_ocupacao pelos do cenário base × multiplier.
    if version and unit:
        scenario = db.query(Scenario).filter(Scenario.id == version.scenario_id).first()
        if scenario and abs((scenario.occupancy_multiplier or 1.0) - 1.0) > 1e-9 and scenario.scenario_type != "base":
            # Busca cenário base do mesmo business
            base_scenario = (
                db.query(Scenario)
                .filter(
                    Scenario.business_id == scenario.business_id,
                    Scenario.scenario_type == "base",
                    Scenario.is_active == True,
                )
                .first()
            )
            if base_scenario:
                # Busca versão base para a mesma unidade
                base_version = (
                    db.query(BudgetVersion)
                    .filter(
                        BudgetVersion.unit_id == unit.id,
                        BudgetVersion.scenario_id == base_scenario.id,
                        BudgetVersion.is_active == True,
                    )
                    .first()
                )
                if base_version:
                    base_values = _load_assumption_values(base_version.id, db)
                    mult = scenario.occupancy_multiplier
                    # Substitui todos os valores de taxa_ocupacao pela versão base × mult
                    for (code, period), val in base_values.items():
                        if code == "taxa_ocupacao":
                            values[(code, period)] = min(val * mult, 1.0)

    # ── Determina horizonte temporal ────────────────────────────────────────
    # `horizon_opening` = início da projeção (pode ser antes da abertura real,
    #   para capturar custos pré-operacionais). Usa effective_start_date se
    #   existir, caso contrário unit.opening_date.
    # `actual_opening_date` = data real de abertura da unidade (unit.opening_date).
    #   Meses ANTES desta data: receita = 0, custos mantidos.
    horizon_opening = None
    if version and version.effective_start_date:
        horizon_opening = version.effective_start_date
    elif unit and unit.opening_date:
        horizon_opening = unit.opening_date

    # Início operacional usado no recálculo:
    # se a versão definiu um horizonte inicial explícito, ele tem prioridade;
    # caso contrário, usa a opening_date da unidade.
    actual_opening_date = (
        version.effective_start_date
        if version and version.effective_start_date
        else (unit.opening_date if unit else None)
    )

    horizon_years = (version.projection_horizon_years or 9) if version else 9
    horizon_ending = version.effective_end_date if version else None

    if horizon_opening:
        periods = generate_horizon_periods(
            horizon_opening,
            horizon_years,
            ending_date=horizon_ending,
        )
    else:
        # Fallback: usa períodos já gravados nos assumption_values
        periods = sorted(set(p for (_, p) in values.keys() if p is not None))

    if not periods:
        periods = ["2026-11"]

    # Período de abertura real (YYYY-MM), usado para suprimir receita antes dele
    actual_opening_period = (
        f"{actual_opening_date.year}-{actual_opening_date.month:02d}"
        if actual_opening_date
        else None
    )

    # Fração do mês de abertura: aplicada ao PRIMEIRO MÊS REAL de operação.
    # Ex.: abertura dia 2 de agosto → (31 - 2 + 1) / 31 ≈ 0,968
    if actual_opening_date and actual_opening_date.day > 1:
        days_in_month = _cal.monthrange(
            actual_opening_date.year, actual_opening_date.month
        )[1]
        _first_month_fraction = round(
            (days_in_month - actual_opening_date.day + 1) / days_in_month, 4
        )
    else:
        _first_month_fraction = 1.0

    # ── ETAPA-2: Expande premissas via growth_rule ─────────────────────────
    # ETAPA-2: Expande TODAS as definições para todos os períodos.
    # Definições COM growth_rule: aplica a regra (compound_growth, curve, etc.).
    # Definições SEM growth_rule: propagação flat — o valor do 1º período
    #   conhecido é repetido para todos os períodos futuros.
    # Isso resolve o bug em que custos com periodicity="monthly" (sem growth_rule)
    # ficavam zerados em anos além do que o usuário salvou explicitamente.
    if unit:
        all_defns = (
            db.query(AssumptionDefinition)
            .filter(
                AssumptionDefinition.business_id == unit.business_id,
                AssumptionDefinition.is_active == True,
            )
            .all()
        )
        base_year = (
            horizon_opening.year
            if horizon_opening
            else (int(periods[0][:4]) if periods else 2026)
        )
        for defn in all_defns:
            # Base value: estático (period=None) > primeiro período > default_value
            base = values.get((defn.code, None))
            if base is None and periods:
                # Tenta o primeiro período com valor existente
                for p in periods:
                    if (defn.code, p) in values:
                        base = values[(defn.code, p)]
                        break
            if base is None:
                base = defn.default_value or 0.0
            rule = defn.growth_rule
            if defn.code == "aliquota_imposto_receita" and (
                not rule or rule.get("type") == "flat"
            ):
                rule = DEFAULT_TAX_GROWTH_RULE
            rule = rule or {"type": "flat"}
            expanded = expand_assumption(rule, float(base), periods, base_year)
            for period, val in expanded.items():
                # Só preenche se NÃO houver valor explícito para esse período
                if (defn.code, period) not in values:
                    values[(defn.code, period)] = val

    # ── ARCH-04: Mapeamento code → category_code para soma dinâmica ───────
    # Carrega todas as definições do negócio para identificar categorias
    code_category_map: dict[str, str] = {}
    code_data_type_map: dict[str, str] = {}
    code_include_in_dre_map: dict[str, bool] = {}
    if unit:
        all_defns_with_cat = (
            db.query(
                AssumptionDefinition.code,
                AssumptionCategory.code,
                AssumptionDefinition.data_type,
                AssumptionDefinition.include_in_dre,
            )
            .join(
                AssumptionCategory,
                AssumptionDefinition.category_id == AssumptionCategory.id,
            )
            .filter(
                AssumptionDefinition.business_id == unit.business_id,
                AssumptionDefinition.is_active == True,
            )
            .all()
        )
        code_category_map = {
            defn_code: cat_code
            for defn_code, cat_code, _, _ in all_defns_with_cat
        }
        code_data_type_map = {
            defn_code: data_type
            for defn_code, _, data_type, _ in all_defns_with_cat
        }
        code_include_in_dre_map = {
            defn_code: include_in_dre
            for defn_code, _, _, include_in_dre in all_defns_with_cat
        }

    def _is_salary_like_fixed_code(code: str) -> bool:
        normalized = (
            unicodedata.normalize("NFKD", code)
            .encode("ascii", "ignore")
            .decode("ascii")
            .lower()
        )
        return normalized.startswith("salario_")

    DRE_DRIVER_ONLY_CODES = {
        "slots_por_hora",
        "horas_dia_util",
        "horas_dia_sabado",
        "dias_uteis_mes",
        "sabados_mes",
        "taxa_ocupacao",
        "preco_medio_hora",
        "ticket_medio_plano_mensal",
        "ticket_medio_plano_trimestral",
        "ticket_medio_plano_anual",
        "mix_plano_mensal_pct",
        "mix_plano_trimestral_pct",
        "mix_plano_anual_pct",
        "mix_diamante_pct",
        "mix_ouro_pct",
        "mix_prata_pct",
        "mix_bronze_pct",
        "custo_energia_fixo",
        "custo_energia_variavel_max",
        "automacao_reducao_pct",
        "custo_agua_fixo",
        "custo_agua_variavel_max",
        "kwh_consumo_mensal",
        "tarifa_kwh",
        "consumo_agua_m3_mensal",
        "tarifa_agua_m3",
        "encargos_folha_pct",
        "beneficios_por_funcionario",
        "num_funcionarios",
        "kit_higiene_por_aluno",
        "comissao_vendas_pct",
        "taxa_cartao_pct",
        "aliquota_imposto_receita",
    }

    def _dre_enabled(code: str) -> bool:
        return code_include_in_dre_map.get(code, True)

    def _get_dre_value(code: str, period: str | None = None, default: float = 0.0) -> float:
        if not _dre_enabled(code):
            return 0.0
        return _get(values, code, period, default=default)

    def _get_input_value(code: str, period: str | None = None, default: float = 0.0) -> float:
        if code in DRE_DRIVER_ONLY_CODES or code.startswith("salario_"):
            return _get(values, code, period, default=default)
        return _get_dre_value(code, period, default=default)

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
    KNOWN_TAX_CODES = {
        "aliquota_imposto_receita",
        "taxa_cartao_pct",  # handled via variable_costs.card_fee_rate — must not be added to tax_rate
    }

    # Identifica codes desconhecidos por categoria (conjuntos reutilizados no loop)
    extra_fixed_codes = {
        code
        for (code, _) in values.keys()
        if code not in KNOWN_FIXED_CODES
        and code_category_map.get(code) in {"CUSTO_FIXO", "SALARIO"}
        and code_include_in_dre_map.get(code, True)
    }
    extra_var_codes = {
        code
        for (code, _) in values.keys()
        if code not in KNOWN_VARIABLE_CODES
        and code_category_map.get(code) == "CUSTO_VARIAVEL"
        and code_include_in_dre_map.get(code, True)
    }
    extra_tax_codes = {
        code
        for (code, _) in values.keys()
        if code not in KNOWN_TAX_CODES
        and code_category_map.get(code) == "FISCAL"
        and code_include_in_dre_map.get(code, True)
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

    inputs_list = []
    for idx, period in enumerate(periods):
        p = period  # alias

        # ── Pré-abertura: meses antes de unit.opening_date têm receita = 0 ────
        # A projeção pode começar antes da abertura (CAPEX, pré-operacional).
        # A receita só conta a partir do mês em que a unidade realmente abre.
        _is_pre_opening = (
            actual_opening_period is not None and period < actual_opening_period
        )
        _is_opening_month = (
            actual_opening_period is not None and period == actual_opening_period
        )

        # ── BE-A-05: CalendarService — dias úteis e sábados reais ─────────────
        # Se o usuário não cadastrou um valor explícito de "dias_uteis_mes" para
        # este período, usa o CalendarService que considera feriados nacionais.
        # Fallback final é 22 dias (mantido como constante transitória D-08).
        _unit_id_for_cal = unit.id if unit else None
        _explicit_working_days = (
            ("dias_uteis_mes", p) in values or ("dias_uteis_mes", None) in values
        )
        _explicit_saturdays = (
            ("sabados_mes", p) in values or ("sabados_mes", None) in values
        )

        if _explicit_working_days:
            _working_days = float(_get(values, "dias_uteis_mes", p, default=22.0))
        else:
            _working_days = float(
                calendar_service.get_working_days(db, _unit_id_for_cal, p)
            )

        if _explicit_saturdays:
            _saturdays = float(_get(values, "sabados_mes", p, default=4.0))
        else:
            _saturdays = float(calendar_service.get_saturdays(db, _unit_id_for_cal, p))

        revenue = RevenueInputs(
            # ── B2B Coworking (slot/hora) ──────────────────────────────────────
            slots_per_hour=int(_get(values, "slots_por_hora", p, default=10)),
            hours_per_day_weekday=float(
                _get(values, "horas_dia_util", p, default=17.0)
            ),
            hours_per_day_saturday=float(
                _get(values, "horas_dia_sabado", p, default=7.0)
            ),
            working_days_month=_working_days,
            saturdays_month=_saturdays,
            avg_price_per_hour=float(_get(values, "preco_medio_hora", p, default=60.0)),
            # GAP-02: mix real de planos (Bronze/Prata/Ouro/Diamante) do banco
            service_plans=service_plan_mix,
            # ── Legado (mantido para compat. de versões antigas) ──────────────
            max_students=0
            if _is_pre_opening
            else int(_get(values, "alunos_capacidade_maxima", p, default=0)),
            occupancy_rate=0.0
            if _is_pre_opening
            else _get(values, "taxa_ocupacao", p, default=0.0),
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
            num_personal_trainers=0
            if _is_pre_opening
            else int(_get(values, "num_personal_trainers", p, default=0)),
            avg_personal_revenue_month=0.0
            if _is_pre_opening
            else _get(values, "receita_media_personal_mes", p, default=0.0),
            other_revenue=0.0
            if _is_pre_opening
            else _get_input_value("outras_receitas", p, default=0.0),
        )

        fixed = FixedCostInputs(
            rent=_get_input_value("aluguel_mensal", p),
            condo_fee=_get_input_value("condominio_mensal", p),
            iptu=_get_input_value("iptu_mensal", p),
            cleaning_staff_salary=_get_input_value("salario_limpeza", p),
            receptionist_salary=_get_input_value("salario_recepcao", p),
            marketing_staff_salary=_get_input_value("salario_marketing", p),
            commercial_staff_salary=_get_input_value("salario_comercial", p),
            manager_salary=_get_input_value("salario_gerente", p),
            fitness_teacher_salary=_get_input_value("salario_educador_fisico", p),
            pro_labore=_get_input_value("pro_labore", p),
            social_charges_rate=_get_input_value("encargos_folha_pct", p, default=0.80),
            benefits_per_employee=_get_input_value("beneficios_por_funcionario", p),
            num_employees=int(_get_input_value("num_funcionarios", p)),
            # ── Energia: modelo misto (fixo + variável × ocupação) ─────────────
            fixed_energy_cost=_get_input_value("custo_energia_fixo", p, default=0.0),
            max_variable_energy_cost=_get_input_value(
                "custo_energia_variavel_max", p, default=0.0
            ),
            automation_reduction=_get_input_value("automacao_reducao_pct", p, default=0.0),
            # ── Água: modelo misto (fixo + variável × ocupação) ────────────────
            fixed_water_cost=_get_input_value("custo_agua_fixo", p, default=0.0),
            max_variable_water_cost=_get_input_value(
                "custo_agua_variavel_max", p, default=0.0
            ),
            # ── Legado (kWh × tarifa) — usado se fixo/variável = 0 ────────────
            electricity_kwh=_get_input_value("kwh_consumo_mensal", p, default=0.0),
            electricity_rate=_get_input_value("tarifa_kwh", p, default=0.0),
            water_m3=_get_input_value("consumo_agua_m3_mensal", p, default=0.0),
            water_rate=_get_input_value("tarifa_agua_m3", p, default=0.0),
            internet_phone=_get_input_value("internet_telefonia_mensal", p),
            office_supplies=_get_input_value("material_escritorio", p),
            hygiene_cleaning=_get_input_value("higiene_limpeza_mensal", p),
            management_software=_get_input_value("sistema_gestao_mensal", p),
            legal_fees=_get_input_value("juridico_mensal", p),
            accounting_fees=_get_input_value("contabilidade_mensal", p),
            administrative_services=_get_input_value("servicos_administrativos", p),
            property_insurance=_get_input_value("seguro_imovel", p),
            equipment_insurance=_get_input_value("seguro_equipamentos", p),
            digital_marketing=_get_input_value("marketing_digital_mensal", p),
            brand_materials=_get_input_value("material_identidade_visual", p),
            promotional_materials=_get_input_value("material_publicitario", p),
            depreciation_equipment=_get_input_value("depreciacao_equipamentos", p),
            maintenance_equipment=_get_input_value("manutencao_equipamentos", p),
            security_systems=_get_input_value("sistemas_seguranca", p),
            financial_fees=_get_input_value("despesas_financeiras_taxas", p),
        )

        variable = VariableCostInputs(
            hygiene_kit_per_student=_get_input_value("kit_higiene_por_aluno", p),
            sales_commission_rate=_get_input_value("comissao_vendas_pct", p),
            card_fee_rate=_get_input_value("taxa_cartao_pct", p, default=0.0),
            other_variable_costs=_get_input_value("outros_custos_variaveis", p),
        )
        tax_rate = _get_input_value("aliquota_imposto_receita", p, default=0.06)

        # ── ARCH-04: Acumula premissas desconhecidas por categoria ─────────
        for code in extra_fixed_codes:
            extra_val = _get(values, code, p, default=0.0)
            if _is_salary_like_fixed_code(code):
                fixed.additional_clt_salary_base = round(
                    fixed.additional_clt_salary_base + extra_val, 2
                )
            else:
                fixed.other_fixed_costs = round(fixed.other_fixed_costs + extra_val, 2)

        for code in extra_var_codes:
            extra_val = _get(values, code, p, default=0.0)
            if code_data_type_map.get(code) == "percentage":
                variable.other_variable_cost_rate = round(
                    variable.other_variable_cost_rate + extra_val, 6
                )
            else:
                variable.other_variable_costs = round(
                    variable.other_variable_costs + extra_val, 2
                )

        for code in extra_tax_codes:
            extra_val = _get(values, code, p, default=0.0)
            if code_data_type_map.get(code) == "percentage":
                tax_rate = round(tax_rate + extra_val, 6)
            else:
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
                # Fração do primeiro mês real de operação (abertura no meio do mês)
                month_fraction=_first_month_fraction if _is_opening_month else 1.0,
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
    _auto_update_working_capital_from_results(
        db=db,
        version=version,
        updated_by=current_user.id,
    )
    db.commit()

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
