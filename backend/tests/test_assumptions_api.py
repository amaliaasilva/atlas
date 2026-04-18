from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.api.v1.deps import get_current_user
from app.api.v1.endpoints.calculations import (
    _auto_update_working_capital_from_results,
    _build_inputs_for_version,
)
from app.core.database import Base, get_db
from app.models.assumption import AssumptionCategory, AssumptionDefinition, AssumptionValue
from app.models.budget_version import BudgetVersion, VersionStatus
from app.models.business import Business, BusinessType
from app.models.calculated_result import CalculatedResult
from app.models.line_item import LineItemDefinition
from app.models.organization import Organization
from app.models.scenario import Scenario, ScenarioType
from app.models.service_plan import ServicePlan
from app.models.unit import Unit, UnitStatus
from app.models.user import User
from app.services.financial_engine.revenue import calculate_gross_revenue


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
def client_with_data():
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
        category = AssumptionCategory(
            id="cat-1",
            business_id=business.id,
            name="Custos Fixos",
            code="CUSTO_FIXO",
            sort_order=1,
        )
        definition = AssumptionDefinition(
            id="def-1",
            business_id=business.id,
            category_id=category.id,
            code="taxa_limpeza_teste",
            name="Taxa de Limpeza",
            data_type="currency",
            default_value=150.0,
            editable=True,
            periodicity="monthly",
            applies_to="version",
            sort_order=1,
            is_active=True,
            granularity="monthly",
            growth_rule={"type": "flat"},
        )
        value = AssumptionValue(
            id="val-1",
            budget_version_id="version-1",
            assumption_definition_id=definition.id,
            value_numeric=150.0,
            source_type="manual",
            updated_by=user.id,
        )
        db.add_all([user, org, business, category, definition, value])
        db.commit()

    app.dependency_overrides[get_current_user] = lambda: _CurrentUser("user-1")

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_delete_assumption_definition_soft_deletes_and_removes_values(client_with_data):
    response = client_with_data.delete("/api/v1/assumptions/definitions/def-1")

    assert response.status_code == 204

    with TestingSessionLocal() as db:
        definition = (
            db.query(AssumptionDefinition)
            .filter(AssumptionDefinition.id == "def-1")
            .first()
        )
        assert definition is not None
        assert definition.is_active is False
        assert (
            db.query(AssumptionValue)
            .filter(AssumptionValue.assumption_definition_id == "def-1")
            .count()
            == 0
        )


