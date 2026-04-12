import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.audit_log import AuditAction, AuditLog
from app.models.user import User
from app.models.service_plan import ServicePlan
from app.models.assumption import (
    AssumptionCategory,
    AssumptionDefinition,
    AssumptionValue,
)
from app.schemas.assumption import (
    AssumptionCategoryCreate,
    AssumptionCategoryOut,
    AssumptionDefinitionCreate,
    AssumptionDefinitionOut,
    AssumptionDefinitionUpdate,
    AssumptionValueCreate,
    AssumptionValueUpdate,
    AssumptionValueOut,
    AssumptionValueBulkUpdate,
    AssumptionValueFrontend,
    BulkUpsertItem,
)

router = APIRouter()

LEGACY_HIDDEN_DEFINITION_CODES = (
    "alunos_capacidade_maxima",
    "preco_medio_hora",
    "ticket_medio_plano_trimestral",
    "ticket_medio_plano_anual",
    "mix_plano_mensal_pct",
    "mix_plano_trimestral_pct",
    "mix_plano_anual_pct",
    "beneficios_por_funcionario",
    "num_funcionarios",
    "num_personal_trainers",
    "receita_media_personal_mes",
    "kwh_consumo_mensal",
    "tarifa_kwh",
    "consumo_agua_m3_mensal",
    "tarifa_agua_m3",
    "consumo_energia_kwh_mensal",
    "tarifa_energia_kwh",
)


def _normalize_source_type(raw_source_type: str | None) -> str:
    """Normaliza source_type legado para valores válidos do enum do banco."""
    value = (raw_source_type or "manual").strip().lower()
    if value == "calculated":
        return "derived"
    if value in {"manual", "imported", "derived"}:
        return value
    return "manual"


def _upsert_assumption_rows(
    version_id: str,
    items: list,
    db: Session,
    current_user_id: str,
) -> int:
    updated = 0
    for item in items:
        period_date = getattr(item, "period_date", None)
        source_type = _normalize_source_type(getattr(item, "source_type", None))
        existing = (
            db.query(AssumptionValue)
            .filter(
                AssumptionValue.budget_version_id == version_id,
                AssumptionValue.assumption_definition_id
                == item.assumption_definition_id,
                AssumptionValue.period_date == period_date,
            )
            .first()
        )

        if existing:
            existing.value_numeric = getattr(item, "numeric_value", None)
            existing.value_text = getattr(item, "text_value", None)
            existing.value_boolean = getattr(item, "value_boolean", None)
            existing.source_type = source_type
            existing.updated_by = current_user_id
        else:
            db.add(
                AssumptionValue(
                    budget_version_id=version_id,
                    assumption_definition_id=item.assumption_definition_id,
                    period_date=period_date,
                    value_numeric=getattr(item, "numeric_value", None),
                    value_text=getattr(item, "text_value", None),
                    value_boolean=getattr(item, "value_boolean", None),
                    source_type=source_type,
                    updated_by=current_user_id,
                )
            )
        updated += 1
    return updated


# ── Categories ────────────────────────────────────────────────────────────────


@router.get("/categories", response_model=list[AssumptionCategoryOut])
def list_categories(
    business_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AssumptionCategory).order_by(AssumptionCategory.sort_order)
    if business_id:
        q = q.filter(AssumptionCategory.business_id == business_id)
    return q.all()


