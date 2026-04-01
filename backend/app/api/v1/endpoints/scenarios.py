from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.scenario import Scenario
from app.models.budget_version import BudgetVersion
from app.models.audit_log import AuditAction, AuditLog
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate, ScenarioOut

router = APIRouter()


@router.get("", response_model=list[ScenarioOut])
def list_scenarios(
    business_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Scenario).filter(Scenario.is_active == True)
    if business_id:
        q = q.filter(Scenario.business_id == business_id)
    return q.order_by(Scenario.name).all()


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(
    data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = Scenario(**data.model_dump())
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    return s


@router.patch("/{scenario_id}", response_model=ScenarioOut)
def update_scenario(
    scenario_id: str,
    data: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove (soft-delete) um cenário. Bloqueado se houver versões de orçamento ativas."""
    s = (
        db.query(Scenario)
        .filter(Scenario.id == scenario_id, Scenario.is_active == True)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")

    active_versions = (
        db.query(BudgetVersion)
        .filter(
            BudgetVersion.scenario_id == scenario_id,
            BudgetVersion.is_active == True,
        )
        .count()
    )
    if active_versions > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cenário possui {active_versions} versão(ões) de orçamento ativa(s). Arquive-as antes de excluir o cenário.",
        )

    s.is_active = False
    db.add(
        AuditLog(
            entity_type="scenario",
            entity_id=scenario_id,
            action=AuditAction.delete,
            performed_by=current_user.id,
            notes=f"Cenário '{s.name}' excluído",
        )
    )
    db.commit()
