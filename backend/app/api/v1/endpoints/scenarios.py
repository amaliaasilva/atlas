from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.scenario import Scenario
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate, ScenarioOut

router = APIRouter()


@router.get("/", response_model=list[ScenarioOut])
def list_scenarios(
    business_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Scenario).filter(Scenario.is_active == True)
    if business_id:
        q = q.filter(Scenario.business_id == business_id)
    return q.order_by(Scenario.name).all()


@router.post("/", response_model=ScenarioOut, status_code=201)
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
