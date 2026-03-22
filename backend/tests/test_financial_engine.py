"""
Atlas Finance — Testes Unitários do Motor Financeiro (Coworking B2B)
Execute: cd backend && pytest tests/ -v

Valida a lógica de cálculo alinhada com o modelo real do Excel (venda de slots/hora).

Dados de referência do Excel:
  - slots_per_hour = 10 vagas
  - dia útil: 05h–22h = 17h  |  sábado: 08h–15h = 7h
  - working_days_month = 22, saturdays_month = 4
  - capacity_hours/mês = (22×17 + 4×7) × 10 = 4.020 h
  - Mix preços: Diamante 65×40% + Ouro 60×30% + Prata 55×20% + Bronze 50×10% = R$60/h
  - Encargos CLT = 80% sobre base CLT; pro_labore EXCLUÍDO
  - Utilidades: modelo misto (fixo + variável × ocupação)
"""

import pytest
from app.services.financial_engine.revenue import (
    calculate_gross_revenue,
    calculate_capacity_hours_month,
    calculate_avg_price_per_hour,
)
from app.services.financial_engine.fixed_costs import (
    calculate_total_fixed_costs,
    calculate_staff_costs,
    calculate_utility_costs,
)
from app.services.financial_engine.variable_costs import calculate_total_variable_costs
from app.services.financial_engine.financing import (
    calculate_pmt,
    get_financing_schedule,
    get_multi_contract_payment,
)
from app.services.financial_engine.kpi import (
    calculate_break_even_revenue,
    calculate_break_even_occupancy_pct,
    calculate_contribution_margin_pct,
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
    FinancingContractInputs,
    ServicePlanMix,
    TaxInputs,
    PeriodResult,
)

# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

ATLAS_PLANS = [
    # GAP-02: Bronze = flexível = maior preço/hora; Diamante = comprometimento máximo = menor preço
    # Mix equalizado em 25% cada. Preço médio = (50+55+60+65)/4 = R$57,50/h
    ServicePlanMix(name="Diamante", price_per_hour=50.0, mix_pct=0.25),
    ServicePlanMix(name="Ouro",     price_per_hour=55.0, mix_pct=0.25),
    ServicePlanMix(name="Prata",    price_per_hour=60.0, mix_pct=0.25),
    ServicePlanMix(name="Bronze",   price_per_hour=65.0, mix_pct=0.25),
]


