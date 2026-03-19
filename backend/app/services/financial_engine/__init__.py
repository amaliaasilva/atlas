"""
Atlas Finance — Motor Financeiro
Módulo central de cálculo. Lê assumption_values de um BudgetVersion
e produz CalculatedResult para cada line_item em cada período.

Estrutura do Motor:
  FinancialEngine.run(version_id, db) -> List[CalculatedResult]

O motor é completamente desacoplado da UI.
Cada submódulo é testável de forma independente.
"""

from app.services.financial_engine.engine import FinancialEngine
from app.services.financial_engine.models import (
    FinancialInputs,
    FinancialOutputs,
    PeriodResult,
)

__all__ = ["FinancialEngine", "FinancialInputs", "FinancialOutputs", "PeriodResult"]
