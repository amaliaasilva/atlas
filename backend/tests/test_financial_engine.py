"""
Atlas Finance — Testes Unitários do Motor Financeiro
Execute: cd backend && pytest tests/ -v

Estes testes rodam sem banco de dados — validam apenas a lógica de cálculo.
"""

import pytest
from app.services.financial_engine.revenue import (
    calculate_gross_revenue,
    calculate_active_students,
    calculate_membership_revenue,
)
from app.services.financial_engine.fixed_costs import calculate_total_fixed_costs
from app.services.financial_engine.variable_costs import calculate_total_variable_costs
from app.services.financial_engine.financing import (
    calculate_pmt,
    get_financing_schedule,
)
from app.services.financial_engine.kpi import (
    calculate_break_even_students,
    calculate_burn_rate,
    calculate_payback_months,
)
from app.services.financial_engine.engine import FinancialEngine
from app.services.financial_engine.models import (
    FinancialInputs,
    RevenueInputs,
    FixedCostInputs,
    VariableCostInputs,
    CapexInputs,
    FinancingInputs,
    TaxInputs,
    PeriodResult,
)


# ──────────────────────────────────────────────────────────────────────────────
# Revenue Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestRevenueCalculator:
    def test_active_students_zero_occupancy(self):
        inputs = RevenueInputs(max_students=200, occupancy_rate=0.0)
        assert calculate_active_students(inputs) == 0

    def test_active_students_full_occupancy(self):
        inputs = RevenueInputs(max_students=200, occupancy_rate=1.0)
        assert calculate_active_students(inputs) == 200

    def test_active_students_partial_occupancy(self):
        inputs = RevenueInputs(max_students=200, occupancy_rate=0.45)
        assert calculate_active_students(inputs) == 90

    def test_membership_revenue_all_monthly(self):
        inputs = RevenueInputs(
            max_students=100,
            occupancy_rate=1.0,
            avg_ticket_monthly=200.0,
            mix_monthly_pct=1.0,
            mix_quarterly_pct=0.0,
            mix_annual_pct=0.0,
        )
        rev = calculate_membership_revenue(inputs)
        assert rev == 20000.0

    def test_membership_revenue_mixed_plans(self):
        inputs = RevenueInputs(
            max_students=100,
            occupancy_rate=1.0,
            avg_ticket_monthly=200.0,
            avg_ticket_quarterly=180.0,
            avg_ticket_annual=160.0,
            mix_monthly_pct=0.7,
            mix_quarterly_pct=0.2,
            mix_annual_pct=0.1,
        )
        rev = calculate_membership_revenue(inputs)
        # 70 × 200 + 20 × 180 + 10 × 160 = 14000 + 3600 + 1600 = 19200
        assert rev == 19200.0

    def test_gross_revenue_with_personal(self):
        inputs = RevenueInputs(
            max_students=100,
            occupancy_rate=1.0,
            avg_ticket_monthly=200.0,
            mix_monthly_pct=1.0,
            num_personal_trainers=2,
            avg_personal_revenue_month=3000.0,
        )
        result = calculate_gross_revenue(inputs)
        assert result["gross_revenue"] == 26000.0
        assert result["membership_revenue"] == 20000.0
        assert result["personal_training_revenue"] == 6000.0


# ──────────────────────────────────────────────────────────────────────────────
# Fixed Costs Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestFixedCostsCalculator:
    def test_rent_calculation(self):
        inputs = FixedCostInputs(rent=19000.0, condo_fee=500.0, iptu=200.0)
        result = calculate_total_fixed_costs(inputs)
        assert result["rent_total"] == 19700.0

    def test_staff_costs_with_charges(self):
        inputs = FixedCostInputs(
            pro_labore=5000.0,
            cleaning_staff_salary=1980.0,
            social_charges_rate=0.08,
            num_employees=1,
            benefits_per_employee=500.0,
        )
        result = calculate_total_fixed_costs(inputs)
        gross_payroll = 5000.0 + 1980.0
        charges = gross_payroll * 0.08
        benefits = 1 * 500.0
        expected_staff = gross_payroll + charges + benefits
        assert abs(result["staff_costs"] - expected_staff) < 0.01

    def test_utility_costs(self):
        inputs = FixedCostInputs(
            electricity_kwh=4000.0,
            electricity_rate=0.912,
            water_m3=30.0,
            water_rate=15.2,
            internet_phone=150.0,
        )
        result = calculate_total_fixed_costs(inputs)
        expected = 4000 * 0.912 + 30 * 15.2 + 150.0
        assert abs(result["utility_costs"] - expected) < 0.01


