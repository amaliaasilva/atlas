"""
Atlas Finance — Dashboard Endpoint
KPIs executivos por unidade e consolidados.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from collections import defaultdict

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.calculated_result import CalculatedResult
from app.models.consolidated_result import ConsolidatedResult
from app.models.line_item import LineItemDefinition
from app.models.budget_version import BudgetVersion
from app.models.unit import Unit

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
    "break_even_revenue",
    "break_even_occupancy_pct",
    "contribution_margin_pct",
    "net_margin",
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
        "occupancy_rate", "break_even_occupancy_pct", "contribution_margin_pct",
        "break_even_revenue", "break_even_students", "capacity_hours_month",
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPIs consolidados de um negócio para um cenário."""
    rows = (
        db.query(ConsolidatedResult)
        .filter(
            ConsolidatedResult.business_id == business_id,
            ConsolidatedResult.scenario_id == scenario_id,
        )
        .order_by(ConsolidatedResult.period_date)
        .all()
    )

    by_code: dict[str, dict[str, float]] = defaultdict(dict)
    for row in rows:
        by_code[row.metric_code][row.period_date] = row.value

    kpis = {code: round(sum(by_code.get(code, {}).values()), 2) for code in KPI_CODES}

    SNAPSHOT_KPI_CODES = {
        "occupancy_rate", "break_even_occupancy_pct", "contribution_margin_pct",
        "break_even_revenue", "break_even_students", "capacity_hours_month",
    }
    all_periods_cons = sorted(set(row.period_date for row in rows))
    if all_periods_cons:
        last_p = all_periods_cons[-1]
        for code in SNAPSHOT_KPI_CODES:
            if code in by_code and last_p in by_code[code]:
                kpis[code] = by_code[code][last_p]

    if kpis.get("revenue_total", 0) > 0:
        kpis["net_margin"] = round(kpis["net_result"] / kpis["revenue_total"], 4)

    all_periods = all_periods_cons
    time_series = [
        {"period": p, **{code: by_code.get(code, {}).get(p, 0.0) for code in KPI_CODES}}
        for p in all_periods
    ]

    return {
        "business_id": business_id,
        "scenario_id": scenario_id,
        "kpis": kpis,
        "time_series": time_series,
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
        if existing is None or status_priority.get(v.status, 9) < status_priority.get(existing.status, 9):
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
