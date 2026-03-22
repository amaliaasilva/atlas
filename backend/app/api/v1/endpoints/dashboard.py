"""
Atlas Finance — Dashboard Endpoint
KPIs executivos por unidade e consolidados.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from collections import defaultdict

from app.core.database import get_db
from app.api.v1.deps import get_current_user, verify_business_access
from app.models.user import User
from app.models.calculated_result import CalculatedResult
from app.models.line_item import LineItemDefinition
from app.models.budget_version import BudgetVersion
from app.models.unit import Unit
from app.models.franchise_fee_config import FranchiseFeeConfig

router = APIRouter()

KPI_CODES = [
    "revenue_total",
    "total_fixed_costs",
    "total_variable_costs",
    "taxes_on_revenue",
    "financing_payment",
    "operating_result",
    "net_result",
    "ebitda",
    "break_even_students",
    # KPIs B2B Coworking
    "occupancy_rate",
    "capacity_hours_month",
    "active_hours_month",
    "active_students",
    "break_even_revenue",
    "break_even_occupancy_pct",
    "contribution_margin_pct",
    "net_margin",
    # Professores necessários (GAP-06)
    "teachers_needed_pessimistic",
    "teachers_needed_medium",
    "teachers_needed_optimistic",
]


@router.get("/unit/{version_id}")
def unit_dashboard(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPIs e séries temporais para uma versão de orçamento de uma unidade."""
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        return {"error": "Versão não encontrada"}

    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(CalculatedResult.budget_version_id == version_id)
        .order_by(CalculatedResult.period_date)
        .all()
    )

    # Organiza por código e período
    by_code: dict[str, dict[str, float]] = defaultdict(dict)
    for r, li in results:
        by_code[li.code][r.period_date] = r.value

    # KPI totais (soma de todos os períodos para métricas monetárias)
    kpis = {}
    for code in KPI_CODES:
        kpis[code] = round(sum(by_code.get(code, {}).values()), 2)

    # Para KPIs de taxa/percentual, usar o ÚLTIMO período (não a soma)
    SNAPSHOT_KPI_CODES = {
        "occupancy_rate",
        "break_even_occupancy_pct",
        "contribution_margin_pct",
        "break_even_revenue",
        "break_even_students",
        "active_students",
        "capacity_hours_month",
        "teachers_needed_pessimistic",
        "teachers_needed_medium",
        "teachers_needed_optimistic",
    }
    if all_periods := sorted(set(r.period_date for r, _ in results)):
        last_period = all_periods[-1]
        for code in SNAPSHOT_KPI_CODES:
            if code in by_code and last_period in by_code[code]:
                kpis[code] = by_code[code][last_period]

    # net_margin = Resultado / Receita acumulada (métrica de retorno total)
    kpis["net_margin"] = (
        round(kpis["net_result"] / kpis["revenue_total"], 4)
        if kpis.get("revenue_total", 0) > 0
        else 0.0
    )
    # Aliases e campos derivados esperados pelo frontend
    kpis["gross_revenue"] = kpis.get("revenue_total", 0.0)
    kpis["total_costs"] = round(
        kpis.get("total_fixed_costs", 0.0)
        + kpis.get("total_variable_costs", 0.0)
        + kpis.get("taxes_on_revenue", 0.0),
        2,
    )

    # Série temporal para gráficos
    all_periods = sorted(set(r.period_date for r, _ in results))
    time_series = []
    for period in all_periods:
        entry = {"period": period}
        for code in KPI_CODES:
            entry[code] = by_code.get(code, {}).get(period, 0.0)
        time_series.append(entry)

    unit = db.query(Unit).filter(Unit.id == version.unit_id).first()
    return {
        "version_id": version_id,
        "unit_id": version.unit_id,
        "unit_name": unit.name if unit else None,
        "scenario_id": version.scenario_id,
        "status": version.status,
        "kpis": kpis,
        "time_series": time_series,
    }


