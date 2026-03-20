"""
Atlas Finance — Financing Calculator
Calcula prestações usando sistema PRICE (PMT) para um ou múltiplos contratos.
"""

from app.services.financial_engine.models import FinancingInputs, FinancingContractInputs


def calculate_pmt(principal: float, monthly_rate: float, term_months: int) -> float:
    """
    Prestação fixa pelo sistema PRICE.
    PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]
    Se taxa = 0: PMT = PV / n  (parcelamento sem juros)
    """
    if principal <= 0 or term_months <= 0:
        return 0.0
    if monthly_rate == 0:
        return round(principal / term_months, 2)
    r, n = monthly_rate, term_months
    pmt = principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    return round(pmt, 2)


def get_financing_schedule(inputs: FinancingInputs) -> list[dict]:
    """
    Cronograma completo de amortização (PRICE + carência).
    Retorna lista: [{month, payment, principal, interest, balance}]
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
            # Carência: paga apenas juros, saldo não amortiza
            interest = round(balance * r, 2)
            principal_payment = 0.0
            payment = interest
        else:
            interest = round(balance * r, 2)
            principal_payment = round(pmt - interest, 2)
            payment = pmt

        balance = max(0.0, round(balance - principal_payment, 2))
        schedule.append(
            {
                "month": month,
                "payment": round(payment, 2),
                "principal": principal_payment,
                "interest": interest,
                "balance": balance,
            }
        )
    return schedule


def get_payment_for_period(inputs: FinancingInputs, period_month: int) -> dict:
    """Pagamento de um único contrato para o período (1-indexed desde o início do contrato)."""
    if period_month < 1:
        return {"payment": 0.0, "principal": 0.0, "interest": 0.0}
    schedule = get_financing_schedule(inputs)
    if period_month > len(schedule):
        return {"payment": 0.0, "principal": 0.0, "interest": 0.0}
    entry = schedule[period_month - 1]
    return {"payment": entry["payment"], "principal": entry["principal"], "interest": entry["interest"]}


def get_multi_contract_payment(
    contracts: list[FinancingContractInputs],
    period_month: int,  # 1-indexed desde o início do horizonte de projeção
) -> dict:
    """
    Soma os pagamentos de múltiplos contratos de financiamento para um período.

    Cada contrato pode ter start_offset_months diferente (ex: o financiamento
    do imóvel começa no mês 0, mas o de máquinas começa no mês 3).

    Retorna: {payment, principal, interest, contracts: [{name, payment, ...}]}
    """
    total_payment = 0.0
    total_principal = 0.0
    total_interest = 0.0
    contracts_detail = []

    for contract in contracts:
        # Mês relativo ao início deste contrato
        contract_month = period_month - contract.start_offset_months
        if contract_month < 1 or contract.term_months <= 0:
            contracts_detail.append(
                {"name": contract.name, "payment": 0.0, "principal": 0.0, "interest": 0.0}
            )
            continue

        # Desconta entrada
        effective_amount = round(contract.financed_amount * (1.0 - contract.down_payment_pct), 2)
        if effective_amount <= 0:
            contracts_detail.append(
                {"name": contract.name, "payment": 0.0, "principal": 0.0, "interest": 0.0}
            )
            continue

        single = FinancingInputs(
            financed_amount=effective_amount,
            monthly_interest_rate=contract.monthly_rate,
            term_months=contract.term_months,
            grace_period_months=contract.grace_period_months,
        )
        pay = get_payment_for_period(single, contract_month)
        total_payment += pay["payment"]
        total_principal += pay["principal"]
        total_interest += pay["interest"]
        contracts_detail.append(
            {
                "name": contract.name,
                "payment": pay["payment"],
                "principal": pay["principal"],
                "interest": pay["interest"],
            }
        )

    return {
        "payment": round(total_payment, 2),
        "principal": round(total_principal, 2),
        "interest": round(total_interest, 2),
        "contracts": contracts_detail,
    }