# ──────────────────────────────────────────────────────────────────────────────
# Variable Costs Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestVariableCostsCalculator:
    def test_hygiene_kit(self):
        from app.services.financial_engine.models import VariableCostInputs

        inputs = VariableCostInputs(hygiene_kit_per_student=3.50)
        result = calculate_total_variable_costs(
            inputs, active_students=90, gross_revenue=18000.0
        )
        assert result["hygiene_kit_cost"] == pytest.approx(90 * 3.50)

    def test_sales_commission(self):
        from app.services.financial_engine.models import VariableCostInputs

        inputs = VariableCostInputs(sales_commission_rate=0.05)
        result = calculate_total_variable_costs(
            inputs, active_students=90, gross_revenue=18000.0
        )
        assert result["sales_commission_cost"] == pytest.approx(18000.0 * 0.05)


# ──────────────────────────────────────────────────────────────────────────────
# Financing Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestFinancingCalculator:
    def test_pmt_zero_interest(self):
        pmt = calculate_pmt(60000.0, 0.0, 60)
        assert pmt == 1000.0

    def test_pmt_with_interest(self):
        # Financiamento de R$ 60.000 a 1.5% a.m. por 60 meses
        pmt = calculate_pmt(60000.0, 0.015, 60)
        # Valor esperado aprox. R$ 1.519,80
        assert 1500 < pmt < 1550

    def test_schedule_length(self):
        from app.services.financial_engine.models import FinancingInputs

        inputs = FinancingInputs(
            financed_amount=60000.0, monthly_interest_rate=0.015, term_months=60
        )
        schedule = get_financing_schedule(inputs)
        assert len(schedule) == 60

    def test_schedule_balance_zero_at_end(self):
        from app.services.financial_engine.models import FinancingInputs

        inputs = FinancingInputs(
            financed_amount=60000.0, monthly_interest_rate=0.015, term_months=60
        )
        schedule = get_financing_schedule(inputs)
        assert schedule[-1]["balance"] == pytest.approx(0.0, abs=1.0)

    def test_grace_period(self):
        from app.services.financial_engine.models import FinancingInputs

        inputs = FinancingInputs(
            financed_amount=60000.0,
            monthly_interest_rate=0.015,
            term_months=60,
            grace_period_months=3,
        )
        schedule = get_financing_schedule(inputs)
        # Durante carência, principal é 0
        for i in range(3):
            assert schedule[i]["principal"] == 0.0


# ──────────────────────────────────────────────────────────────────────────────
# KPI Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestKPICalculator:
    def test_break_even_students(self):
        be = calculate_break_even_students(
            total_fixed_costs=44000.0,
            avg_ticket=200.0,
            variable_cost_per_student=3.5,
            tax_rate=0.06,
        )
        # Margem por aluno = 200 * (1-0.06) - 3.5 = 188 - 3.5 = 184.5
        # BE = ceil(44000 / 184.5) ≈ 239
        assert be > 200
        assert be < 300

    def test_burn_rate_positive_result(self):
        result = PeriodResult(period="2026-08", net_result=5000.0)
        assert calculate_burn_rate(result) == 0.0

    def test_burn_rate_negative_result(self):
        result = PeriodResult(period="2026-08", net_result=-15000.0)
        assert calculate_burn_rate(result) == 15000.0

    def test_payback_calculation(self):
        # CAPEX = 10000 → cumulative começa em -10000
        # Mês 1: -10000 + 3000 = -7000
        # Mês 2: -7000 + 3000 = -4000
        # Mês 3: -4000 + 3000 = -1000
        # Mês 4: -1000 + 3000 = +2000 → payback no mês 4
        periods = [
            PeriodResult(period=f"2026-{m:02d}", net_result=3000.0) for m in range(1, 8)
        ]
        payback = calculate_payback_months(10000.0, periods)
        assert payback == 4

    def test_no_payback_in_horizon(self):
        periods = [
            PeriodResult(period=f"2026-{m:02d}", net_result=-1000.0)
            for m in range(1, 13)
        ]
        assert calculate_payback_months(100000.0, periods) is None


