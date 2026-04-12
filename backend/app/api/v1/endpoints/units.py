from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.audit_log import AuditAction, AuditLog
from app.models.budget_version import BudgetVersion
from app.models.unit import Unit
from app.models.user import User
from app.schemas.unit import UnitCreate, UnitOut, UnitUpdate

router = APIRouter()


@router.get("", response_model=list[UnitOut])
def list_units(
    business_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Unit)
    if business_id:
        q = q.filter(Unit.business_id == business_id)
    return q.order_by(Unit.sort_order, Unit.name).all()


@router.post("", response_model=UnitOut, status_code=201)
def create_unit(
    data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = Unit(**data.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/{unit_id}", response_model=UnitOut)
def get_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    return unit


@router.patch("/{unit_id}", response_model=UnitOut)
def update_unit(
    unit_id: str,
    data: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    changes = data.model_dump(exclude_none=True)
    old_snapshot = {k: str(getattr(unit, k, None)) for k in changes}

    for k, v in changes.items():
        setattr(unit, k, v)

    # Se opening_date foi atualizado, sincronizar effective_start_date e
    # effective_end_date em todas as versões ativas da unidade, para que
    # o motor financeiro gere o horizonte correto ao recalcular.
    if "opening_date" in changes and unit.opening_date:
        active_versions = (
            db.query(BudgetVersion)
            .filter(
                BudgetVersion.unit_id == unit.id,
                BudgetVersion.is_active == True,
            )
            .all()
        )
        for version in active_versions:
            version.effective_start_date = unit.opening_date
            if version.effective_end_date and version.effective_end_date >= unit.opening_date:
                continue
            horizon_years = version.projection_horizon_years or 9
            version.effective_end_date = (
                unit.opening_date
                + relativedelta(months=horizon_years * 12)
                - relativedelta(days=1)
            )

    log = AuditLog(
        entity_type="unit",
        entity_id=unit_id,
        action=AuditAction.update,
        old_value=old_snapshot,
        new_value={k: str(v) for k, v in changes.items()},
        performed_by=current_user.id,
        notes=f"Unidade {unit.code} atualizada",
    )
    db.add(log)
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=204)
def delete_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove (soft-delete via status=closed) uma unidade. Bloqueado se houver versões ativas."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    if unit.status == "closed":
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    active_versions = (
        db.query(BudgetVersion)
        .filter(
            BudgetVersion.unit_id == unit_id,
            BudgetVersion.is_active == True,
            BudgetVersion.status != "archived",
        )
        .count()
    )
    if active_versions > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Unidade possui {active_versions} versão(ões) ativa(s). Arquive-as antes de excluir a unidade.",
        )

    unit.status = "closed"
    db.add(
        AuditLog(
            entity_type="unit",
            entity_id=unit_id,
            action=AuditAction.delete,
            performed_by=current_user.id,
            notes=f"Unidade '{unit.code}' excluída (marcada como closed)",
        )
    )
    db.commit()