# ─────────────────────────────────────────────────────────────────────────────
# Revenue Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestRevenueCalculator:
    def test_capacity_hours_month_excel_reference(self):
        """(22×17 + 4×7) × 10 vagas = 4.020 h/mês"""
        inp = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
        )
        assert calculate_capacity_hours_month(inp) == 4020.0

    def test_avg_price_per_hour_excel_reference(self):
        """50×0.25 + 55×0.25 + 60×0.25 + 65×0.25 = R$ 57,50/h (GAP-02 corrigido)"""
        avg = calculate_avg_price_per_hour(ATLAS_PLANS)
        assert avg == pytest.approx(57.5)

    def test_revenue_zero_occupancy(self):
        inp = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
            service_plans=ATLAS_PLANS,
            occupancy_rate=0.0,
        )
        result = calculate_gross_revenue(inp)
        assert result["gross_revenue"] == 0.0
        assert result["capacity_hours_month"] == 4020.0

    def test_revenue_at_25pct_occupancy(self):
        """4020 × 0.25 × 57.50 = R$ 57.787,50 (GAP-02 corrigido)"""
        inp = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
            service_plans=ATLAS_PLANS,
            occupancy_rate=0.25,
        )
        result = calculate_gross_revenue(inp)
        assert result["gross_revenue"] == pytest.approx(57_787.5, rel=1e-3)

    def test_revenue_at_full_occupancy(self):
        """4020 × 1.0 × 57.50 = R$ 231.150 (GAP-02 corrigido)"""
        inp = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
            service_plans=ATLAS_PLANS,
            occupancy_rate=1.0,
        )
        result = calculate_gross_revenue(inp)
        assert result["gross_revenue"] == pytest.approx(231_150.0, rel=1e-3)

    def test_revenue_with_avg_price_direct(self):
        """Sem service_plans, usa avg_price_per_hour diretamente"""
        inp = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
            avg_price_per_hour=57.5,
            occupancy_rate=0.25,
        )
        result = calculate_gross_revenue(inp)
        assert result["gross_revenue"] == pytest.approx(57_787.5, rel=1e-3)

    def test_revenue_legacy_fallback(self):
        """Fallback legado (slots_per_hour=0): usa max_students × ticket"""
        inp = RevenueInputs(
            slots_per_hour=0,
            max_students=200,
            occupancy_rate=0.45,
            avg_ticket_monthly=199.90,
            mix_monthly_pct=1.0,
        )
        result = calculate_gross_revenue(inp)
        assert result["active_students"] == 90
        assert result["gross_revenue"] == pytest.approx(90 * 199.90, rel=1e-3)

    def test_gross_revenue_with_personal_trainer(self):
        """Personal training revenue soma sobre receita legado"""
        inp = RevenueInputs(
            slots_per_hour=0,
            max_students=100,
            occupancy_rate=1.0,
            avg_ticket_monthly=200.0,
            mix_monthly_pct=1.0,
            num_personal_trainers=2,
            avg_personal_revenue_month=3000.0,
        )
        result = calculate_gross_revenue(inp)
        assert result["gross_revenue"] == pytest.approx(26000.0)
        assert result["personal_training_revenue"] == pytest.approx(6000.0)


