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
from app.services.financial_engine.financing import (
    get_payment_for_period,
    get_multi_contract_payment,
)
from app.services.financial_engine.kpi import (
    calculate_break_even_students,
    calculate_break_even_revenue,
    calculate_break_even_occupancy_pct,
    calculate_contribution_margin_pct,
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
            result.capacity_hours_month = rev["capacity_hours_month"]
            result.active_hours_month = rev["active_hours_month"]
            result.avg_price_per_hour = rev["avg_price_per_hour"]
            result.occupancy_rate = inp.revenue.occupancy_rate

            # 2. Custos fixos (passa occupancy_rate para modelo misto de utilities)
            occ = inp.revenue.occupancy_rate
            if not inp.is_pre_operational:
                fc = calculate_total_fixed_costs(inp.fixed_costs, occ)
            else:
                # Pré-operacional: apenas aluguel e custos base (ocupação = 0)
                from app.services.financial_engine.models import FixedCostInputs

                pre_op = FixedCostInputs(
                    rent=inp.fixed_costs.rent,
                    condo_fee=inp.fixed_costs.condo_fee,
                    iptu=inp.fixed_costs.iptu,
                )
                fc = calculate_total_fixed_costs(pre_op, 0.0)

            result.total_fixed_costs = fc["total_fixed_costs"]
            result.rent_total = fc["rent_total"]
            result.staff_costs = fc["staff_costs"]
            result.utility_costs = fc["utility_costs"]
            result.admin_costs = fc["admin_costs"]
            result.marketing_costs = fc["marketing_costs"]
            result.equipment_costs = fc["equipment_costs"]
            result.insurance_costs = fc["insurance_costs"]
            result.other_fixed_costs = fc["other_fixed_costs"]

            # 3. Custos variáveis (active_students = horas vendidas no modelo B2B)
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

            # 5. Financiamento — múltiplos contratos ou contrato único
            financing_month_offset += 1
            if inp.financing_contracts:
                fin = get_multi_contract_payment(inp.financing_contracts, financing_month_offset)
            else:
                fin = get_payment_for_period(inp.financing, financing_month_offset)
                fin.setdefault("contracts", [])
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
            result.operating_result = round(result.gross_revenue - result.total_costs, 2)
            result.net_result = round(result.operating_result - result.financing_payment, 2)
            if result.gross_revenue > 0:
                result.net_margin = round(result.net_result / result.gross_revenue, 4)

            # 7. KPIs
            var_pct = (
                result.total_variable_costs / result.gross_revenue
                if result.gross_revenue > 0
                else 0.0
            )
            result.break_even_revenue = calculate_break_even_revenue(
                result.total_fixed_costs, var_pct, inp.taxes.tax_rate_on_revenue
            )
            result.break_even_occupancy_pct = calculate_break_even_occupancy_pct(
                result.break_even_revenue,
                result.capacity_hours_month,
                result.avg_price_per_hour,
            )
            result.contribution_margin_pct = calculate_contribution_margin_pct(
                result.gross_revenue, result.total_variable_costs, result.taxes_on_revenue
            )
            # break_even_students = classes/horas necessárias (compat. legado)
            result.break_even_students = int(
                result.break_even_occupancy_pct * result.capacity_hours_month
                if result.capacity_hours_month > 0
                else calculate_break_even_students(
                    result.total_fixed_costs,
                    result.avg_price_per_hour or 1.0,
                    inp.variable_costs.hygiene_kit_per_student,
                    inp.taxes.tax_rate_on_revenue,
                )
            )
            result.ebitda = calculate_ebitda(result)
            result.burn_rate = calculate_burn_rate(result)

            # 8. Trilha de cálculo auditavel
            result.calculation_trace = {
                "period": inp.period,
                "revenue": {
                    "formula": "capacity_hours × occupancy_rate × avg_price_per_hour + other_revenue",
                    "slots_per_hour": inp.revenue.slots_per_hour,
                    "working_days_month": inp.revenue.working_days_month,
                    "saturdays_month": inp.revenue.saturdays_month,
                    "hours_per_day_weekday": inp.revenue.hours_per_day_weekday,
                    "hours_per_day_saturday": inp.revenue.hours_per_day_saturday,
                    "capacity_hours_month": result.capacity_hours_month,
                    "occupancy_rate": occ,
                    "active_hours_month": result.active_hours_month,
                    "avg_price_per_hour": result.avg_price_per_hour,
                    "service_plans": [
                        {"name": p.name, "price": p.price_per_hour, "mix": p.mix_pct}
                        for p in inp.revenue.service_plans
                    ],
                    "cowork_revenue": rev.get("cowork_revenue", 0.0),
                    "other_revenue": result.other_revenue,
                },
                "fixed_costs": {
                    "rent": result.rent_total,
                    "staff": result.staff_costs,
                    "utilities": result.utility_costs,
                    "admin": result.admin_costs,
                    "marketing": result.marketing_costs,
                    "equipment": result.equipment_costs,
                    "insurance": result.insurance_costs,
                    "other": result.other_fixed_costs,
                    "detail": fc.get("detail", {}),
                },
                "variable_costs": {
                    "hygiene_kit": result.hygiene_kit_cost,
                    "sales_commission": result.sales_commission_cost,
                    "other": result.other_variable_costs,
                },
                "taxes": {
                    "tax_rate": inp.taxes.tax_rate_on_revenue,
                    "taxes_on_revenue": result.taxes_on_revenue,
                },
                "financing": {
                    "total_payment": result.financing_payment,
                    "principal": result.financing_principal,
                    "interest": result.financing_interest,
                    "contracts": fin.get("contracts", []),
                },
                "kpis": {
                    "break_even_revenue": result.break_even_revenue,
                    "break_even_occupancy_pct": result.break_even_occupancy_pct,
                    "contribution_margin_pct": result.contribution_margin_pct,
                    "operating_result": result.operating_result,
                    "net_result": result.net_result,
                    "ebitda": result.ebitda,
                },
            }
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
            annual[year]["burn_rate"] += p.burn_rate
            # Para KPIs de único período, usamos o último mês do ano (dez)
            annual[year]["_last_break_even_revenue"] = p.break_even_revenue
            annual[year]["_last_occupancy_rate"] = p.occupancy_rate
            annual[year]["_last_break_even_occupancy"] = p.break_even_occupancy_pct
            annual[year]["_last_capacity_hours"] = p.capacity_hours_month

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
                "burn_rate": round(data["burn_rate"], 2),
                "net_margin": round(net / rev, 4) if rev > 0 else 0.0,
                "break_even_revenue": round(data["_last_break_even_revenue"], 2),
                "break_even_occupancy_pct": round(data["_last_break_even_occupancy"], 4),
                "occupancy_rate": round(data["_last_occupancy_rate"], 4),
                "capacity_hours_month": round(data["_last_capacity_hours"], 2),
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
            # trace com todos os KPIs — persiste apenas na linha do net_result
            trace = period.calculation_trace
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
                        # trace apenas nas linhas de resultado final
                        calculation_trace=trace if code == "net_result" else None,
                    )
                )

        db.add_all(records)
        db.commit()
