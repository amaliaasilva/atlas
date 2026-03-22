"""
Atlas Finance — Financing Contracts Endpoint
CRUD para contratos de financiamento por BudgetVersion.
Resolve ARCH-02 / GAP-06: múltiplos financiamentos por unidade.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.budget_version import BudgetVersion
from app.models.financing_contract import FinancingContract
from app.schemas.financing_contract import (
    FinancingContractCreate,
    FinancingContractUpdate,
    FinancingContractOut,
)

router = APIRouter()


@router.get("/{version_id}", response_model=list[FinancingContractOut])
def list_contracts(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os contratos de financiamento de uma versão."""
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    return (
        db.query(FinancingContract)
        .filter(FinancingContract.budget_version_id == version_id)
        .order_by(FinancingContract.sort_order)
        .all()
    )


@router.post("", response_model=FinancingContractOut, status_code=201)
def create_contract(
    data: FinancingContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo contrato de financiamento."""
    v = (
        db.query(BudgetVersion)
        .filter(BudgetVersion.id == data.budget_version_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    if v.status == "archived":
        raise HTTPException(
            status_code=409, detail="Versão arquivada não pode ser alterada"
        )

    import uuid

    contract = FinancingContract(id=str(uuid.uuid4()), **data.model_dump())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/contract/{contract_id}", response_model=FinancingContractOut)
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(FinancingContract).filter(FinancingContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return c


@router.patch("/contract/{contract_id}", response_model=FinancingContractOut)
def update_contract(
    contract_id: str,
    data: FinancingContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(FinancingContract).filter(FinancingContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/contract/{contract_id}", status_code=204)
def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(FinancingContract).filter(FinancingContract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    db.delete(c)
    db.commit()
