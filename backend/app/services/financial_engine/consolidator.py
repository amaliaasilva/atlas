"""
Atlas Finance — Consolidator
Agrega os resultados de todas as unidades de um negócio em um consolidado.
"""

from __future__ import annotations
from collections import defaultdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


CONSOLIDATED_METRICS = [
    "revenue_total",
    "total_fixed_costs",
    "total_variable_costs",
    "taxes_on_revenue",
    "financing_payment",
    "operating_result",
    "net_result",
    "ebitda",
    # KPIs B2B Coworking — somáveis por período
    "capacity_hours_month",
    "active_hours_month",
    "break_even_revenue",
    "break_even_students",
    "active_students",
]

# Métricas que NÃO devem ser somadas no consolidado;
# são derivadas pelo dashboard a partir dos somáveis acima.
DERIVED_METRICS = {"occupancy_rate", "break_even_occupancy_pct", "contribution_margin_pct", "net_margin"}


def consolidate_business(
    business_id: str,
    scenario_id: str,
    db: "Session",
) -> list[dict]:
    """
    Lê os CalculatedResult de todas as unidades de um negócio para um cenário
    e gera um ConsolidatedResult por período e métrica.
    Returns: list of dict representando as linhas consolidadas geradas.
    """
    from app.models.calculated_result import CalculatedResult
    from app.models.budget_version import BudgetVersion
    from app.models.unit import Unit
    from app.models.line_item import LineItemDefinition
    from app.models.consolidated_result import ConsolidatedResult

    # Busca versões publicadas de todas as unidades deste negócio/cenário
    versions = (
        db.query(BudgetVersion)
        .join(Unit, BudgetVersion.unit_id == Unit.id)
        .filter(
            Unit.business_id == business_id,
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.status == "published",
            BudgetVersion.is_active.is_(True),  # noqa: E712
        )
        .all()
    )

    version_ids = [v.id for v in versions]
    if not version_ids:
        return []

    # Busca resultados
    results = (
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
            LineItemDefinition.code.in_(CONSOLIDATED_METRICS),
        )
        .all()
    )

    # Agrega por período e métrica
    agg: dict[tuple, float] = defaultdict(float)
    for period_date, code, value in results:
        agg[(period_date, code)] += value

    # Apaga consolidado anterior
    db.query(ConsolidatedResult).filter(
        ConsolidatedResult.business_id == business_id,
        ConsolidatedResult.scenario_id == scenario_id,
    ).delete()

    # Persiste novo consolidado
    rows = []
    for (period_date, metric_code), value in agg.items():
        row = ConsolidatedResult(
            business_id=business_id,
            scenario_id=scenario_id,
            period_date=period_date,
            metric_code=metric_code,
            value=round(value, 2),
        )
        db.add(row)
        rows.append(
            {
                "period_date": period_date,
                "metric_code": metric_code,
                "value": round(value, 2),
            }
        )

    db.commit()
    return rows