# ─────────────────────────────────────────────────────────────────────────────
# Fixed Costs Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestFixedCostsCalculator:
    def test_rent_calculation(self):
        inputs = FixedCostInputs(rent=19_000.0, condo_fee=500.0, iptu=200.0)
        result = calculate_total_fixed_costs(inputs)
        assert result["rent_total"] == 19_700.0

    def test_pro_labore_excluded_from_social_charges(self):
        """Pro-labore NÃO incide encargos (GAP-04)."""
        inputs = FixedCostInputs(
            cleaning_staff_salary=1_980.0,
            receptionist_salary=2_200.0,
            pro_labore=5_000.0,
            social_charges_rate=0.80,
            num_employees=2,
            benefits_per_employee=400.0,
        )
        staff = calculate_staff_costs(inputs)
        clt_base = 1_980.0 + 2_200.0
        expected_charges = clt_base * 0.80
        expected_benefits = 2 * 400.0
        assert staff["clt_base"] == pytest.approx(clt_base)
        assert staff["social_charges"] == pytest.approx(expected_charges)
        assert staff["pro_labore"] == pytest.approx(5_000.0)
        total = clt_base + 5_000.0 + expected_charges + expected_benefits
        assert staff["total_staff"] == pytest.approx(total)

    def test_social_charges_not_on_pro_labore(self):
        """Charges = 80% sobre CLT base, não sobre (CLT + pro_labore)."""
        inputs = FixedCostInputs(
            cleaning_staff_salary=4_180.0,
            pro_labore=5_000.0,
        )
        staff = calculate_staff_costs(inputs)
        assert staff["social_charges"] == pytest.approx(4_180.0 * 0.80)
        assert staff["social_charges"] != pytest.approx((4_180.0 + 5_000.0) * 0.80)

    def test_utility_mixed_model_zero_occupancy(self):
        """0% occ: energia = 4200 * 0.80 = 3360 (automação reduz o total, GAP-01)"""
        inputs = FixedCostInputs(
            fixed_energy_cost=4_200.0,
            max_variable_energy_cost=3_000.0,
            automation_reduction=0.20,
            fixed_water_cost=300.0,
            max_variable_water_cost=1_300.0,
            internet_phone=150.0,
        )
        result = calculate_utility_costs(inputs, occupancy_rate=0.0)
        assert result["electricity"] == pytest.approx(3_360.0)
        assert result["water"] == pytest.approx(300.0)
        assert result["total_utilities"] == pytest.approx(3_810.0)

    def test_utility_mixed_model_full_occupancy(self):
        """100% occ: energia = (4200 + 3000) * 0.80 = 5760 (GAP-01 corrigido)"""
        inputs = FixedCostInputs(
            fixed_energy_cost=4_200.0,
            max_variable_energy_cost=3_000.0,
            automation_reduction=0.20,
            fixed_water_cost=300.0,
            max_variable_water_cost=1_300.0,
        )
        result = calculate_utility_costs(inputs, occupancy_rate=1.0)
        assert result["electricity"] == pytest.approx(5_760.0)
        assert result["water"] == pytest.approx(1_600.0)

    def test_utility_mixed_model_25pct(self):
        """25% occ: energia = (4200 + 3000*0.25) * 0.80 = 3960; água = 300 + 325 = 625 (GAP-01)"""
        inputs = FixedCostInputs(
            fixed_energy_cost=4_200.0,
            max_variable_energy_cost=3_000.0,
            automation_reduction=0.20,
            fixed_water_cost=300.0,
            max_variable_water_cost=1_300.0,
        )
        result = calculate_utility_costs(inputs, occupancy_rate=0.25)
        assert result["electricity"] == pytest.approx(3_960.0)
        assert result["water"] == pytest.approx(625.0)

    def test_energy_formula_with_automation(self):
        """Caso de referência da planilha (GAP-01): occ=12%, automation=20%
        Energia = (4200 + 3000 * 0.12) * (1 - 0.20) = 4560 * 0.80 = R$ 3.648"""
        inputs = FixedCostInputs(
            fixed_energy_cost=4_200.0,
            max_variable_energy_cost=3_000.0,
            automation_reduction=0.20,
        )
        result = calculate_utility_costs(inputs, occupancy_rate=0.12)
        assert result["electricity"] == pytest.approx(3_648.0)

    def test_utility_legacy_fallback(self):
        """Sem campos novos: usa kWh × tarifa / m³ × tarifa."""
        inputs = FixedCostInputs(
            electricity_kwh=4_000.0,
            electricity_rate=0.912,
            water_m3=30.0,
            water_rate=15.2,
            internet_phone=150.0,
        )
        result = calculate_utility_costs(inputs, occupancy_rate=0.0)
        assert result["electricity"] == pytest.approx(3_648.0)
        assert result["water"] == pytest.approx(456.0)


# ─────────────────────────────────────────────────────────────────────────────
# Variable Costs Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestVariableCostsCalculator:
    def test_hygiene_kit_per_active_slot(self):
        inputs = VariableCostInputs(hygiene_kit_per_student=3.50)
        result = calculate_total_variable_costs(inputs, active_students=121, gross_revenue=7_236.0)
        assert result["hygiene_kit_cost"] == pytest.approx(121 * 3.50)

    def test_sales_commission_on_revenue(self):
        inputs = VariableCostInputs(sales_commission_rate=0.035)
        result = calculate_total_variable_costs(inputs, active_students=121, gross_revenue=7_236.0)
        assert result["sales_commission_cost"] == pytest.approx(7_236.0 * 0.035)


