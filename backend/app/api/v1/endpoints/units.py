from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.audit_log import AuditAction, AuditLog
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
