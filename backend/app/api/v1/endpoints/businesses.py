from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessOut

router = APIRouter()


@router.get("/", response_model=list[BusinessOut])
def list_businesses(
    organization_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Business).filter(Business.is_active == True)
    if organization_id:
        q = q.filter(Business.organization_id == organization_id)
    return q.order_by(Business.name).all()


@router.post("/", response_model=BusinessOut, status_code=201)
def create_business(
    data: BusinessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = Business(**data.model_dump())
    db.add(business)
    db.commit()
    db.refresh(business)
    return business


@router.get("/{business_id}", response_model=BusinessOut)
def get_business(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
    return b


@router.patch("/{business_id}", response_model=BusinessOut)
def update_business(
    business_id: str,
    data: BusinessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Business).filter(Business.id == business_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b
