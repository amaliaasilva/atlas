"""
Atlas Finance — FinancingContract Model
Múltiplos contratos de financiamento por BudgetVersion.
Resolve ARCH-02 / GAP-06: o Excel modela 4–5 contratos independentes por unidade.
"""

import uuid
from datetime import date
from sqlalchemy import String, Float, Integer, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class FinancingContract(Base, TimestampMixin):
    """
    Representa um contrato de financiamento individual ligado a uma versão de orçamento.

    Exemplos do Excel (Aba Financiamento — Laboratório):
      - "Máquinas (pesos livres)":   VP R$ 287.951 / 0% a.m. / 12 meses
      - "Máquinas (eq. pesados)":    VP R$ 42.736  / 0% a.m. / 12 meses
      - "Imóvel / Obra (FINAME)":    VP R$ 1.750.000 / 1,2% a.m. / 60 meses
      - "Projeto Arquiteto":          VP R$ 14.000  / 0% a.m. / 3 meses
      - "Branding":                   VP R$ 28.530  / pagamento único (0 parcelas)
    """

    __tablename__ = "financing_contracts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    budget_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("budget_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Identificação
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Termos do contrato
    financed_amount: Mapped[float] = mapped_column(Float, nullable=False)  # VP (Valor Presente)
    monthly_rate: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )  # ex: 0.012 = 1,2% a.m. (0% para FINAME sem juros)
    term_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 = pagamento único
    grace_period_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    down_payment_pct: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )  # % de entrada (ex: 0.20 = 20%)

    # Início do primeiro desembolso/parcela (permite offset em relação à abertura)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    budget_version: Mapped["BudgetVersion"] = relationship(
        "BudgetVersion", back_populates="financing_contracts"
    )