# ─────────────────────────────────────────────────────────────────────────────
# Financing Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestFinancingCalculator:
    def test_pmt_zero_interest(self):
        """287.951 / 12 = R$ 23.996/mês"""
        pmt = calculate_pmt(287_951.0, 0.0, 12)
        assert pmt == pytest.approx(287_951.0 / 12, rel=1e-4)

    def test_pmt_with_interest(self):
        """Imóvel 1.75M a 1.2% a.m. / 60m → ~R$ 39-42k/mês"""
        pmt = calculate_pmt(1_750_000.0, 0.012, 60)
        assert 38_000 < pmt < 42_000

    def test_schedule_length(self):
        inputs = FinancingInputs(financed_amount=60_000.0, monthly_interest_rate=0.015, term_months=60)
        schedule = get_financing_schedule(inputs)
        assert len(schedule) == 60

    def test_schedule_balance_zero_at_end(self):
        inputs = FinancingInputs(financed_amount=60_000.0, monthly_interest_rate=0.015, term_months=60)
        schedule = get_financing_schedule(inputs)
        assert schedule[-1]["balance"] == pytest.approx(0.0, abs=1.0)

    def test_grace_period_no_principal(self):
        inputs = FinancingInputs(
            financed_amount=60_000.0,
            monthly_interest_rate=0.015,
            term_months=60,
            grace_period_months=3,
        )
        schedule = get_financing_schedule(inputs)
        for i in range(3):
            assert schedule[i]["principal"] == 0.0

    def test_multi_contract_payment_sum(self):
        """Dois contratos: soma dos pagamentos no mês 1."""
        contracts = [
            FinancingContractInputs(
                name="Máquinas", financed_amount=287_951.0, monthly_rate=0.0,
                term_months=12, start_offset_months=0,
            ),
            FinancingContractInputs(
                name="Imóvel", financed_amount=1_750_000.0, monthly_rate=0.012,
                term_months=60, start_offset_months=0,
            ),
        ]
        pay = get_multi_contract_payment(contracts, period_month=1)
        assert pay["payment"] > 60_000
        assert len(pay["contracts"]) == 2

    def test_multi_contract_offset(self):
        """Contrato com start_offset_months=3: meses 1-3 = 0, mês 4+ > 0."""
        contracts = [
            FinancingContractInputs(
                name="Arquiteto", financed_amount=14_000.0, monthly_rate=0.0,
                term_months=3, start_offset_months=3,
            ),
        ]
        for m in range(1, 4):
            pay = get_multi_contract_payment(contracts, period_month=m)
            assert pay["payment"] == 0.0, f"Mês {m} deveria ser 0"
        pay4 = get_multi_contract_payment(contracts, period_month=4)
        assert pay4["payment"] > 0.0

    def test_multi_contract_down_payment(self):
        """Com 20% de entrada, financia apenas 80% do valor."""
        contracts = [
            FinancingContractInputs(
                name="Obra", financed_amount=250_000.0, monthly_rate=0.0,
                term_months=12, down_payment_pct=0.20,
            ),
        ]
        pay = get_multi_contract_payment(contracts, period_month=1)
        expected_pmt = (250_000.0 * 0.80) / 12
        assert pay["payment"] == pytest.approx(expected_pmt, rel=1e-4)


# ─────────────────────────────────────────────────────────────────────────────
# KPI Tests
# ─────────────────────────────────────────────────────────────────────────────


