"""
Atlas Finance — Service Plans Endpoint
CRUD para planos de serviço (Bronze/Prata/Ouro/Diamante) por Business.
Resolve ARCH-06 / GAP-02: tabela de produtos do coworking B2B.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.service_plan import ServicePlan
from app.models.audit_log import AuditAction, AuditLog
from app.schemas.service_plan import (
    ServicePlanCreate,
    ServicePlanUpdate,
    ServicePlanOut,
)

router = APIRouter()


@router.get("", response_model=list[ServicePlanOut])
def list_plans(
    business_id: str = Query(..., description="ID do negócio"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os planos de serviço de um negócio."""
    return (
        db.query(ServicePlan)
        .filter(ServicePlan.business_id == business_id)
        .order_by(ServicePlan.sort_order)
        .all()
    )


@router.post("", response_model=ServicePlanOut, status_code=201)
def create_plan(
    data: ServicePlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo plano de serviço."""
    import uuid

    plan = ServicePlan(id=str(uuid.uuid4()), **data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=ServicePlanOut)
def get_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(ServicePlan).filter(ServicePlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return p


@router.patch("/{plan_id}", response_model=ServicePlanOut)
def update_plan(
    plan_id: str,
    data: ServicePlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(ServicePlan).filter(ServicePlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    # GAP-02b: validação Σ(target_mix_pct) == 1.0
    if data.target_mix_pct is not None:
        other_plans = (
            db.query(ServicePlan)
            .filter(
                ServicePlan.business_id == p.business_id,
                ServicePlan.id != plan_id,
                ServicePlan.is_active == True,
            )
            .all()
        )
        total_mix = sum(op.target_mix_pct for op in other_plans) + p.target_mix_pct
        if not (0.999 <= total_mix <= 1.001):
            raise HTTPException(
                status_code=422,
                detail=f"Σ(target_mix_pct) deve ser 1.0 (atual: {total_mix:.3f}). Ajuste os outros planos antes.",
            )
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{plan_id}", status_code=204)
def delete_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(ServicePlan).filter(ServicePlan.id == plan_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    db.add(
        AuditLog(
            entity_type="service_plan",
            entity_id=plan_id,
            action=AuditAction.delete,
            performed_by=current_user.id,
            notes=f"Plano '{p.name}' excluído do negócio {p.business_id}",
        )
    )
    db.delete(p)
    db.commit()