def test_update_assumption_definition_allows_category_change(client_with_data):
    with TestingSessionLocal() as db:
        revenue_category = AssumptionCategory(
            id="cat-2",
            business_id="biz-1",
            name="Receita",
            code="RECEITA",
            sort_order=2,
        )
        db.add(revenue_category)
        db.commit()

    response = client_with_data.patch(
        "/api/v1/assumptions/definitions/def-1",
        json={"name": "Nova Taxa", "category_id": "cat-2"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Nova Taxa"
    assert response.json()["category_id"] == "cat-2"


def test_quick_add_salary_normalizes_code_for_clt_charge_logic(client_with_data):
    response = client_with_data.post(
        "/api/v1/assumptions/quick-add",
        json={
            "budget_version_id": "version-1",
            "business_id": "biz-1",
            "name": "Salário Supervisor",
            "value": 3500,
            "category_code": "SALARIO",
            "data_type": "currency",
        },
    )

    assert response.status_code == 201
    assert response.json()["code"].startswith("salario_supervisor_")


def test_quick_add_percentage_assumption_sets_static_percent_metadata(client_with_data):
    with TestingSessionLocal() as db:
        fiscal_category = AssumptionCategory(
            id="cat-fiscal",
            business_id="biz-1",
            name="Fiscal",
            code="FISCAL",
            sort_order=2,
        )
        db.add(fiscal_category)
        db.commit()

    response = client_with_data.post(
        "/api/v1/assumptions/quick-add",
        json={
            "budget_version_id": "version-1",
            "business_id": "biz-1",
            "name": "Royalties sobre Receita",
            "value": 0.05,
            "category_code": "FISCAL",
            "data_type": "percentage",
        },
    )

    assert response.status_code == 201

    with TestingSessionLocal() as db:
        definition = (
            db.query(AssumptionDefinition)
            .filter(AssumptionDefinition.code == response.json()["code"])
            .first()
        )
        assert definition is not None
        assert definition.data_type == "percentage"
        assert definition.unit_of_measure == "%"
        assert definition.periodicity == "static"


def test_get_version_values_includes_derived_capacity_row(client_with_data):
    with TestingSessionLocal() as db:
        defs = [
            AssumptionDefinition(
                id="def-slots",
                business_id="biz-1",
                category_id="cat-1",
                code="slots_por_hora",
                name="Slots por hora",
                data_type="integer",
                default_value=10.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=2,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-weekday",
                business_id="biz-1",
                category_id="cat-1",
                code="horas_dia_util",
                name="Horas dia útil",
                data_type="numeric",
                default_value=17.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=3,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-saturday",
                business_id="biz-1",
                category_id="cat-1",
                code="horas_dia_sabado",
                name="Horas sábado",
                data_type="numeric",
                default_value=7.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=4,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-working-days",
                business_id="biz-1",
                category_id="cat-1",
                code="dias_uteis_mes",
                name="Dias úteis",
                data_type="integer",
                default_value=22.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=5,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-saturdays",
                business_id="biz-1",
                category_id="cat-1",
                code="sabados_mes",
                name="Sábados",
                data_type="integer",
                default_value=4.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=6,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-occupancy",
                business_id="biz-1",
                category_id="cat-1",
                code="taxa_ocupacao",
                name="Taxa de ocupação mensal",
                data_type="percentage",
                default_value=0.25,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=7,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-capacity",
                business_id="biz-1",
                category_id="cat-1",
                code="capacidade_maxima_mes",
                name="Capacidade máxima por mês",
                data_type="numeric",
                default_value=4020.0,
                editable=False,
                periodicity="monthly",
                applies_to="version",
                sort_order=8,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-estimated-capacity",
                business_id="biz-1",
                category_id="cat-1",
                code="capacidade_estimada_aulas_mes",
                name="Capacidade estimada por mês",
                data_type="numeric",
                default_value=0.0,
                editable=False,
                periodicity="monthly",
                applies_to="version",
                sort_order=9,
                is_active=True,
                granularity="monthly",
            ),
        ]
        occupancy_value = AssumptionValue(
            id="val-occupancy",
            budget_version_id="version-1",
            assumption_definition_id="def-occupancy",
            period_date=None,
            value_numeric=0.25,
            source_type="manual",
            updated_by="user-1",
        )
        db.add_all(defs + [occupancy_value])
        db.commit()

    response = client_with_data.get("/api/v1/assumptions/values/version-1")

    assert response.status_code == 200
    payload = response.json()
    derived = [row for row in payload if row["code"] == "capacidade_maxima_mes"]
    assert derived
    assert derived[0]["numeric_value"] == 4020.0
    assert derived[0]["source_type"] == "derived"

    estimated = [row for row in payload if row["code"] == "capacidade_estimada_aulas_mes"]
    assert estimated
    assert estimated[0]["numeric_value"] == 1005.0
    assert estimated[0]["source_type"] == "derived"


def test_build_inputs_for_version_honors_static_capacity_assumptions(client_with_data):
    with TestingSessionLocal() as db:
        revenue_category = AssumptionCategory(
            id="cat-revenue-calc",
            business_id="biz-1",
            name="Receita",
            code="RECEITA",
            sort_order=2,
        )
        defs = [
            AssumptionDefinition(
                id="def-calc-slots",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="slots_por_hora",
                name="Slots por hora",
                data_type="integer",
                default_value=10.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=20,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-calc-weekday",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="horas_dia_util",
                name="Horas dia útil",
                data_type="numeric",
                default_value=17.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=21,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-calc-saturday",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="horas_dia_sabado",
                name="Horas sábado",
                data_type="numeric",
                default_value=7.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=22,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-calc-workdays",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="dias_uteis_mes",
                name="Dias úteis",
                data_type="numeric",
                default_value=20.83,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=23,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-calc-saturdays",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="sabados_mes",
                name="Sábados",
                data_type="numeric",
                default_value=4.33,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=24,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-calc-occupancy",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="taxa_ocupacao",
                name="Taxa de ocupação",
                data_type="percentage",
                default_value=0.03,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=25,
                is_active=True,
                granularity="monthly",
                growth_rule={"type": "flat"},
            ),
        ]
        values = [
            AssumptionValue(
                id="val-calc-workdays",
                budget_version_id="version-calc",
                assumption_definition_id="def-calc-workdays",
                period_date=None,
                value_numeric=20.83,
                source_type="manual",
                updated_by="user-1",
            ),
            AssumptionValue(
                id="val-calc-saturdays",
                budget_version_id="version-calc",
                assumption_definition_id="def-calc-saturdays",
                period_date=None,
                value_numeric=4.33,
                source_type="manual",
                updated_by="user-1",
            ),
            AssumptionValue(
                id="val-calc-occupancy",
                budget_version_id="version-calc",
                assumption_definition_id="def-calc-occupancy",
                period_date=None,
                value_numeric=0.03,
                source_type="manual",
                updated_by="user-1",
            ),
        ]
        unit = Unit(
            id="unit-calc",
            business_id="biz-1",
            name="Unidade Cálculo",
            code="UCALC",
            opening_date=date(2026, 11, 1),
            status=UnitStatus.active,
        )
        scenario = Scenario(
            id="scenario-calc",
            business_id="biz-1",
            name="Base",
            scenario_type=ScenarioType.base,
            is_active=True,
            occupancy_multiplier=1.0,
        )
        version = BudgetVersion(
            id="version-calc",
            unit_id=unit.id,
            scenario_id=scenario.id,
            version_name="Versão Cálculo",
            status=VersionStatus.draft,
            effective_start_date=date(2026, 11, 1),
            projection_horizon_years=1,
            is_active=True,
        )
        plans = [
            ServicePlan(
                id="plan-calc-1",
                business_id="biz-1",
                name="Diamante",
                code="DIAMANTE",
                price_per_hour=55.0,
                target_mix_pct=0.25,
                min_classes_month=110,
                max_classes_month=200,
                sort_order=1,
                is_active=True,
            ),
            ServicePlan(
                id="plan-calc-2",
                business_id="biz-1",
                name="Ouro",
                code="OURO",
                price_per_hour=60.0,
                target_mix_pct=0.25,
                min_classes_month=71,
                max_classes_month=110,
                sort_order=2,
                is_active=True,
            ),
            ServicePlan(
                id="plan-calc-3",
                business_id="biz-1",
                name="Prata",
                code="PRATA",
                price_per_hour=65.0,
                target_mix_pct=0.25,
                min_classes_month=41,
                max_classes_month=70,
                sort_order=3,
                is_active=True,
            ),
            ServicePlan(
                id="plan-calc-4",
                business_id="biz-1",
                name="Bronze",
                code="BRONZE",
                price_per_hour=70.0,
                target_mix_pct=0.25,
                min_classes_month=4,
                max_classes_month=40,
                sort_order=4,
                is_active=True,
            ),
        ]
        db.add_all([revenue_category, unit, scenario, version, *defs, *values, *plans])
        db.commit()

        inputs_list, _capex, _periods = _build_inputs_for_version("version-calc", db)

    first_revenue = inputs_list[0].revenue
    result = calculate_gross_revenue(first_revenue)

    assert first_revenue.working_days_month == pytest.approx(20.83)
    assert first_revenue.saturdays_month == pytest.approx(4.33)
    assert result["capacity_hours_month"] == pytest.approx(3844.2, rel=1e-3)
    assert result["gross_revenue"] == pytest.approx(7207.88, rel=1e-3)


def test_build_inputs_for_version_uses_version_start_for_revenue(client_with_data):
    with TestingSessionLocal() as db:
        revenue_category = AssumptionCategory(
            id="cat-revenue-horizon",
            business_id="biz-1",
            name="Receita",
            code="RECEITA",
            sort_order=3,
        )
        defs = [
            AssumptionDefinition(
                id="def-horizon-slots",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="slots_por_hora",
                name="Slots por hora",
                data_type="integer",
                default_value=10.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=30,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-horizon-weekday",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="horas_dia_util",
                name="Horas dia útil",
                data_type="numeric",
                default_value=17.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=31,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-horizon-saturday",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="horas_dia_sabado",
                name="Horas sábado",
                data_type="numeric",
                default_value=7.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=32,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-horizon-workdays",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="dias_uteis_mes",
                name="Dias úteis",
                data_type="numeric",
                default_value=20.83,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=33,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-horizon-saturdays",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="sabados_mes",
                name="Sábados",
                data_type="numeric",
                default_value=4.33,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=34,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-horizon-occupancy",
                business_id="biz-1",
                category_id=revenue_category.id,
                code="taxa_ocupacao",
                name="Taxa de ocupação",
                data_type="percentage",
                default_value=0.03,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=35,
                is_active=True,
                granularity="monthly",
                growth_rule={"type": "flat"},
            ),
        ]
        values = [
            AssumptionValue(
                id="val-horizon-workdays",
                budget_version_id="version-horizon",
                assumption_definition_id="def-horizon-workdays",
                period_date=None,
                value_numeric=20.83,
                source_type="manual",
                updated_by="user-1",
            ),
            AssumptionValue(
                id="val-horizon-saturdays",
                budget_version_id="version-horizon",
                assumption_definition_id="def-horizon-saturdays",
                period_date=None,
                value_numeric=4.33,
                source_type="manual",
                updated_by="user-1",
            ),
            AssumptionValue(
                id="val-horizon-occupancy",
                budget_version_id="version-horizon",
                assumption_definition_id="def-horizon-occupancy",
                period_date=None,
                value_numeric=0.03,
                source_type="manual",
                updated_by="user-1",
            ),
        ]
        unit = Unit(
            id="unit-horizon",
            business_id="biz-1",
            name="Unidade Horizonte",
            code="UHOR",
            opening_date=date(2026, 11, 1),
            status=UnitStatus.active,
        )
        scenario = Scenario(
            id="scenario-horizon",
            business_id="biz-1",
            name="Base Horizonte",
            scenario_type=ScenarioType.base,
            is_active=True,
            occupancy_multiplier=1.0,
        )
        version = BudgetVersion(
            id="version-horizon",
            unit_id=unit.id,
            scenario_id=scenario.id,
            version_name="Versão Horizonte",
            status=VersionStatus.draft,
            effective_start_date=date(2026, 8, 1),
            projection_horizon_years=1,
            is_active=True,
        )
        plans = [
            ServicePlan(
                id="plan-horizon-1",
                business_id="biz-1",
                name="Diamante",
                code="DIAMANTE",
                price_per_hour=55.0,
                target_mix_pct=0.25,
                min_classes_month=110,
                max_classes_month=200,
                sort_order=1,
                is_active=True,
            ),
            ServicePlan(
                id="plan-horizon-2",
                business_id="biz-1",
                name="Ouro",
                code="OURO",
                price_per_hour=60.0,
                target_mix_pct=0.25,
                min_classes_month=71,
                max_classes_month=110,
                sort_order=2,
                is_active=True,
            ),
            ServicePlan(
                id="plan-horizon-3",
                business_id="biz-1",
                name="Prata",
                code="PRATA",
                price_per_hour=65.0,
                target_mix_pct=0.25,
                min_classes_month=41,
                max_classes_month=70,
                sort_order=3,
                is_active=True,
            ),
            ServicePlan(
                id="plan-horizon-4",
                business_id="biz-1",
                name="Bronze",
                code="BRONZE",
                price_per_hour=70.0,
                target_mix_pct=0.25,
                min_classes_month=4,
                max_classes_month=40,
                sort_order=4,
                is_active=True,
            ),
        ]
        db.add_all([revenue_category, unit, scenario, version, *defs, *values, *plans])
        db.commit()

        inputs_list, _capex, periods = _build_inputs_for_version("version-horizon", db)

    assert periods[0] == "2026-08"
    result = calculate_gross_revenue(inputs_list[0].revenue)
    assert result["gross_revenue"] == pytest.approx(7207.88, rel=1e-3)

def test_non_base_occupancy_multiplier_preserves_manual_period_override():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestingSessionLocal() as db:
        user = User(
            id="user-occ",
            email="occ@example.com",
            full_name="Occupancy Tester",
            hashed_password="not-used",
            is_superuser=True,
        )
        org = Organization(id="org-occ", name="Org OCC", slug="org-occ")
        business = Business(
            id="biz-occ",
            organization_id=org.id,
            name="Negócio OCC",
            slug="negocio-occ",
            business_type=BusinessType.cowork_gym,
        )
        category = AssumptionCategory(
            id="cat-occ",
            business_id=business.id,
            name="Receita",
            code="RECEITA",
            sort_order=1,
        )
        occupancy_def = AssumptionDefinition(
            id="def-occ",
            business_id=business.id,
            category_id=category.id,
            code="taxa_ocupacao",
            name="Taxa de ocupação",
            data_type="percentage",
            default_value=0.2,
            editable=True,
            periodicity="monthly",
            applies_to="version",
            sort_order=1,
            is_active=True,
            granularity="monthly",
            growth_rule={"type": "flat"},
        )
        unit = Unit(
            id="unit-occ",
            business_id=business.id,
            name="Unidade OCC",
            code="UOCC",
            opening_date=date(2026, 8, 1),
            status=UnitStatus.active,
        )
        scenario_base = Scenario(
            id="scenario-occ-base",
            business_id=business.id,
            name="Base",
            scenario_type=ScenarioType.base,
            is_active=True,
            occupancy_multiplier=1.0,
        )
        scenario_aggressive = Scenario(
            id="scenario-occ-agg",
            business_id=business.id,
            name="Agressivo",
            scenario_type=ScenarioType.aggressive,
            is_active=True,
            occupancy_multiplier=1.5,
        )
        base_version = BudgetVersion(
            id="version-occ-base",
            unit_id=unit.id,
            scenario_id=scenario_base.id,
            version_name="Versão Base",
            status=VersionStatus.draft,
            effective_start_date=date(2026, 8, 1),
            projection_horizon_years=1,
            is_active=True,
        )
        aggressive_version = BudgetVersion(
            id="version-occ-agg",
            unit_id=unit.id,
            scenario_id=scenario_aggressive.id,
            version_name="Versão Agressiva",
            status=VersionStatus.draft,
            effective_start_date=date(2026, 8, 1),
            projection_horizon_years=1,
            is_active=True,
        )
        base_occupancy = AssumptionValue(
            id="val-occ-base",
            budget_version_id=base_version.id,
            assumption_definition_id=occupancy_def.id,
            period_date=None,
            value_numeric=0.2,
            source_type="manual",
            updated_by=user.id,
        )
        manual_aug_override = AssumptionValue(
            id="val-occ-agg-aug",
            budget_version_id=aggressive_version.id,
            assumption_definition_id=occupancy_def.id,
            period_date="2026-08",
            value_numeric=0.25,
            source_type="manual",
            updated_by=user.id,
        )

        db.add_all(
            [
                user,
                org,
                business,
                category,
                occupancy_def,
                unit,
                scenario_base,
                scenario_aggressive,
                base_version,
                aggressive_version,
                base_occupancy,
                manual_aug_override,
            ]
        )
        db.commit()

        inputs_list, _capex, periods = _build_inputs_for_version(aggressive_version.id, db)

    assert periods[0] == "2026-08"
    assert periods[1] == "2026-09"
    assert inputs_list[0].revenue.occupancy_rate == pytest.approx(0.25)
    assert inputs_list[1].revenue.occupancy_rate == pytest.approx(0.3)


def test_get_version_values_includes_derived_utility_rows(client_with_data):
    with TestingSessionLocal() as db:
        defs = [
            AssumptionDefinition(
                id="def-energy-fixed",
                business_id="biz-1",
                category_id="cat-1",
                code="custo_energia_fixo",
                name="Energia fixa",
                data_type="currency",
                default_value=4200.0,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=10,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-energy-variable",
                business_id="biz-1",
                category_id="cat-1",
                code="custo_energia_variavel_max",
                name="Energia variável máxima",
                data_type="currency",
                default_value=3000.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=11,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-energy-automation",
                business_id="biz-1",
                category_id="cat-1",
                code="automacao_reducao_pct",
                name="Automação energia",
                data_type="percentage",
                default_value=0.20,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=12,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-water-fixed",
                business_id="biz-1",
                category_id="cat-1",
                code="custo_agua_fixo",
                name="Água fixa",
                data_type="currency",
                default_value=300.0,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=13,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-water-variable",
                business_id="biz-1",
                category_id="cat-1",
                code="custo_agua_variavel_max",
                name="Água variável máxima",
                data_type="currency",
                default_value=1300.0,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=14,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-occupancy",
                business_id="biz-1",
                category_id="cat-1",
                code="taxa_ocupacao",
                name="Taxa de ocupação mensal",
                data_type="percentage",
                default_value=0.25,
                editable=True,
                periodicity="monthly",
                applies_to="version",
                sort_order=15,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-ticket",
                business_id="biz-1",
                category_id="cat-1",
                code="ticket_medio_plano_mensal",
                name="Ticket médio",
                data_type="currency",
                default_value=57.5,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=16,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-card-fee",
                business_id="biz-1",
                category_id="cat-1",
                code="taxa_cartao_pct",
                name="Taxa cartão",
                data_type="percentage",
                default_value=0.035,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=17,
                is_active=True,
                granularity="monthly",
            ),
            AssumptionDefinition(
                id="def-taxes",
                business_id="biz-1",
                category_id="cat-1",
                code="aliquota_imposto_receita",
                name="Impostos",
                data_type="percentage",
                default_value=0.06,
                editable=True,
                periodicity="static",
                applies_to="version",
                sort_order=18,
                is_active=True,
                granularity="monthly",
            ),
        ]
        occupancy_value = AssumptionValue(
            id="val-utility-occupancy",
            budget_version_id="version-1",
            assumption_definition_id="def-occupancy",
            period_date=None,
            value_numeric=0.25,
            source_type="manual",
            updated_by="user-1",
        )
        db.add_all(defs + [occupancy_value])
        db.commit()

    response = client_with_data.get("/api/v1/assumptions/values/version-1")

    assert response.status_code == 200
    payload = response.json()

    energy = [row for row in payload if row["code"] == "custo_energia_calculado_mes"]
    assert energy
    assert energy[0]["numeric_value"] == 3960.0
    assert energy[0]["source_type"] == "derived"

    water = [row for row in payload if row["code"] == "custo_agua_calculado_mes"]
    assert water
    assert water[0]["numeric_value"] == 625.0
    assert water[0]["source_type"] == "derived"

    card_fee = [row for row in payload if row["code"] == "custo_taxa_cartao_calculado_mes"]
    assert card_fee
    assert card_fee[0]["numeric_value"] == pytest.approx(round(1005.0 * 57.5 * 0.035, 2))
    assert card_fee[0]["source_type"] == "derived"

    taxes = [row for row in payload if row["code"] == "impostos_calculados_mes"]
    assert taxes
    assert taxes[0]["numeric_value"] == pytest.approx(round(1005.0 * 57.5 * 0.06, 2))
    assert taxes[0]["source_type"] == "derived"


def test_auto_working_capital_replaces_stale_period_rows():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestingSessionLocal() as db:
        user = User(
            id="user-wc",
            email="wc@example.com",
            full_name="Working Capital",
            hashed_password="not-used",
            is_superuser=True,
        )
        org = Organization(id="org-wc", name="Org WC", slug="org-wc")
        business = Business(
            id="biz-wc",
            organization_id=org.id,
            name="Negócio WC",
            slug="negocio-wc",
            business_type=BusinessType.cowork_gym,
        )
        category = AssumptionCategory(
            id="cat-wc",
            business_id=business.id,
            name="Caixa",
            code="CAIXA",
            sort_order=1,
        )
        unit = Unit(
            id="unit-wc",
            business_id=business.id,
            name="Unidade WC",
            code="UWC",
            opening_date=date(2026, 8, 1),
            status=UnitStatus.active,
        )
        scenario = Scenario(
            id="scenario-wc",
            business_id=business.id,
            name="Base WC",
            scenario_type=ScenarioType.base,
            is_active=True,
            occupancy_multiplier=1.0,
        )
        version = BudgetVersion(
            id="version-wc",
            unit_id=unit.id,
            scenario_id=scenario.id,
            version_name="Versão WC",
            status=VersionStatus.draft,
            effective_start_date=date(2026, 8, 1),
            projection_horizon_years=1,
            is_active=True,
        )

        def_working_cap = AssumptionDefinition(
            id="def-wc",
            business_id=business.id,
            category_id=category.id,
            code="capital_giro_inicial",
            name="Capital de giro inicial",
            data_type="currency",
            default_value=0.0,
            editable=False,
            periodicity="static",
            applies_to="version",
            sort_order=1,
            is_active=True,
            include_in_dre=False,
            granularity="monthly",
        )
        def_burn_no_revenue = AssumptionDefinition(
            id="def-wc-burn-1",
            business_id=business.id,
            category_id=category.id,
            code="caixa_meses_burn_sem_receita",
            name="Meses sem receita",
            data_type="numeric",
            default_value=3.0,
            editable=True,
            periodicity="static",
            applies_to="version",
            sort_order=2,
            is_active=True,
            include_in_dre=False,
            granularity="monthly",
        )
        def_burn_with_revenue = AssumptionDefinition(
            id="def-wc-burn-2",
            business_id=business.id,
            category_id=category.id,
            code="caixa_meses_com_receita",
            name="Meses com receita",
            data_type="numeric",
            default_value=9.0,
            editable=True,
            periodicity="static",
            applies_to="version",
            sort_order=3,
            is_active=True,
            include_in_dre=False,
            granularity="monthly",
        )

        line_revenue = LineItemDefinition(
            id="li-revenue",
            business_id=business.id,
            code="revenue_total",
            name="Receita Total",
            category="result",
            calculation_type="derived",
            display_order=1,
            indent_level=0,
            is_kpi=False,
            is_subtotal=False,
            is_visible=True,
        )
        line_variable = LineItemDefinition(
            id="li-variable",
            business_id=business.id,
            code="total_variable_costs",
            name="Custos Variáveis Totais",
            category="result",
            calculation_type="derived",
            display_order=2,
            indent_level=0,
            is_kpi=False,
            is_subtotal=False,
            is_visible=True,
        )
        line_fixed = LineItemDefinition(
            id="li-fixed",
            business_id=business.id,
            code="total_fixed_costs",
            name="Custos Fixos Totais",
            category="result",
            calculation_type="derived",
            display_order=3,
            indent_level=0,
            is_kpi=False,
            is_subtotal=False,
            is_visible=True,
        )

        stale_period_value = AssumptionValue(
            id="val-wc-stale",
            budget_version_id=version.id,
            assumption_definition_id=def_working_cap.id,
            period_date="2026-11",
            value_numeric=999999.0,
            source_type="manual",
            updated_by=user.id,
        )
        burn_no_revenue_value = AssumptionValue(
            id="val-wc-burn-1",
            budget_version_id=version.id,
            assumption_definition_id=def_burn_no_revenue.id,
            period_date=None,
            value_numeric=1.0,
            source_type="manual",
            updated_by=user.id,
        )
        burn_with_revenue_value = AssumptionValue(
            id="val-wc-burn-2",
            budget_version_id=version.id,
            assumption_definition_id=def_burn_with_revenue.id,
            period_date=None,
            value_numeric=2.0,
            source_type="manual",
            updated_by=user.id,
        )

        results = [
            CalculatedResult(
                id="res-1",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_revenue.id,
                period_date="2026-08",
                value=1000.0,
            ),
            CalculatedResult(
                id="res-2",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_variable.id,
                period_date="2026-08",
                value=300.0,
            ),
            CalculatedResult(
                id="res-3",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_fixed.id,
                period_date="2026-08",
                value=500.0,
            ),
            CalculatedResult(
                id="res-4",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_revenue.id,
                period_date="2026-09",
                value=1100.0,
            ),
            CalculatedResult(
                id="res-5",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_variable.id,
                period_date="2026-09",
                value=350.0,
            ),
            CalculatedResult(
                id="res-6",
                budget_version_id=version.id,
                unit_id=unit.id,
                scenario_id=scenario.id,
                line_item_id=line_fixed.id,
                period_date="2026-09",
                value=550.0,
            ),
        ]

        db.add_all(
            [
                user,
                org,
                business,
                category,
                unit,
                scenario,
                version,
                def_working_cap,
                def_burn_no_revenue,
                def_burn_with_revenue,
                line_revenue,
                line_variable,
                line_fixed,
                stale_period_value,
                burn_no_revenue_value,
                burn_with_revenue_value,
                *results,
            ]
        )
        db.commit()

        _auto_update_working_capital_from_results(
            db=db,
            version=version,
            updated_by=user.id,
        )
        db.commit()

        period_rows = (
            db.query(AssumptionValue)
            .filter(
                AssumptionValue.budget_version_id == version.id,
                AssumptionValue.assumption_definition_id == def_working_cap.id,
                AssumptionValue.period_date.isnot(None),
            )
            .order_by(AssumptionValue.period_date)
            .all()
        )
        assert len(period_rows) == 2
        assert period_rows[0].period_date == "2026-08"
        assert period_rows[1].period_date == "2026-09"
        assert period_rows[0].source_type == "derived"
        assert period_rows[1].source_type == "derived"
        assert period_rows[0].value_numeric > 0
        assert period_rows[1].value_numeric == 0.0

        static_row = (
            db.query(AssumptionValue)
            .filter(
                AssumptionValue.budget_version_id == version.id,
                AssumptionValue.assumption_definition_id == def_working_cap.id,
                AssumptionValue.period_date.is_(None),
            )
            .first()
        )
        assert static_row is not None
        assert static_row.value_numeric == period_rows[0].value_numeric
        assert static_row.source_type == "derived"


def test_bulk_upsert_version_values_preserves_other_existing_rows(client_with_data):
    with TestingSessionLocal() as db:
        second_definition = AssumptionDefinition(
            id="def-2",
            business_id="biz-1",
            category_id="cat-1",
            code="receita_extra_teste",
            name="Receita Extra",
            data_type="currency",
            default_value=90.0,
            editable=True,
            periodicity="monthly",
            applies_to="version",
            sort_order=8,
            is_active=True,
            granularity="monthly",
        )
        second_value = AssumptionValue(
            id="val-2",
            budget_version_id="version-1",
            assumption_definition_id="def-2",
            value_numeric=90.0,
            source_type="manual",
            updated_by="user-1",
        )
        db.add_all([second_definition, second_value])
        db.commit()

    response = client_with_data.post(
        "/api/v1/assumptions/values/version-1/bulk",
        json=[
            {
                "assumption_definition_id": "def-1",
                "code": "taxa_limpeza_teste",
                "period_date": None,
                "numeric_value": 250.0,
                "source_type": "manual",
            }
        ],
    )

    assert response.status_code == 200

    with TestingSessionLocal() as db:
        rows = (
            db.query(AssumptionValue)
            .filter(AssumptionValue.budget_version_id == "version-1")
            .order_by(AssumptionValue.assumption_definition_id)
            .all()
        )
        assert len(rows) == 2
        assert rows[0].assumption_definition_id == "def-1"
        assert rows[0].value_numeric == 250.0
        assert rows[1].assumption_definition_id == "def-2"
        assert rows[1].value_numeric == 90.0


def test_ticket_medio_mensal_comes_from_service_plans_and_legacy_tickets_stay_hidden(client_with_data):
    with TestingSessionLocal() as db:
        revenue_category = AssumptionCategory(
            id="cat-receita",
            business_id="biz-1",
            name="Receita",
            code="RECEITA",
            sort_order=2,
        )
        monthly_def = AssumptionDefinition(
            id="def-ticket-monthly",
            business_id="biz-1",
            category_id="cat-receita",
            code="ticket_medio_plano_mensal",
            name="Ticket médio - Plano mensal",
            data_type="currency",
            default_value=199.9,
            editable=True,
            periodicity="static",
            applies_to="version",
            sort_order=10,
            is_active=True,
            granularity="monthly",
        )
        quarterly_def = AssumptionDefinition(
            id="def-ticket-quarterly",
            business_id="biz-1",
            category_id="cat-receita",
            code="ticket_medio_plano_trimestral",
            name="Ticket médio - Plano trimestral (mensal equiv.)",
            data_type="currency",
            default_value=179.9,
            editable=True,
            periodicity="static",
            applies_to="version",
            sort_order=11,
            is_active=True,
            granularity="monthly",
        )
        annual_def = AssumptionDefinition(
            id="def-ticket-annual",
            business_id="biz-1",
            category_id="cat-receita",
            code="ticket_medio_plano_anual",
            name="Ticket médio - Plano anual (mensal equiv.)",
            data_type="currency",
            default_value=159.9,
            editable=True,
            periodicity="static",
            applies_to="version",
            sort_order=12,
            is_active=True,
            granularity="monthly",
        )
        saved_monthly_value = AssumptionValue(
            id="val-ticket-monthly",
            budget_version_id="version-1",
            assumption_definition_id=monthly_def.id,
            value_numeric=199.9,
            source_type="manual",
            updated_by="user-1",
        )
        plans = [
            ServicePlan(
                id="plan-1",
                business_id="biz-1",
                name="Diamante",
                code="DIAMANTE",
                price_per_hour=55.0,
                target_mix_pct=0.25,
                min_classes_month=110,
                max_classes_month=200,
                sort_order=1,
                is_active=True,
            ),
            ServicePlan(
                id="plan-2",
                business_id="biz-1",
                name="Ouro",
                code="OURO",
                price_per_hour=60.0,
                target_mix_pct=0.25,
                min_classes_month=71,
                max_classes_month=110,
                sort_order=2,
                is_active=True,
            ),
            ServicePlan(
                id="plan-3",
                business_id="biz-1",
                name="Prata",
                code="PRATA",
                price_per_hour=65.0,
                target_mix_pct=0.25,
                min_classes_month=41,
                max_classes_month=70,
                sort_order=3,
                is_active=True,
            ),
            ServicePlan(
                id="plan-4",
                business_id="biz-1",
                name="Bronze",
                code="BRONZE",
                price_per_hour=70.0,
                target_mix_pct=0.25,
                min_classes_month=4,
                max_classes_month=40,
                sort_order=4,
                is_active=True,
            ),
        ]
        db.add_all([
            revenue_category,
            monthly_def,
            quarterly_def,
            annual_def,
            saved_monthly_value,
            *plans,
        ])
        db.commit()

    definitions_response = client_with_data.get(
        "/api/v1/assumptions/definitions",
        params={"business_id": "biz-1"},
    )
    assert definitions_response.status_code == 200
    returned_codes = {item["code"] for item in definitions_response.json()}
    assert "ticket_medio_plano_trimestral" not in returned_codes
    assert "ticket_medio_plano_anual" not in returned_codes

    values_response = client_with_data.get("/api/v1/assumptions/values/version-1")
    assert values_response.status_code == 200
    monthly_rows = [
        row for row in values_response.json() if row["code"] == "ticket_medio_plano_mensal"
    ]
    assert monthly_rows
    assert monthly_rows[-1]["numeric_value"] == pytest.approx(62.5)
    assert monthly_rows[-1]["source_type"] == "derived"
