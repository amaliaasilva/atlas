from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.budget_version import BudgetVersion
from app.schemas.budget_version import (
    BudgetVersionCreate,
    BudgetVersionUpdate,
    BudgetVersionOut,
)

router = APIRouter()


@router.get("/", response_model=list[BudgetVersionOut])
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


@router.post("/", response_model=BudgetVersionOut, status_code=201)
def create_budget_version(
    data: BudgetVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = BudgetVersion(**data.model_dump(), created_by=current_user.id)
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
