from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.api.v1.deps import get_current_user
from app.core.database import Base, get_db
from app.models.business import Business, BusinessType
from app.models.budget_version import BudgetVersion
from app.models.calculated_result import CalculatedResult
from app.models.line_item import CalculationType, LineItemCategory, LineItemDefinition
from app.models.organization import Organization
from app.models.scenario import Scenario, ScenarioType
from app.models.unit import Unit, UnitStatus
from app.models.user import User


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class _CurrentUser:
    def __init__(self, user_id: str):
        self.id = user_id
        self.is_superuser = True


@pytest.fixture()
def client_with_dashboard_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: _CurrentUser("user-1")

    with TestingSessionLocal() as db:
        user = User(
            id="user-1",
            email="tester@example.com",
            full_name="Tester",
            hashed_password="not-used",
            is_superuser=True,
        )
        org = Organization(id="org-1", name="Org Teste", slug="org-teste")
        business = Business(
            id="biz-1",
            organization_id=org.id,
            name="Negócio Teste",
            slug="negocio-teste",
            business_type=BusinessType.cowork_gym,
        )
        unit = Unit(
            id="unit-1",
            business_id=business.id,
            name="Unidade 1",
            code="U1",
            opening_date=date(2026, 1, 1),
            status=UnitStatus.active,
        )
        scenario = Scenario(
            id="scenario-1",
            business_id=business.id,
            name="Base",
            scenario_type=ScenarioType.base,
            is_active=True,
            occupancy_multiplier=1.0,
        )
        version = BudgetVersion(
            id="version-1",
            unit_id=unit.id,
            scenario_id=scenario.id,
            version_name="Orçamento Base",
            status="published",
            is_active=True,
            effective_start_date=date(2026, 1, 1),
            effective_end_date=date(2034, 12, 31),
            projection_horizon_years=9,
            created_by=user.id,
        )
        line_item = LineItemDefinition(
            id="line-1",
            business_id=business.id,
            code="net_result",
            name="Resultado Líquido",
            category=LineItemCategory.result,
            calculation_type=CalculationType.derived,
            display_order=1,
            is_kpi=True,
        )
        db.add_all([user, org, business, unit, scenario, version, line_item])
        db.flush()
        db.add_all(
            [
                CalculatedResult(
                    budget_version_id=version.id,
                    unit_id=unit.id,
                    scenario_id=scenario.id,
                    line_item_id=line_item.id,
                    period_date="2034-12",
                    value=100.0,
                ),
                CalculatedResult(
                    budget_version_id=version.id,
                    unit_id=unit.id,
                    scenario_id=scenario.id,
                    line_item_id=line_item.id,
                    period_date="2035-01",
                    value=999.0,
                ),
            ]
        )
        db.commit()

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_unit_dashboard_ignores_stale_periods_after_projection_end(client_with_dashboard_data):
    response = client_with_dashboard_data.get("/api/v1/dashboard/unit/version-1")

    assert response.status_code == 200
    payload = response.json()
    assert [item["period"] for item in payload["time_series"]] == ["2034-12"]


def test_consolidated_dashboard_ignores_stale_periods_after_projection_end(client_with_dashboard_data):
    response = client_with_dashboard_data.get(
        "/api/v1/dashboard/business/biz-1/consolidated",
        params={"scenario_id": "scenario-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert [item["period"] for item in payload["time_series"]] == ["2034-12"]
