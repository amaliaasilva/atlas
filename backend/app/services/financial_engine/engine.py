"""
Atlas Finance — Financial Engine Core
Orquestra os calculadores de receita, custos fixos, variáveis,
impostos e financiamento para produzir resultados por período.
"""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING

from app.services.financial_engine.models import (
    FinancialInputs,
    FinancialOutputs,
    PeriodResult,
    CapexInputs,
)
from app.services.financial_engine.revenue import calculate_gross_revenue
from app.services.financial_engine.fixed_costs import calculate_total_fixed_costs
from app.services.financial_engine.variable_costs import calculate_total_variable_costs
from app.services.financial_engine.financing import get_payment_for_period
from app.services.financial_engine.kpi import (
    calculate_break_even_students,
    calculate_ebitda,
    calculate_burn_rate,
    calculate_payback_months,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class FinancialEngine:
    """
    Motor financeiro do Atlas Finance.

    Uso:
        engine = FinancialEngine()
        outputs = engine.calculate(inputs_list, capex, version_id, unit_id, scenario_id)
        # Opcionalmente persiste os resultados:
        engine.persist(outputs, db)
    """

    def calculate(
        self,
        inputs_by_period: list[FinancialInputs],
        capex: CapexInputs,
        budget_version_id: str,
        unit_id: str,
        scenario_id: str,
        financing_start_month: int = 1,
    ) -> FinancialOutputs:
        """
        Executa o cálculo para todos os períodos de uma versão de orçamento.

        :param inputs_by_period: Lista de FinancialInputs, um por período (mês).
        :param capex: Premissas de CAPEX da unidade (não periódico).
        :param financing_start_month: Mês relativo em que o financiamento começa (1-indexed).
        """
        outputs = FinancialOutputs(
            budget_version_id=budget_version_id,
            unit_id=unit_id,
            scenario_id=scenario_id,
            total_capex=self._sum_capex(capex),
        )

        period_results: list[PeriodResult] = []
        financing_month_offset = 0  # contador de meses desde início do financiamento

        for idx, inp in enumerate(inputs_by_period):
            result = PeriodResult(period=inp.period)

            # 1. Receita
            rev = calculate_gross_revenue(inp.revenue)
            result.gross_revenue = rev["gross_revenue"]
            result.membership_revenue = rev["membership_revenue"]
            result.personal_training_revenue = rev["personal_training_revenue"]
            result.other_revenue = rev["other_revenue"]
            result.active_students = rev["active_students"]
            result.occupancy_rate = inp.revenue.occupancy_rate

            # 2. Custos fixos
            if not inp.is_pre_operational:
                fc = calculate_total_fixed_costs(inp.fixed_costs)
            else:
                # Em pré-operacional, paga aluguel + setup mínimo
                from app.services.financial_engine.models import FixedCostInputs

                pre_op = FixedCostInputs(
                    rent=inp.fixed_costs.rent,
                    condo_fee=inp.fixed_costs.condo_fee,
                    iptu=inp.fixed_costs.iptu,
                )
                fc = calculate_total_fixed_costs(pre_op)

            result.total_fixed_costs = fc["total_fixed_costs"]
            result.rent_total = fc["rent_total"]
            result.staff_costs = fc["staff_costs"]
            result.utility_costs = fc["utility_costs"]
            result.admin_costs = fc["admin_costs"]
            result.marketing_costs = fc["marketing_costs"]
            result.equipment_costs = fc["equipment_costs"]
            result.insurance_costs = fc["insurance_costs"]
            result.other_fixed_costs = fc["other_fixed_costs"]

            # 3. Custos variáveis
            vc = calculate_total_variable_costs(
                inp.variable_costs,
                result.active_students,
                result.gross_revenue,
            )
            result.total_variable_costs = vc["total_variable_costs"]
            result.hygiene_kit_cost = vc["hygiene_kit_cost"]
            result.sales_commission_cost = vc["sales_commission_cost"]
            result.other_variable_costs = vc["other_variable_costs"]

            # 4. Impostos
            result.taxes_on_revenue = round(
                result.gross_revenue * inp.taxes.tax_rate_on_revenue, 2
            )

            # 5. Financiamento
            financing_month_offset += 1
            fin = get_payment_for_period(inp.financing, financing_month_offset)
            result.financing_payment = fin["payment"]
            result.financing_principal = fin["principal"]
            result.financing_interest = fin["interest"]

            # 6. Resultados
            result.total_costs = round(
                result.total_fixed_costs
                + result.total_variable_costs
                + result.taxes_on_revenue,
                2,
            )
            result.operating_result = round(
                result.gross_revenue - result.total_costs, 2
            )
            result.net_result = round(
                result.operating_result - result.financing_payment, 2
            )
            if result.gross_revenue > 0:
                result.net_margin = round(result.net_result / result.gross_revenue, 4)

            # 7. KPIs
            avg_ticket = inp.revenue.avg_ticket_monthly or 1.0
            var_per_student = (
                inp.variable_costs.hygiene_kit_per_student
                + avg_ticket * inp.variable_costs.sales_commission_rate
            )
            result.break_even_students = calculate_break_even_students(
                result.total_fixed_costs,
                avg_ticket,
                var_per_student,
                inp.taxes.tax_rate_on_revenue,
            )
            result.ebitda = calculate_ebitda(result)
            result.burn_rate = calculate_burn_rate(result)

            period_results.append(result)

        outputs.periods = period_results
        outputs.total_revenue_all_periods = round(
            sum(p.gross_revenue for p in period_results), 2
        )
        outputs.total_net_result_all_periods = round(
            sum(p.net_result for p in period_results), 2
        )
        outputs.payback_months = calculate_payback_months(
            outputs.total_capex, period_results
        )
        outputs.annual_summaries = self._build_annual_summaries(period_results)

        return outputs

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _sum_capex(capex: CapexInputs) -> float:
        return round(
            capex.equipment_value
            + capex.renovation_works
            + capex.pre_operational_expenses
            + capex.working_capital
            + capex.furniture_fixtures
            + capex.technology_setup
            + capex.other_capex,
            2,
        )

    @staticmethod
    def _build_annual_summaries(periods: list[PeriodResult]) -> dict:
        """Agrega resultados por ano (YYYY extraído do período YYYY-MM)."""
        annual: dict[str, dict] = defaultdict(lambda: defaultdict(float))
        counters: dict[str, int] = defaultdict(int)

        for p in periods:
            year = p.period[:4]
            counters[year] += 1
            annual[year]["gross_revenue"] += p.gross_revenue
            annual[year]["total_fixed_costs"] += p.total_fixed_costs
            annual[year]["total_variable_costs"] += p.total_variable_costs
            annual[year]["taxes_on_revenue"] += p.taxes_on_revenue
            annual[year]["financing_payment"] += p.financing_payment
            annual[year]["operating_result"] += p.operating_result
            annual[year]["net_result"] += p.net_result
            annual[year]["ebitda"] += p.ebitda

        result = {}
        for year, data in annual.items():
            rev = data["gross_revenue"]
            net = data["net_result"]
            result[year] = {
                "year": year,
                "months": counters[year],
                "gross_revenue": round(rev, 2),
                "total_fixed_costs": round(data["total_fixed_costs"], 2),
                "total_variable_costs": round(data["total_variable_costs"], 2),
                "taxes_on_revenue": round(data["taxes_on_revenue"], 2),
                "financing_payment": round(data["financing_payment"], 2),
                "operating_result": round(data["operating_result"], 2),
                "net_result": round(net, 2),
                "ebitda": round(data["ebitda"], 2),
                "net_margin": round(net / rev, 4) if rev > 0 else 0.0,
            }
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # ORM Integration — persiste resultados no banco
    # ──────────────────────────────────────────────────────────────────────────

    def persist(self, outputs: FinancialOutputs, db: "Session") -> None:
        """
        Persiste os CalculatedResult no banco.
        Apaga resultados anteriores da versão antes de reinserir.
        """
        from app.models.calculated_result import CalculatedResult
        from app.models.line_item import LineItemDefinition

        # Apaga os resultados anteriores para essa versão
        db.query(CalculatedResult).filter(
            CalculatedResult.budget_version_id == outputs.budget_version_id
        ).delete()

        # Mapeia line_item codes para ids
        line_items = (
            db.query(LineItemDefinition)
            .filter(LineItemDefinition.business_id.isnot(None))
            .all()
        )
        code_to_id = {li.code: li.id for li in line_items}

        records = []
        for period in outputs.periods:
            period_data = {
                "revenue_total": period.gross_revenue,
                "membership_revenue": period.membership_revenue,
                "personal_training_revenue": period.personal_training_revenue,
                "other_revenue": period.other_revenue,
                "total_fixed_costs": period.total_fixed_costs,
                "rent_total": period.rent_total,
                "staff_costs": period.staff_costs,
                "utility_costs": period.utility_costs,
                "admin_costs": period.admin_costs,
                "marketing_costs": period.marketing_costs,
                "equipment_costs": period.equipment_costs,
                "insurance_costs": period.insurance_costs,
                "other_fixed_costs": period.other_fixed_costs,
                "total_variable_costs": period.total_variable_costs,
                "hygiene_kit_cost": period.hygiene_kit_cost,
                "sales_commission_cost": period.sales_commission_cost,
                "taxes_on_revenue": period.taxes_on_revenue,
                "financing_payment": period.financing_payment,
                "operating_result": period.operating_result,
                "net_result": period.net_result,
                "ebitda": period.ebitda,
                "break_even_students": float(period.break_even_students),
            }
            for code, value in period_data.items():
                if code not in code_to_id:
                    continue
                records.append(
                    CalculatedResult(
                        budget_version_id=outputs.budget_version_id,
                        unit_id=outputs.unit_id,
                        scenario_id=outputs.scenario_id,
                        line_item_id=code_to_id[code],
                        period_date=period.period,
                        value=float(value),
                        calculation_trace=None,
                    )
                )

        db.add_all(records)
        db.commit()
