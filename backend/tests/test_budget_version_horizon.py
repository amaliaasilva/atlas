from datetime import date, datetime

from app.schemas.budget_version import BudgetVersionCreate, BudgetVersionOut
from app.services.financial_engine.expander import expand_compound_growth, expand_curve
from app.services.financial_engine.utils import generate_horizon_periods


def test_budget_version_create_derives_projection_years_from_horizon_end():
    data = BudgetVersionCreate(
        unit_id="unit-1",
        scenario_id="scenario-1",
        name="Orçamento Base",
        horizon_start="2026-01",
        horizon_end="2034-12",
    )

    assert data.effective_start_date == date(2026, 1, 1)
    assert data.effective_end_date == date(2034, 12, 31)
    assert data.projection_horizon_years == 9


def test_budget_version_out_prefers_explicit_horizon_end():
    version = BudgetVersionOut(
        id="version-1",
        unit_id="unit-1",
        scenario_id="scenario-1",
        version_name="Orçamento Base",
        status="draft",
        effective_start_date=date(2026, 1, 1),
        effective_end_date=date(2034, 12, 31),
        is_active=True,
        projection_horizon_years=10,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )

    assert version.horizon_start == "2026-01"
    assert version.horizon_end == "2034-12"


def test_generate_horizon_periods_honors_explicit_end_date():
    periods = generate_horizon_periods(
        date(2026, 1, 1),
        projection_years=9,
        ending_date=date(2034, 12, 31),
    )

    assert periods[0] == "2026-01"
    assert periods[-1] == "2034-12"
    assert len(periods) == 108


def test_expand_compound_growth_rounds_currency_values_to_cents():
    expanded = expand_compound_growth(
        base_value=500.0,
        annual_rate=0.10,
        base_year=2026,
        periods=["2026-01", "2027-01", "2028-01"],
    )

    assert expanded["2026-01"] == 500.0
    assert expanded["2027-01"] == 550.0
    assert expanded["2028-01"] == 605.0


def test_expand_curve_changes_on_calendar_year_turn():
    periods = ["2026-08", "2026-12", "2027-01", "2027-10", "2028-01"]

    expanded = expand_curve([0.03, 0.12, 0.25], periods, opening_year=2026)

    assert expanded["2026-08"] == 0.03
    assert expanded["2026-12"] == 0.03
    assert expanded["2027-01"] == 0.12
    assert expanded["2027-10"] == 0.12
    assert expanded["2028-01"] == 0.25