class TestKPICalculator:
    def test_break_even_revenue(self):
        """BE = 35.000 / (1 - 0.035 - 0.06) = 35.000 / 0.905"""
        be = calculate_break_even_revenue(35_000.0, variable_cost_pct=0.035, tax_rate=0.06)
        assert be == pytest.approx(35_000.0 / 0.905, rel=1e-3)

    def test_break_even_occupancy_pct(self):
        """BE_occ = BE_R$ / (capacity × avg_price) ≈ 16%"""
        be_rev = 35_000.0 / 0.905
        be_occ = calculate_break_even_occupancy_pct(be_rev, 4_020.0, 60.0)
        assert 0.15 < be_occ < 0.20

    def test_break_even_occupancy_impossible(self):
        """BE > capacidade máxima → retorna 1.0."""
        be_occ = calculate_break_even_occupancy_pct(999_999.0, 4_020.0, 60.0)
        assert be_occ == 1.0

    def test_contribution_margin_pct(self):
        """(100k - 3.5k - 6k) / 100k = 90.5%"""
        cm = calculate_contribution_margin_pct(100_000.0, 3_500.0, 6_000.0)
        assert cm == pytest.approx(0.905, rel=1e-3)

    def test_contribution_margin_zero_revenue(self):
        cm = calculate_contribution_margin_pct(0.0, 0.0, 0.0)
        assert cm == 0.0

    def test_break_even_students_legacy(self):
        """Compatibilidade com modelo legado."""
        be = calculate_break_even_students(
            total_fixed_costs=44_000.0,
            avg_ticket=200.0,
            variable_cost_per_student=3.5,
            tax_rate=0.06,
        )
        assert 200 < be < 300

    def test_burn_rate_positive(self):
        result = PeriodResult(period="2026-08", net_result=5_000.0)
        assert calculate_burn_rate(result) == 0.0

    def test_burn_rate_negative(self):
        result = PeriodResult(period="2026-08", net_result=-15_000.0)
        assert calculate_burn_rate(result) == 15_000.0

    def test_payback_months(self):
        """CAPEX=10k; +3k/mês → payback no mês 4"""
        periods = [PeriodResult(period=f"2026-{m:02d}", net_result=3_000.0) for m in range(1, 8)]
        assert calculate_payback_months(10_000.0, periods) == 4

    def test_no_payback_in_horizon(self):
        periods = [PeriodResult(period=f"2026-{m:02d}", net_result=-1_000.0) for m in range(1, 13)]
        assert calculate_payback_months(100_000.0, periods) is None

    def test_payback_no_capex(self):
        periods = [PeriodResult(period=f"2026-{m:02d}", net_result=1_000.0) for m in range(1, 6)]
        assert calculate_payback_months(0.0, periods) is None


# ─────────────────────────────────────────────────────────────────────────────
# Integration: Engine com modelo Atlas Coworking B2B
# ─────────────────────────────────────────────────────────────────────────────


