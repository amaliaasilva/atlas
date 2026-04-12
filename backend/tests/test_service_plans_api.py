from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.api.v1.deps import get_current_user
from app.core.database import Base, get_db
from app.models.business import Business, BusinessType
from app.models.organization import Organization
from app.models.service_plan import ServicePlan
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


import pytest


@pytest.fixture()
def client_with_plans():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[get_db] = override_get_db

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
        plans = [
            ServicePlan(
                id="plan-1",
                business_id=business.id,
                name="Diamante",
                code="DIAMANTE",
                price_per_hour=55.0,
                target_mix_pct=0.40,
                min_classes_month=110,
                max_classes_month=200,
                sort_order=1,
                is_active=True,
            ),
            ServicePlan(
                id="plan-2",
                business_id=business.id,
                name="Ouro",
                code="OURO",
                price_per_hour=60.0,
                target_mix_pct=0.30,
                min_classes_month=71,
                max_classes_month=110,
                sort_order=2,
                is_active=True,
            ),
            ServicePlan(
                id="plan-3",
                business_id=business.id,
                name="Prata",
                code="PRATA",
                price_per_hour=65.0,
                target_mix_pct=0.20,
                min_classes_month=41,
                max_classes_month=70,
                sort_order=3,
                is_active=True,
            ),
            ServicePlan(
                id="plan-4",
                business_id=business.id,
                name="Bronze",
                code="BRONZE",
                price_per_hour=70.0,
                target_mix_pct=0.10,
                min_classes_month=4,
                max_classes_month=40,
                sort_order=4,
                is_active=True,
            ),
        ]
        db.add_all([user, org, business, *plans])
        db.commit()

    app.dependency_overrides[get_current_user] = lambda: _CurrentUser("user-1")

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_update_service_plan_allows_rebalancing_mix_progressively(client_with_plans):
    response = client_with_plans.patch(
        "/api/v1/service-plans/plan-1",
        json={"target_mix_pct": 0.25},
    )

    assert response.status_code == 200
    assert response.json()["target_mix_pct"] == 0.25
