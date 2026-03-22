from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.budget_version import BudgetVersion
from app.models.assumption import AssumptionValue
from app.models.unit import Unit
from app.schemas.budget_version import (
    BudgetVersionCreate,
    BudgetVersionUpdate,
    BudgetVersionOut,
)

router = APIRouter()


@router.get("", response_model=list[BudgetVersionOut])
def list_budget_versions(
    unit_id: str | None = Query(None),
    scenario_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(BudgetVersion).filter(BudgetVersion.is_active == True)
    if unit_id:
        q = q.filter(BudgetVersion.unit_id == unit_id)
    if scenario_id:
        q = q.filter(BudgetVersion.scenario_id == scenario_id)
    if status:
        q = q.filter(BudgetVersion.status == status)
    return q.order_by(BudgetVersion.created_at.desc()).all()


@router.post("", response_model=BudgetVersionOut, status_code=201)
def create_budget_version(
    data: BudgetVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ARCH-02: Busca Unit para derivar effective_start_date automaticamente
    unit = db.query(Unit).filter(Unit.id == data.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    # Deriva effective_start_date de unit.opening_date se não fornecido
    if not data.effective_start_date and unit.opening_date:
        data.effective_start_date = unit.opening_date

    # Calcula effective_end_date a partir do horizonte se não fornecido
    if data.effective_start_date and not data.effective_end_date:
        horizon_years = data.projection_horizon_years or 10
        data.effective_end_date = (
            data.effective_start_date
            + relativedelta(months=horizon_years * 12)
            - relativedelta(days=1)
        )

    version = BudgetVersion(**data.to_db(), created_by=current_user.id)
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{version_id}", response_model=BudgetVersionOut)
def get_budget_version(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    return v


@router.patch("/{version_id}", response_model=BudgetVersionOut)
def update_budget_version(
    version_id: str,
    data: BudgetVersionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v


@router.post("/{version_id}/publish", response_model=BudgetVersionOut)
def publish_version(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    if v.status == "archived":
        raise HTTPException(
            status_code=409, detail="Versão arquivada não pode ser publicada"
        )
    v.status = "published"
    db.commit()
    db.refresh(v)
    return v


@router.post("/{version_id}/archive", response_model=BudgetVersionOut)
def archive_version(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    v.status = "archived"
    db.commit()
    db.refresh(v)
    return v


class CloneRequest(BaseModel):
    new_name: str | None = None


@router.post("/{version_id}/clone", response_model=BudgetVersionOut, status_code=201)
def clone_version(
    version_id: str,
    data: CloneRequest = CloneRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clona uma versão de orçamento: cria nova BudgetVersion (status=draft) com
    todos os AssumptionValues copiados. Essencial para análise What-If.
    """
    source = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Versão original não encontrada")

    new_version = BudgetVersion(
        unit_id=source.unit_id,
        scenario_id=source.scenario_id,
        version_name=data.new_name or f"{source.version_name} (cópia)",
        status="draft",
        effective_start_date=source.effective_start_date,
        effective_end_date=source.effective_end_date,
        projection_horizon_years=source.projection_horizon_years,
        notes=source.notes,
        created_by=current_user.id,
        is_active=True,
    )
    db.add(new_version)
    db.flush()  # gera new_version.id antes de copiar os valores

    source_values = (
        db.query(AssumptionValue)
        .filter(AssumptionValue.budget_version_id == version_id)
        .all()
    )
    for val in source_values:
        db.add(AssumptionValue(
            budget_version_id=new_version.id,
            assumption_definition_id=val.assumption_definition_id,
            period_date=val.period_date,
            value_numeric=val.value_numeric,
            value_text=val.value_text,
            source_type=val.source_type,
            updated_by=current_user.id,
        ))

    db.commit()
    db.refresh(new_version)
    return new_version