@router.get("/business/{business_id}/consolidated")
def business_consolidated_dashboard(
    business_id: str,
    scenario_id: str = Query(...),
    unit_ids: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPIs consolidados de um negócio para um cenário.

    Agrega live a partir de CalculatedResult (melhor versão por unidade:
    published > draft > planning). Se unit_ids fornecido, filtra essas unidades.
    """
    verify_business_access(business_id, current_user, db)
    # Busca unidades do negócio (filtrando por unit_ids se fornecido)
    units_query = db.query(Unit).filter(Unit.business_id == business_id)
    if unit_ids:
        units_query = units_query.filter(Unit.id.in_(unit_ids))
    units_list = units_query.all()

    if not units_list:
        return {
            "business_id": business_id,
            "scenario_id": scenario_id,
            "kpis": {},
            "time_series": [],
        }

    # Melhor versão ativa por unidade (published > draft > planning)
    all_versions = (
        db.query(BudgetVersion)
        .filter(
            BudgetVersion.unit_id.in_([u.id for u in units_list]),
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.is_active.is_(True),
        )
        .all()
    )
    status_priority = {"published": 0, "draft": 1, "planning": 2}
    best_by_unit: dict[str, BudgetVersion] = {}
    for v in all_versions:
        existing = best_by_unit.get(v.unit_id)
        if existing is None or status_priority.get(v.status, 9) < status_priority.get(
            existing.status, 9
        ):
            best_by_unit[v.unit_id] = v

    version_ids = [v.id for v in best_by_unit.values()]
    if not version_ids:
        return {
            "business_id": business_id,
            "scenario_id": scenario_id,
            "kpis": {},
            "time_series": [],
        }

    # Métricas somáveis (excluindo derivadas percentuais)
    SUMMABLE = [
        c
        for c in KPI_CODES
        if c
        not in {
            "occupancy_rate",
            "break_even_occupancy_pct",
            "contribution_margin_pct",
            "net_margin",
        }
    ]

    # Agregação live diretamente de CalculatedResult
    raw_results = (
        db.query(
            CalculatedResult.period_date,
            LineItemDefinition.code,
            CalculatedResult.value,
        )
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(
            CalculatedResult.budget_version_id.in_(version_ids),
            LineItemDefinition.code.in_(SUMMABLE),
        )
        .all()
    )

    # Agrega: soma de todas as unidades por (período, métrica)
    agg: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    all_periods_set: set[str] = set()
    for period_date, code, value in raw_results:
        agg[code][period_date] += value
        all_periods_set.add(period_date)

    # KPIs totais acumulados
    kpis: dict[str, float] = {
        code: round(sum(agg.get(code, {}).values()), 2) for code in SUMMABLE
    }

    # Deriva métricas percentuais (ponderadas pela capacidade agregada)
    total_cap = kpis.get("capacity_hours_month", 0)
    total_act = kpis.get("active_hours_month", 0)
    rev = kpis.get("revenue_total", 0)
    net = kpis.get("net_result", 0)
    vc = kpis.get("total_variable_costs", 0)
    tax = kpis.get("taxes_on_revenue", 0)
    be_rev = kpis.get("break_even_revenue", 0)
    avg_price_per_hour = rev / max(total_act, 1)

    kpis["occupancy_rate"] = round(total_act / total_cap, 4) if total_cap > 0 else 0.0
    kpis["net_margin"] = round(net / rev, 4) if rev > 0 else 0.0
    kpis["contribution_margin_pct"] = (
        round((rev - vc - tax) / rev, 4) if rev > 0 else 0.0
    )
    kpis["break_even_occupancy_pct"] = (
        round(be_rev / (total_cap * avg_price_per_hour), 4)
        if total_cap > 0 and avg_price_per_hour > 0
        else 0.0
    )
    # Aliases e campos derivados esperados pelo frontend
    kpis["gross_revenue"] = kpis.get("revenue_total", 0.0)
    kpis["total_costs"] = round(
        kpis.get("total_fixed_costs", 0.0)
        + kpis.get("total_variable_costs", 0.0)
        + kpis.get("taxes_on_revenue", 0.0),
        2,
    )

    # Série temporal — deriva percentuais por período
    all_periods = sorted(all_periods_set)
    time_series = []
    for p in all_periods:
        entry: dict[str, object] = {"period": p}
        for code in SUMMABLE:
            entry[code] = agg.get(code, {}).get(p, 0.0)
        p_cap = float(entry.get("capacity_hours_month", 0.0))  # type: ignore[arg-type]
        p_act = float(entry.get("active_hours_month", 0.0))  # type: ignore[arg-type]
        p_rev = float(entry.get("revenue_total", 0.0))  # type: ignore[arg-type]
        p_net = float(entry.get("net_result", 0.0))  # type: ignore[arg-type]
        p_vc = float(entry.get("total_variable_costs", 0.0))  # type: ignore[arg-type]
        p_tax = float(entry.get("taxes_on_revenue", 0.0))  # type: ignore[arg-type]
        p_act_h = float(entry.get("active_hours_month", 0.0))  # type: ignore[arg-type]
        p_be_rev = float(entry.get("break_even_revenue", 0.0))  # type: ignore[arg-type]
        p_avg_price = p_rev / max(p_act_h, 1)
        entry["occupancy_rate"] = round(p_act / p_cap, 4) if p_cap > 0 else 0.0
        entry["net_margin"] = round(p_net / p_rev, 4) if p_rev > 0 else 0.0
        entry["contribution_margin_pct"] = (
            round((p_rev - p_vc - p_tax) / p_rev, 4) if p_rev > 0 else 0.0
        )
        entry["break_even_occupancy_pct"] = (
            round(p_be_rev / (p_cap * p_avg_price), 4)
            if p_cap > 0 and p_avg_price > 0
            else 0.0
        )
        time_series.append(entry)

    return {
        "business_id": business_id,
        "scenario_id": scenario_id,
        "unit_ids": [u.id for u in units_list],
        "kpis": kpis,
        "time_series": time_series,
        "annual_summaries": _build_annual_from_time_series(time_series, SUMMABLE),
    }


@router.get("/business/{business_id}/units-comparison")
def units_comparison(
    business_id: str,
    scenario_id: str = Query(...),
    metric: str = Query(default="net_result"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Comparação de uma métrica entre todas as unidades de um negócio."""
    verify_business_access(business_id, current_user, db)
    units = db.query(Unit).filter(Unit.business_id == business_id).all()
    unit_map = {u.id: u.name for u in units}

    # Busca melhor versão por unidade (publicada > rascunho > planejamento)
    all_active_versions = (
        db.query(BudgetVersion)
        .join(Unit, BudgetVersion.unit_id == Unit.id)
        .filter(
            Unit.business_id == business_id,
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.is_active == True,
        )
        .all()
    )
    status_priority = {"published": 0, "draft": 1, "planning": 2}
    best_by_unit: dict[str, BudgetVersion] = {}
    for v in all_active_versions:
        existing = best_by_unit.get(v.unit_id)
        if existing is None or status_priority.get(v.status, 9) < status_priority.get(
            existing.status, 9
        ):
            best_by_unit[v.unit_id] = v
    versions = list(best_by_unit.values())

    chart_data = []
    for version in versions:
        results = (
            db.query(CalculatedResult, LineItemDefinition)
            .join(
                LineItemDefinition,
                CalculatedResult.line_item_id == LineItemDefinition.id,
            )
            .filter(
                CalculatedResult.budget_version_id == version.id,
                LineItemDefinition.code == metric,
            )
            .order_by(CalculatedResult.period_date)
            .all()
        )
        series = {r.period_date: r.value for r, _ in results}
        chart_data.append(
            {
                "unit_id": version.unit_id,
                "unit_name": unit_map.get(version.unit_id, "Unidade"),
                "total": round(sum(series.values()), 2),
                "series": series,
            }
        )

    chart_data.sort(key=lambda x: x["total"], reverse=True)
    return {"business_id": business_id, "metric": metric, "units": chart_data}


# ──────────────────────────────────────────────────────────────────────────────
# Helper — agrega série mensal por ano
# ──────────────────────────────────────────────────────────────────────────────


def _build_annual_from_time_series(time_series: list, summable_codes: list) -> list:
    """Agrega série mensal por ano para uso nos endpoints consolidated e annual."""
    annual_agg: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    annual_counts: dict[str, int] = defaultdict(int)
    PCT_CODES = {
        "occupancy_rate",
        "break_even_occupancy_pct",
        "contribution_margin_pct",
        "net_margin",
    }

    for entry in time_series:
        year = str(entry.get("period", ""))[:4]
        if not year:
            continue
        annual_counts[year] += 1
        for code in summable_codes:
            val = entry.get(code, 0.0)
            if code in PCT_CODES:
                # acumula para tirar média depois
                annual_agg[year][code] += float(val)
            else:
                annual_agg[year][code] += float(val)

    result = []
    for year in sorted(annual_agg.keys()):
        data = annual_agg[year]
        months = annual_counts[year]
        row: dict = {"year": year, "months": months}
        rev = data.get("revenue_total", 0.0)
        net = data.get("net_result", 0.0)
        for code in summable_codes:
            val = data.get(code, 0.0)
            if code in PCT_CODES:
                row[code] = round(val / months, 4) if months > 0 else 0.0
            else:
                row[code] = round(val, 2)
        row["net_margin"] = round(net / rev, 4) if rev > 0 else 0.0
        result.append(row)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# GAP-09: Novos Endpoints de Dashboard
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/unit/{version_id}/dre")
def unit_dre(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DRE completo linha a linha, mês a mês para uma versão de orçamento."""
    DRE_CODES = [
        "revenue_total",
        "membership_revenue",
        "personal_training_revenue",
        "other_revenue",
        "total_fixed_costs",
        "rent_total",
        "staff_costs",
        "fc_pro_labore",
        "fc_clt_base",
        "fc_social_charges",
        "utility_costs",
        "fc_electricity",
        "fc_water",
        "fc_internet",
        "admin_costs",
        "marketing_costs",
        "equipment_costs",
        "insurance_costs",
        "other_fixed_costs",
        "total_variable_costs",
        "hygiene_kit_cost",
        "sales_commission_cost",
        "card_fee_cost",
        "taxes_on_revenue",
        "financing_payment",
        "operating_result",
        "net_result",
        "ebitda",
    ]
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        return {"error": "Versão não encontrada"}

    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(
            CalculatedResult.budget_version_id == version_id,
            LineItemDefinition.code.in_(DRE_CODES),
        )
        .order_by(CalculatedResult.period_date, LineItemDefinition.display_order)
        .all()
    )

    by_period: dict[str, list] = defaultdict(list)
    for r, li in results:
        by_period[r.period_date].append(
            {
                "code": li.code,
                "name": li.name,
                "category": li.category,
                "display_order": li.display_order,
                "value": r.value,
            }
        )

    dre_periods = []
    for period in sorted(by_period.keys()):
        items = sorted(by_period[period], key=lambda x: x["display_order"])
        rev = next((i["value"] for i in items if i["code"] == "revenue_total"), 0.0)
        denom = rev if rev != 0.0 else 1.0
        for item in items:
            item["pct_of_revenue"] = round(item["value"] / denom, 4)
        dre_periods.append({"period": period, "items": items})

    return {"version_id": version_id, "dre": dre_periods}


@router.get("/unit/{version_id}/audit")
def unit_audit_trace(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trilha de cálculo auditavel por período (persisted no net_result)."""
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        return {"error": "Versão não encontrada"}

    # Verifica que a versão pertence a um negócio acessível ao usuário
    unit = db.query(Unit).filter(Unit.id == version.unit_id).first()
    if unit:
        verify_business_access(unit.business_id, current_user, db)

    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(
            CalculatedResult.budget_version_id == version_id,
            LineItemDefinition.code == "net_result",
        )
        .order_by(CalculatedResult.period_date)
        .all()
    )
    traces = [
        {"period": r.period_date, "trace": r.calculation_trace}
        for r, _ in results
        if r.calculation_trace
    ]
    return {"version_id": version_id, "traces": traces}


@router.get("/business/{business_id}/annual")
def business_annual_summary(
    business_id: str,
    scenario_id: str = Query(...),
    unit_ids: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumo anual consolidado por ano (agrega time_series mensal)."""
    verify_business_access(business_id, current_user, db)
    units_query = db.query(Unit).filter(Unit.business_id == business_id)
    if unit_ids:
        units_query = units_query.filter(Unit.id.in_(unit_ids))
    units_list = units_query.all()
    if not units_list:
        return {"business_id": business_id, "scenario_id": scenario_id, "annual": []}

    all_versions = (
        db.query(BudgetVersion)
        .filter(
            BudgetVersion.unit_id.in_([u.id for u in units_list]),
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.is_active.is_(True),
        )
        .all()
    )
    status_priority = {"published": 0, "draft": 1, "planning": 2}
    best_by_unit: dict[str, BudgetVersion] = {}
    for v in all_versions:
        existing = best_by_unit.get(v.unit_id)
        if existing is None or status_priority.get(v.status, 9) < status_priority.get(
            existing.status, 9
        ):
            best_by_unit[v.unit_id] = v

    version_ids = [v.id for v in best_by_unit.values()]
    if not version_ids:
        return {"business_id": business_id, "scenario_id": scenario_id, "annual": []}

    ANNUAL_CODES = [
        "revenue_total",
        "total_fixed_costs",
        "total_variable_costs",
        "taxes_on_revenue",
        "financing_payment",
        "operating_result",
        "net_result",
        "ebitda",
        "active_hours_month",
        "capacity_hours_month",
    ]
    raw = (
        db.query(
            CalculatedResult.period_date,
            LineItemDefinition.code,
            CalculatedResult.value,
        )
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(
            CalculatedResult.budget_version_id.in_(version_ids),
            LineItemDefinition.code.in_(ANNUAL_CODES),
        )
        .all()
    )

    agg: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for period_date, code, value in raw:
        agg[code][period_date] += value

    # Constrói time_series mensal temporário e reutiliza helper
    all_periods_set = set()
    for code_vals in agg.values():
        all_periods_set.update(code_vals.keys())

    ts = []
    for p in sorted(all_periods_set):
        entry: dict = {"period": p}
        for code in ANNUAL_CODES:
            entry[code] = agg.get(code, {}).get(p, 0.0)
        ts.append(entry)

    annual = _build_annual_from_time_series(ts, ANNUAL_CODES)
    return {"business_id": business_id, "scenario_id": scenario_id, "annual": annual}


@router.get("/business/{business_id}/portfolio")
def business_portfolio(
    business_id: str,
    scenario_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ROI e custo de capital por unidade (tabela Portfolio da planilha)."""
    verify_business_access(business_id, current_user, db)
    units = db.query(Unit).filter(Unit.business_id == business_id).all()
    if not units:
        return {"business_id": business_id, "scenario_id": scenario_id, "units": []}

    unit_map = {u.id: u.name for u in units}

    all_versions = (
        db.query(BudgetVersion)
        .filter(
            BudgetVersion.unit_id.in_([u.id for u in units]),
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.is_active.is_(True),
        )
        .all()
    )
    status_priority = {"published": 0, "draft": 1, "planning": 2}
    best_by_unit: dict[str, BudgetVersion] = {}
    for v in all_versions:
        existing = best_by_unit.get(v.unit_id)
        if existing is None or status_priority.get(v.status, 9) < status_priority.get(
            existing.status, 9
        ):
            best_by_unit[v.unit_id] = v

    PORTFOLIO_CODES = ["net_result", "financing_payment", "operating_result"]
    unit_results = []
    total_net = 0.0
    total_capex = 0.0

    for unit_id, version in best_by_unit.items():
        raw = (
            db.query(
                CalculatedResult.period_date,
                LineItemDefinition.code,
                CalculatedResult.value,
            )
            .join(
                LineItemDefinition,
                CalculatedResult.line_item_id == LineItemDefinition.id,
            )
            .filter(
                CalculatedResult.budget_version_id == version.id,
                LineItemDefinition.code.in_(PORTFOLIO_CODES),
            )
            .all()
        )
        by_code: dict[str, dict[str, float]] = defaultdict(dict)
        for period_date, code, value in raw:
            by_code[code][period_date] = value

        net_by_period = by_code.get("net_result", {})
        total_net_unit = sum(net_by_period.values())
        capex = version.total_capex if hasattr(version, "total_capex") else 0.0

        # Payback: mês em que o net acumulado >= capex
        payback_months = None
        cumulative = 0.0
        for i, period in enumerate(sorted(net_by_period.keys()), 1):
            cumulative += net_by_period[period]
            if cumulative >= capex and capex > 0:
                payback_months = i
                break

        roi = round(total_net_unit / capex, 4) if capex > 0 else None
        total_net += total_net_unit
        total_capex += capex

        unit_results.append(
            {
                "unit_id": unit_id,
                "unit_name": unit_map.get(unit_id, "Unidade"),
                "version_id": version.id,
                "capex": round(capex, 2),
                "net_result": round(total_net_unit, 2),
                "payback_months": payback_months,
                "roi_pct": roi,
            }
        )

    unit_results.sort(key=lambda x: x.get("net_result", 0), reverse=True)

    total_roi = round(total_net / total_capex, 4) if total_capex > 0 else None
    return {
        "business_id": business_id,
        "scenario_id": scenario_id,
        "total_capex": round(total_capex, 2),
        "total_net_result": round(total_net, 2),
        "roi_pct": total_roi,
        "units": unit_results,
    }


@router.get("/unit/{version_id}/split")
def unit_revenue_split(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Split de receita bruta entre plataforma Atlas e franqueado PT.

    Calcula por período:
      franchisee_revenue  = gross_revenue × (1 - platform_fee_pct)
      platform_revenue    = gross_revenue × platform_fee_pct
      referral_commission = franchisee_revenue × referral_commission_pct
    """
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        return {"error": "Versão não encontrada"}

    unit = db.query(Unit).filter(Unit.id == version.unit_id).first()

    # Busca config de fee do negócio; usa defaults se não configurado
    fee_config = (
        db.query(FranchiseFeeConfig)
        .filter(FranchiseFeeConfig.business_id == unit.business_id)
        .first()
        if unit
        else None
    )
    platform_fee_pct = fee_config.platform_fee_pct if fee_config else 0.10
    referral_commission_pct = fee_config.referral_commission_pct if fee_config else 0.02

    # Busca receita bruta período a período
    revenue_rows = (
        db.query(CalculatedResult.period_date, CalculatedResult.value)
        .join(
            LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id
        )
        .filter(
            CalculatedResult.budget_version_id == version_id,
            LineItemDefinition.code == "revenue_total",
        )
        .order_by(CalculatedResult.period_date)
        .all()
    )

    periods = []
    total_gross = 0.0
    total_franchisee = 0.0
    total_platform = 0.0
    total_referral = 0.0

    for period_date, gross_revenue in revenue_rows:
        franchisee = round(gross_revenue * (1 - platform_fee_pct), 2)
        platform = round(gross_revenue * platform_fee_pct, 2)
        referral = round(franchisee * referral_commission_pct, 2)
        period_str = (
            period_date
            if isinstance(period_date, str)
            else period_date.strftime("%Y-%m")
        )
        periods.append(
            {
                "period": period_str,
                "gross_revenue": round(gross_revenue, 2),
                "franchisee_revenue": franchisee,
                "platform_revenue": platform,
                "referral_commission": referral,
            }
        )
        total_gross += gross_revenue
        total_franchisee += franchisee
        total_platform += platform
        total_referral += referral

    return {
        "version_id": version_id,
        "business_id": unit.business_id if unit else None,
        "platform_fee_pct": platform_fee_pct,
        "referral_commission_pct": referral_commission_pct,
        "periods": periods,
        "totals": {
            "period": "TOTAL",
            "gross_revenue": round(total_gross, 2),
            "franchisee_revenue": round(total_franchisee, 2),
            "platform_revenue": round(total_platform, 2),
            "referral_commission": round(total_referral, 2),
        },
    }