@router.post("/categories", response_model=AssumptionCategoryOut, status_code=201)
def create_category(
    data: AssumptionCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = AssumptionCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ── Definitions ───────────────────────────────────────────────────────────────


@router.get("/definitions", response_model=list[AssumptionDefinitionOut])
def list_definitions(
    business_id: str | None = Query(None),
    category_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(AssumptionDefinition)
        .filter(AssumptionDefinition.is_active == True)
        .filter(~AssumptionDefinition.code.in_(LEGACY_HIDDEN_DEFINITION_CODES))
        .order_by(AssumptionDefinition.sort_order)
    )
    if business_id:
        q = q.filter(AssumptionDefinition.business_id == business_id)
    if category_id:
        q = q.filter(AssumptionDefinition.category_id == category_id)
    return q.all()


@router.post("/definitions", response_model=AssumptionDefinitionOut, status_code=201)
def create_definition(
    data: AssumptionDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defn = AssumptionDefinition(**data.model_dump())
    db.add(defn)
    db.commit()
    db.refresh(defn)
    return defn


@router.patch("/definitions/{definition_id}", response_model=AssumptionDefinitionOut)
def update_definition(
    definition_id: str,
    data: AssumptionDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defn = (
        db.query(AssumptionDefinition)
        .filter(AssumptionDefinition.id == definition_id)
        .first()
    )
    if not defn:
        raise HTTPException(status_code=404, detail="Definição não encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(defn, key, value)

    db.commit()
    db.refresh(defn)
    return defn


@router.delete("/definitions/{definition_id}", status_code=204)
def delete_definition(
    definition_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defn = (
        db.query(AssumptionDefinition)
        .filter(AssumptionDefinition.id == definition_id)
        .first()
    )
    if not defn or not defn.is_active:
        raise HTTPException(status_code=404, detail="Definição não encontrada")

    related_version = (
        db.query(AssumptionValue.budget_version_id)
        .filter(AssumptionValue.assumption_definition_id == definition_id)
        .first()
    )
    deleted_values = (
        db.query(AssumptionValue)
        .filter(AssumptionValue.assumption_definition_id == definition_id)
        .delete(synchronize_session=False)
    )
    defn.is_active = False

    audit = AuditLog(
        entity_type="assumption_definition",
        entity_id=definition_id,
        action=AuditAction.delete,
        old_value={
            "name": defn.name,
            "code": defn.code,
            "category_id": defn.category_id,
        },
        new_value={"deleted_values": deleted_values, "is_active": False},
        performed_by=current_user.id,
        budget_version_id=related_version[0] if related_version else None,
        notes=f"Premissa '{defn.name}' excluída",
    )
    db.add(audit)
    db.commit()


# ── Values (rotas antigas — compatibilidade) ──────────────────────────────────


@router.get("/values", response_model=list[AssumptionValueOut])
def list_values(
    budget_version_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AssumptionValue)
        .filter(AssumptionValue.budget_version_id == budget_version_id)
        .all()
    )


@router.post("/values", response_model=AssumptionValueOut, status_code=201)
def create_value(
    data: AssumptionValueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    val = AssumptionValue(**data.model_dump(), updated_by=current_user.id)
    db.add(val)
    db.commit()
    db.refresh(val)
    return val


@router.put("/values/bulk", response_model=dict)
def bulk_upsert_values(
    data: AssumptionValueBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.values:
        return {"updated": 0}
    version_id = data.values[0].budget_version_id
    updated = _upsert_assumption_rows(version_id, data.values, db, current_user.id)
    db.commit()
    return {"updated": updated}


# ── Values (rotas do frontend) ────────────────────────────────────────────────


@router.get("/values/{version_id}", response_model=list[AssumptionValueFrontend])
def get_version_values(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os valores de premissas de uma versão no formato esperado pelo frontend."""
    values = (
        db.query(AssumptionValue)
        .options(joinedload(AssumptionValue.definition))
        .filter(AssumptionValue.budget_version_id == version_id)
        .all()
    )
    payload = [
        AssumptionValueFrontend(
            id=v.id,
            assumption_definition_id=v.assumption_definition_id,
            code=v.definition.code if v.definition else "",
            period_date=v.period_date,
            numeric_value=v.value_numeric,
            text_value=v.value_text,
            source_type=v.source_type,
        )
        for v in values
        if (v.definition.code if v.definition else "") not in LEGACY_HIDDEN_DEFINITION_CODES
    ]

    business_id = next(
        (
            v.definition.business_id
            for v in values
            if v.definition and getattr(v.definition, "business_id", None)
        ),
        None,
    )
    weighted_monthly_ticket = None
    if business_id:
        active_plans = (
            db.query(ServicePlan)
            .filter(
                ServicePlan.business_id == business_id,
                ServicePlan.is_active == True,
            )
            .order_by(ServicePlan.sort_order)
            .all()
        )
        total_mix = sum((plan.target_mix_pct or 0.0) for plan in active_plans)
        if total_mix > 0:
            weighted_monthly_ticket = round(
                sum(plan.price_per_hour * (plan.target_mix_pct or 0.0) for plan in active_plans)
                / total_mix,
                2,
            )
            ticket_definition_id = next(
                (
                    item.assumption_definition_id
                    for item in payload
                    if item.code == "ticket_medio_plano_mensal"
                ),
                None,
            )
            payload = [
                item
                for item in payload
                if item.code != "ticket_medio_plano_mensal"
            ]
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-settings-ticket-{version_id}",
                    assumption_definition_id=ticket_definition_id
                    or "ticket_medio_plano_mensal",
                    code="ticket_medio_plano_mensal",
                    period_date=None,
                    numeric_value=weighted_monthly_ticket,
                    text_value=None,
                    source_type="derived",
                )
            )

    cap_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "capacidade_maxima_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    estimated_capacity_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "capacidade_estimada_aulas_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    energy_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "custo_energia_calculado_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    water_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "custo_agua_calculado_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    card_fee_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "custo_taxa_cartao_calculado_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    taxes_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "impostos_calculados_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    revenue_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "receita_total_calculada_mes",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    utilities_occupancy_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "taxa_ocupacao_referencia_utilidades",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    clt_base_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "folha_clt_base_calculada",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    clt_charges_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "encargos_clt_calculados",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )
    clt_total_definition = (
        db.query(AssumptionDefinition)
        .filter(
            AssumptionDefinition.code == "folha_clt_total_calculada",
            AssumptionDefinition.is_active == True,
        )
        .order_by(AssumptionDefinition.updated_at.desc())
        .first()
    )

    definition_defaults: dict[str, float] = {}
    salary_codes: list[str] = []
    if business_id:
        active_definitions = (
            db.query(AssumptionDefinition)
            .filter(
                AssumptionDefinition.business_id == business_id,
                AssumptionDefinition.is_active == True,
            )
            .all()
        )
        for definition in active_definitions:
            if definition.default_value is not None:
                try:
                    definition_defaults[definition.code] = float(definition.default_value)
                except (TypeError, ValueError):
                    pass
        salary_codes = sorted(
            definition.code
            for definition in active_definitions
            if definition.code.startswith("salario_")
        )

    defaults = {
        "slots_por_hora": 10.0,
        "horas_dia_util": 17.0,
        "horas_dia_sabado": 7.0,
        "dias_uteis_mes": 22.0,
        "sabados_mes": 4.0,
        "ticket_medio_plano_mensal": weighted_monthly_ticket or 57.5,
        "outras_receitas": 0.0,
        "custo_energia_fixo": 4200.0,
        "custo_energia_variavel_max": 3000.0,
        "automacao_reducao_pct": 0.20,
        "custo_agua_fixo": 300.0,
        "custo_agua_variavel_max": 1300.0,
        "taxa_cartao_pct": 0.035,
        "aliquota_imposto_receita": 0.06,
    }
    existing_capacity_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "capacidade_maxima_mes"
    }
    existing_estimated_capacity_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "capacidade_estimada_aulas_mes"
    }
    existing_energy_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "custo_energia_calculado_mes"
    }
    existing_water_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "custo_agua_calculado_mes"
    }
    existing_card_fee_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "custo_taxa_cartao_calculado_mes"
    }
    existing_taxes_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "impostos_calculados_mes"
    }
    existing_revenue_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "receita_total_calculada_mes"
    }
    existing_utilities_occupancy_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "taxa_ocupacao_referencia_utilidades"
    }
    existing_clt_base_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "folha_clt_base_calculada"
    }
    existing_clt_charges_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "encargos_clt_calculados"
    }
    existing_clt_total_periods = {
        item.period_date or "static"
        for item in payload
        if item.code == "folha_clt_total_calculada"
    }
    periods = sorted({item.period_date for item in payload if item.period_date}) or [None]
    default_tax_curve_values = [0.06, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633]
    tax_has_period_overrides = any(
        item.code == "aliquota_imposto_receita" and item.period_date is not None
        for item in payload
    )

    def lookup_numeric(code: str, period: str | None) -> float:
        for item in payload:
            if (
                item.code == code
                and item.period_date == period
                and item.numeric_value is not None
            ):
                return float(item.numeric_value)
        if (
            code == "aliquota_imposto_receita"
            and period is not None
            and not tax_has_period_overrides
        ):
            year_idx = periods.index(period) // 12 if period in periods else 0
            return default_tax_curve_values[
                min(year_idx, len(default_tax_curve_values) - 1)
            ]
        for item in payload:
            if (
                item.code == code
                and item.period_date is None
                and item.numeric_value is not None
            ):
                return float(item.numeric_value)
        if code in definition_defaults:
            return definition_defaults[code]
        return defaults.get(code, 0.0)

    for period in periods:
        period_key = period or "static"

        slots_per_hour = lookup_numeric("slots_por_hora", period)
        weekday_hours = lookup_numeric("horas_dia_util", period)
        saturday_hours = lookup_numeric("horas_dia_sabado", period)
        working_days = lookup_numeric("dias_uteis_mes", period)
        saturdays = lookup_numeric("sabados_mes", period)
        occupancy_rate = max(0.0, min(1.0, lookup_numeric("taxa_ocupacao", period)))
        capacity = round(
            (working_days * weekday_hours + saturdays * saturday_hours)
            * slots_per_hour,
            2,
        )
        estimated_capacity = round(capacity * occupancy_rate, 2)
        derived_revenue_total = round(
            estimated_capacity * lookup_numeric("ticket_medio_plano_mensal", period)
            + lookup_numeric("outras_receitas", period),
            2,
        )
        automation_factor = max(
            0.0, 1.0 - lookup_numeric("automacao_reducao_pct", period)
        )
        derived_energy_total = round(
            (
                lookup_numeric("custo_energia_fixo", period)
                + lookup_numeric("custo_energia_variavel_max", period)
                * occupancy_rate
            )
            * automation_factor,
            2,
        )
        derived_water_total = round(
            lookup_numeric("custo_agua_fixo", period)
            + lookup_numeric("custo_agua_variavel_max", period) * occupancy_rate,
            2,
        )
        derived_card_fee_total = round(
            derived_revenue_total * lookup_numeric("taxa_cartao_pct", period),
            2,
        )
        derived_taxes_total = round(
            derived_revenue_total * lookup_numeric("aliquota_imposto_receita", period),
            2,
        )
        derived_clt_base = round(
            sum(lookup_numeric(code, period) for code in salary_codes),
            2,
        )
        derived_clt_charges = round(
            derived_clt_base * lookup_numeric("encargos_folha_pct", period),
            2,
        )
        derived_clt_total = round(derived_clt_base + derived_clt_charges, 2)

        if cap_definition and period_key not in existing_capacity_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-capacity-{version_id}-{period_key}",
                    assumption_definition_id=cap_definition.id,
                    code="capacidade_maxima_mes",
                    period_date=period,
                    numeric_value=capacity,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_estimated_capacity_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-estimated-capacity-{version_id}-{period_key}",
                    assumption_definition_id=(
                        estimated_capacity_definition.id
                        if estimated_capacity_definition
                        else f"derived-estimated-capacity-{period_key}"
                    ),
                    code="capacidade_estimada_aulas_mes",
                    period_date=period,
                    numeric_value=estimated_capacity,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_energy_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-energy-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        energy_total_definition.id
                        if energy_total_definition
                        else f"derived-energy-total-{period_key}"
                    ),
                    code="custo_energia_calculado_mes",
                    period_date=period,
                    numeric_value=derived_energy_total,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_water_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-water-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        water_total_definition.id
                        if water_total_definition
                        else f"derived-water-total-{period_key}"
                    ),
                    code="custo_agua_calculado_mes",
                    period_date=period,
                    numeric_value=derived_water_total,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_card_fee_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-card-fee-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        card_fee_total_definition.id
                        if card_fee_total_definition
                        else f"derived-card-fee-total-{period_key}"
                    ),
                    code="custo_taxa_cartao_calculado_mes",
                    period_date=period,
                    numeric_value=derived_card_fee_total,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_taxes_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-taxes-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        taxes_total_definition.id
                        if taxes_total_definition
                        else f"derived-taxes-total-{period_key}"
                    ),
                    code="impostos_calculados_mes",
                    period_date=period,
                    numeric_value=derived_taxes_total,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_revenue_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-revenue-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        revenue_total_definition.id
                        if revenue_total_definition
                        else f"derived-revenue-total-{period_key}"
                    ),
                    code="receita_total_calculada_mes",
                    period_date=period,
                    numeric_value=derived_revenue_total,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_utilities_occupancy_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-utilities-occupancy-{version_id}-{period_key}",
                    assumption_definition_id=(
                        utilities_occupancy_definition.id
                        if utilities_occupancy_definition
                        else f"derived-utilities-occupancy-{period_key}"
                    ),
                    code="taxa_ocupacao_referencia_utilidades",
                    period_date=period,
                    numeric_value=occupancy_rate,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_clt_base_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-clt-base-{version_id}-{period_key}",
                    assumption_definition_id=(
                        clt_base_definition.id
                        if clt_base_definition
                        else f"derived-clt-base-{period_key}"
                    ),
                    code="folha_clt_base_calculada",
                    period_date=period,
                    numeric_value=derived_clt_base,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_clt_charges_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-clt-charges-{version_id}-{period_key}",
                    assumption_definition_id=(
                        clt_charges_definition.id
                        if clt_charges_definition
                        else f"derived-clt-charges-{period_key}"
                    ),
                    code="encargos_clt_calculados",
                    period_date=period,
                    numeric_value=derived_clt_charges,
                    text_value=None,
                    source_type="derived",
                )
            )

        if period_key not in existing_clt_total_periods:
            payload.append(
                AssumptionValueFrontend(
                    id=f"derived-clt-total-{version_id}-{period_key}",
                    assumption_definition_id=(
                        clt_total_definition.id
                        if clt_total_definition
                        else f"derived-clt-total-{period_key}"
                    ),
                    code="folha_clt_total_calculada",
                    period_date=period,
                    numeric_value=derived_clt_total,
                    text_value=None,
                    source_type="derived",
                )
            )

    return payload


@router.post("/values/{version_id}/bulk", response_model=dict)
def bulk_upsert_version_values(
    version_id: str,
    items: list[BulkUpsertItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upsert em lote no formato do frontend (POST /values/{version_id}/bulk)."""
    updated = _upsert_assumption_rows(version_id, items, db, current_user.id)

    # Audit log para rastreabilidade de mudanças de premissas
    audit = AuditLog(
        entity_type="assumption_value",
        entity_id=version_id,
        action=AuditAction.update,
        new_value={"count": updated, "version_id": version_id},
        performed_by=current_user.id,
        budget_version_id=version_id,
        notes=f"{updated} premissas salvas na versão {version_id}",
    )
    db.add(audit)
    db.commit()
    return {"updated": updated}


@router.patch("/values/{value_id}", response_model=AssumptionValueOut)
def update_value(
    value_id: str,
    data: AssumptionValueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    val = db.query(AssumptionValue).filter(AssumptionValue.id == value_id).first()
    if not val:
        raise HTTPException(status_code=404, detail="Valor não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(val, k, v)
    val.updated_by = current_user.id
    db.commit()
    db.refresh(val)
    return val


# ── Quick Add (ARCH-05) ───────────────────────────────────────────────────────


class QuickAddAssumptionRequest(BaseModel):
    budget_version_id: str
    business_id: str
    name: str
    value: float
    category_code: str  # "SALARIO" | "CUSTO_FIXO" | "CUSTO_VARIAVEL" | "FISCAL" | "RECEITA" | "CAPEX"
    data_type: str | None = "currency"
    growth_rule: dict | None = None  # se None → {"type": "static", "value": value}
    include_in_dre: bool | None = True
    ui_config: dict | None = None


@router.post("/quick-add", status_code=201)
def quick_add_assumption(
    data: QuickAddAssumptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria AssumptionDefinition + AssumptionValue em uma única chamada.
    Usado pelo botão [+ Adicionar Nova Premissa] do frontend.

    NÃO dispara recálculo — o usuário aciona manualmente quando quiser.
    """
    import re
    import unicodedata
    import uuid as _uuid

    # 1. Resolve category_id a partir do category_code
    requested_category_code = "CUSTO_FIXO" if data.category_code == "SALARIO" else data.category_code
    category = (
        db.query(AssumptionCategory)
        .filter(
            AssumptionCategory.business_id == data.business_id,
            AssumptionCategory.code == requested_category_code,
        )
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=404,
            detail=f"Categoria '{requested_category_code}' não encontrada para este negócio",
        )

    # 2. Gera code único a partir do nome
    normalized_name = (
        unicodedata.normalize("NFKD", data.name)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-z0-9]+", "_", normalized_name.lower()).strip("_")
    if data.category_code == "SALARIO" and not slug.startswith("salario_"):
        slug = f"salario_{slug}"
    code = f"{slug}_{_uuid.uuid4().hex[:6]}"

    # 3. Cria AssumptionDefinition
    data_type = data.data_type or "currency"
    normalized_value = (
        data.value / 100 if data_type == "percentage" and abs(data.value) > 1 else data.value
    )
    unit_of_measure = "%" if data_type == "percentage" else "R$" if data_type == "currency" else None
    periodicity = "static" if data_type == "percentage" else "monthly"
    is_revenue_based_percentage = data_type == "percentage" and requested_category_code in {"CUSTO_VARIAVEL", "FISCAL"}
    description = (
        "Percentual aplicado automaticamente sobre a receita ao recalcular a versão."
        if is_revenue_based_percentage
        else None
    )

    growth_rule = data.growth_rule or {"type": "static", "value": normalized_value}
    if data_type == "percentage" and growth_rule.get("type") == "curve":
        growth_rule = {
            **growth_rule,
            "values": [
                value / 100 if abs(value) > 1 else value
                for value in growth_rule.get("values", [])
            ],
        }
    definition = AssumptionDefinition(
        business_id=data.business_id,
        category_id=category.id,
        code=code,
        name=data.name,
        description=description,
        data_type=data_type,
        unit_of_measure=unit_of_measure,
        default_value=normalized_value,
        growth_rule=growth_rule,
        periodicity=periodicity,
        include_in_dre=(False if (data.ui_config or {}).get("is_separator") else bool(data.include_in_dre if data.include_in_dre is not None else True)),
        ui_config=data.ui_config,
    )
    db.add(definition)
    db.flush()  # gera definition.id

    # 4. Cria AssumptionValue estático (period_date=None — growth_rule cuida da expansão)
    assumption_value = AssumptionValue(
        budget_version_id=data.budget_version_id,
        assumption_definition_id=definition.id,
        period_date=None,
        value_numeric=normalized_value,
        source_type="manual",
    )
    db.add(assumption_value)
    db.commit()

    return {
        "definition_id": str(definition.id),
        "code": code,
        "value_id": str(assumption_value.id),
    }