class TestFinancialEngineIntegration:
    """Valida o comportamento integrado usando premissas reais do Excel do Atlas."""

    def _make_inputs(self, period: str, occupancy: float) -> FinancialInputs:
        rev = RevenueInputs(
            slots_per_hour=10,
            hours_per_day_weekday=17.0,
            hours_per_day_saturday=7.0,
            working_days_month=22,
            saturdays_month=4,
            occupancy_rate=occupancy,
            service_plans=ATLAS_PLANS,
        )
        fc = FixedCostInputs(
            rent=19_000.0,
            cleaning_staff_salary=1_980.0,
            receptionist_salary=2_200.0,
            pro_labore=5_000.0,
            social_charges_rate=0.80,
            num_employees=2,
            benefits_per_employee=400.0,
            fixed_energy_cost=4_200.0,
            max_variable_energy_cost=3_000.0,
            automation_reduction=0.20,
            fixed_water_cost=300.0,
            max_variable_water_cost=1_300.0,
            internet_phone=150.0,
            accounting_fees=1_800.0,
        )
        return FinancialInputs(
            period=period,
            revenue=rev,
            fixed_costs=fc,
            variable_costs=VariableCostInputs(sales_commission_rate=0.035),
            capex=CapexInputs(),
            financing_contracts=[
                FinancingContractInputs(
                    name="Imóvel", financed_amount=1_750_000.0, monthly_rate=0.012,
                    term_months=60, start_offset_months=0,
                ),
            ],
            taxes=TaxInputs(tax_rate_on_revenue=0.06),
        )

    def test_engine_produces_outputs(self):
        engine = FinancialEngine()
        periods = [
            self._make_inputs("2026-08", 0.03),
            self._make_inputs("2026-09", 0.05),
            self._make_inputs("2026-10", 0.08),
        ]
        capex = CapexInputs(equipment_value=472_410.0, renovation_works=250_000.0)
        outputs = engine.calculate(periods, capex, "bv-001", "unit-001", "sc-001")
        assert outputs.total_capex == 722_410.0
        assert len(outputs.periods) == 3
        assert outputs.annual_summaries != {}

    def test_engine_revenue_at_3pct_occupancy(self):
        """Mês inicial: receita = 4020 × 0.03 × 57.50 = R$ 6.934,50 (GAP-02 corrigido)"""
        engine = FinancialEngine()
        periods = [self._make_inputs("2026-08", 0.03)]
        outputs = engine.calculate(periods, CapexInputs(), "bv-001", "unit-001", "sc-001")
        assert outputs.periods[0].gross_revenue == pytest.approx(6_934.5, rel=1e-2)

    def test_engine_negative_result_early_months(self):
        """Meses iniciais devem ter resultado negativo (custos > receita)."""
        engine = FinancialEngine()
        periods = [self._make_inputs("2026-08", 0.03)]
        outputs = engine.calculate(periods, CapexInputs(), "bv-001", "unit-001", "sc-001")
        assert outputs.periods[0].net_result < 0

    def test_engine_calculation_trace_populated(self):
        """Cada período deve ter calculation_trace com fórmulas usadas."""
        engine = FinancialEngine()
        periods = [self._make_inputs("2026-08", 0.25)]
        outputs = engine.calculate(periods, CapexInputs(), "bv-001", "unit-001", "sc-001")
        trace = outputs.periods[0].calculation_trace
        assert trace["revenue"]["formula"].startswith("capacity_hours")
        assert trace["revenue"]["capacity_hours_month"] == 4020.0
        assert trace["revenue"]["occupancy_rate"] == 0.25
        assert len(trace["revenue"]["service_plans"]) == 4
        assert "kpis" in trace
        assert "financing" in trace

    def test_engine_kpis_populated(self):
        """break_even_revenue, break_even_occupancy_pct, contribution_margin_pct calculados."""
        engine = FinancialEngine()
        periods = [self._make_inputs("2026-08", 0.25)]
        outputs = engine.calculate(periods, CapexInputs(), "bv-001", "unit-001", "sc-001")
        p = outputs.periods[0]
        assert p.break_even_revenue > 0
        assert 0 < p.break_even_occupancy_pct <= 1.0
        assert 0 < p.contribution_margin_pct < 1.0

    def test_engine_utilities_vary_with_occupancy(self):
        """Custos de utilities maiores com 50% ocupação que com 0%."""
        engine = FinancialEngine()
        p0 = engine.calculate(
            [self._make_inputs("2026-08", 0.0)], CapexInputs(), "bv-1", "u-1", "s-1"
        ).periods[0]
        p50 = engine.calculate(
            [self._make_inputs("2026-08", 0.5)], CapexInputs(), "bv-2", "u-1", "s-1"
        ).periods[0]
        assert p50.utility_costs > p0.utility_costs

    def test_engine_multi_contract_trace(self):
        """Dois contratos de financiamento aparecem no calculation_trace."""
        engine = FinancialEngine()
        inps = [self._make_inputs("2026-08", 0.25)]
        inps[0].financing_contracts.append(
            FinancingContractInputs(
                name="Máquinas", financed_amount=287_951.0, monthly_rate=0.0,
                term_months=12, start_offset_months=0,
            )
        )
        outputs = engine.calculate(inps, CapexInputs(), "bv-001", "unit-001", "sc-001")
        trace = outputs.periods[0].calculation_trace
        assert len(trace["financing"]["contracts"]) == 2

    def test_payback_improves_with_occupancy(self):
        """Payback deve ser menor (melhor) com ocupação mais alta."""
        engine = FinancialEngine()
        capex = CapexInputs(equipment_value=472_410.0, renovation_works=250_000.0)

        periods_low = [self._make_inputs(f"2026-{m:02d}", 0.10) for m in range(1, 25)]
        out_low = engine.calculate(periods_low, capex, "bv-l", "u-l", "s-l")

        periods_high = [self._make_inputs(f"2026-{m:02d}", 0.50) for m in range(1, 25)]
        out_high = engine.calculate(periods_high, capex, "bv-h", "u-h", "s-h")

        if out_low.payback_months and out_high.payback_months:
            assert out_high.payback_months <= out_low.payback_months