# ──────────────────────────────────────────────────────────────────────────────
# Integration: Full Engine Run
# ──────────────────────────────────────────────────────────────────────────────


class TestFinancialEngineIntegration:
    def _make_inputs(self, period: str, occupancy: float) -> FinancialInputs:
        return FinancialInputs(
            period=period,
            revenue=RevenueInputs(
                max_students=200,
                occupancy_rate=occupancy,
                avg_ticket_monthly=199.90,
                mix_monthly_pct=1.0,
                num_personal_trainers=2,
                avg_personal_revenue_month=3000.0,
            ),
            fixed_costs=FixedCostInputs(
                rent=19000.0,
                pro_labore=5000.0,
                cleaning_staff_salary=1980.0,
                social_charges_rate=0.08,
                electricity_kwh=4000.0,
                electricity_rate=0.912,
                water_m3=30.0,
                water_rate=15.2,
                internet_phone=150.0,
                accounting_fees=1800.0,
            ),
            variable_costs=VariableCostInputs(
                hygiene_kit_per_student=3.50,
                sales_commission_rate=0.0,
            ),
            capex=CapexInputs(equipment_value=0.0),
            financing=FinancingInputs(
                financed_amount=60000.0,
                monthly_interest_rate=0.015,
                term_months=60,
            ),
            taxes=TaxInputs(tax_rate_on_revenue=0.06),
        )

    def test_engine_produces_outputs(self):
        engine = FinancialEngine()
        periods_input = [
            self._make_inputs("2026-08", 0.0),
            self._make_inputs("2026-09", 0.0),
            self._make_inputs("2026-10", 0.0),
            self._make_inputs("2026-11", 0.45),
            self._make_inputs("2026-12", 0.55),
        ]
        capex = CapexInputs(equipment_value=300000.0, renovation_works=50000.0)
        outputs = engine.calculate(
            inputs_by_period=periods_input,
            capex=capex,
            budget_version_id="test-version",
            unit_id="test-unit",
            scenario_id="test-scenario",
        )
        assert len(outputs.periods) == 5
        assert outputs.total_capex == 350000.0
        # Primeiros 3 meses sem receita → resultado negativo
        for i in range(3):
            assert outputs.periods[i].gross_revenue == 6000.0  # apenas personal
        # Mês 4 com 45% de ocupação
        p4 = outputs.periods[3]
        assert p4.active_students == 90
        assert p4.gross_revenue > 0

    def test_annual_summary_structure(self):
        engine = FinancialEngine()
        periods_input = [self._make_inputs(f"2026-{m:02d}", 0.5) for m in range(8, 13)]
        periods_input += [self._make_inputs(f"2027-{m:02d}", 0.7) for m in range(1, 13)]
        outputs = engine.calculate(
            inputs_by_period=periods_input,
            capex=CapexInputs(),
            budget_version_id="test",
            unit_id="test",
            scenario_id="test",
        )
        assert "2026" in outputs.annual_summaries
        assert "2027" in outputs.annual_summaries
        assert outputs.annual_summaries["2026"]["months"] == 5
        assert outputs.annual_summaries["2027"]["months"] == 12

    def test_net_margin_calculation(self):
        engine = FinancialEngine()
        periods_input = [self._make_inputs("2027-01", 1.0)]  # 100% ocupação
        outputs = engine.calculate(
            inputs_by_period=periods_input,
            capex=CapexInputs(),
            budget_version_id="test",
            unit_id="test",
            scenario_id="test",
        )
        p = outputs.periods[0]
        if p.gross_revenue > 0:
            expected_margin = p.net_result / p.gross_revenue
            assert abs(p.net_margin - expected_margin) < 0.001
