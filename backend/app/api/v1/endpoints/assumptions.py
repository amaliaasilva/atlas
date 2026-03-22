from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
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
    AssumptionValueCreate,
    AssumptionValueUpdate,
    AssumptionValueOut,
    AssumptionValueBulkUpdate,
    AssumptionValueFrontend,
    BulkUpsertItem,
)

router = APIRouter()


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
    db.query(AssumptionValue).filter(
        AssumptionValue.budget_version_id == version_id
    ).delete()
    rows = [
        AssumptionValue(**v.model_dump(), updated_by=current_user.id)
        for v in data.values
    ]
    db.add_all(rows)
    db.commit()
    return {"updated": len(rows)}


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
    return [
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
    ]


@router.post("/values/{version_id}/bulk", response_model=dict)
def bulk_upsert_version_values(
    version_id: str,
    items: list[BulkUpsertItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upsert em lote no formato do frontend (POST /values/{version_id}/bulk)."""
    db.query(AssumptionValue).filter(
        AssumptionValue.budget_version_id == version_id
    ).delete()
    rows = [
        AssumptionValue(
            budget_version_id=version_id,
            assumption_definition_id=item.assumption_definition_id,
            period_date=item.period_date,
            value_numeric=item.numeric_value,
            value_text=item.text_value,
            source_type=item.source_type or "manual",
            updated_by=current_user.id,
        )
        for item in items
    ]
    db.add_all(rows)
    db.commit()
    return {"updated": len(rows)}


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
    category_code: str  # "CUSTO_FIXO" | "CUSTO_VARIAVEL" | "RECEITA" | "CAPEX"
    data_type: str | None = "currency"
    growth_rule: dict | None = None  # se None → {"type": "static", "value": value}


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
    import uuid as _uuid

    # 1. Resolve category_id a partir do category_code
    category = (
        db.query(AssumptionCategory)
        .filter(
            AssumptionCategory.business_id == data.business_id,
            AssumptionCategory.code == data.category_code,
        )
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=404,
            detail=f"Categoria '{data.category_code}' não encontrada para este negócio",
        )

    # 2. Gera code único a partir do nome
    slug = re.sub(r"[^a-z0-9]+", "_", data.name.lower()).strip("_")
    code = f"{slug}_{_uuid.uuid4().hex[:6]}"

    # 3. Cria AssumptionDefinition
    growth_rule = data.growth_rule or {"type": "static", "value": data.value}
    definition = AssumptionDefinition(
        business_id=data.business_id,
        category_id=category.id,
        code=code,
        name=data.name,
        data_type=data.data_type or "currency",
        default_value=data.value,
        growth_rule=growth_rule,
        periodicity="monthly",
    )
    db.add(definition)
    db.flush()  # gera definition.id

    # 4. Cria AssumptionValue estático (period_date=None — growth_rule cuida da expansão)
    assumption_value = AssumptionValue(
        budget_version_id=data.budget_version_id,
        assumption_definition_id=definition.id,
        period_date=None,
        value_numeric=data.value,
        source_type="manual",
    )
    db.add(assumption_value)
    db.commit()

    return {
        "definition_id": str(definition.id),
        "code": code,
        "value_id": str(assumption_value.id),
    }
