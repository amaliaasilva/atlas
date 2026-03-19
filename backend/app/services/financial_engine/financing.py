"""
Atlas Finance — Financing Calculator
Calcula prestações de financiamento usando sistema PRICE (PMT).
"""
import math
from app.services.financial_engine.models import FinancingInputs


def calculate_pmt(principal: float, monthly_rate: float, term_months: int) -> float:
    """
    Calcula a prestação fixa de um financiamento (sistema PRICE).
    PMT = PV * [r(1+r)^n] / [(1+r)^n - 1]
    """
    if principal <= 0 or term_months <= 0:
        return 0.0
    if monthly_rate == 0:
        return round(principal / term_months, 2)
    r = monthly_rate
    n = term_months
    pmt = principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    return round(pmt, 2)


def get_financing_schedule(inputs: FinancingInputs) -> list[dict]:
    """
    Retorna cronograma completo de amortização.
    Cada entry: {month, payment, principal, interest, balance}
    """
    if inputs.financed_amount <= 0 or inputs.term_months <= 0:
        return []

    schedule = []
    balance = inputs.financed_amount
    r = inputs.monthly_interest_rate
    n = inputs.term_months
    pmt = calculate_pmt(balance, r, n)

    for month in range(1, n + 1):
        if month <= inputs.grace_period_months:
            # Período de carência: paga apenas juros
            interest = round(balance * r, 2)
            principal_payment = 0.0
            payment = interest
        else:
            interest = round(balance * r, 2)
            principal_payment = round(pmt - interest, 2)
            payment = pmt

        balance = max(0.0, round(balance - principal_payment, 2))
        schedule.append({
            "month": month,
            "payment": round(payment, 2),
            "principal": principal_payment,
            "interest": interest,
            "balance": balance,
        })
    return schedule


def get_payment_for_period(
    inputs: FinancingInputs,
    period_month: int,  # 1-indexed month since loan start
) -> dict:
    """Retorna o pagamento de um período específico."""
    if period_month < 1:
        return {"payment": 0.0, "principal": 0.0, "interest": 0.0}
    schedule = get_financing_schedule(inputs)
    if period_month > len(schedule):
        return {"payment": 0.0, "principal": 0.0, "interest": 0.0}
    entry = schedule[period_month - 1]
    return {
        "payment": entry["payment"],
        "principal": entry["principal"],
        "interest": entry["interest"],
    }
