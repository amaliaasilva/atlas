"""
Atlas Finance — PersonalBenefitTier Model
Benefícios escalonados para Personal Trainers por plano de serviço.
Sprint 4 — Features Estratégicas.
"""

import uuid
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class PersonalBenefitTier(Base, TimestampMixin):
    """
    Tabela de benefícios por tier de horas vendidas (por ServicePlan).

    Cada ServicePlan (Bronze/Prata/Ouro/Diamante) pode ter um tier de benefícios
    associado que define kit mensal, seguro e bônus percentual sobre horas extras.

    Exemplo:
      - monthly_kit_value = 150.0   → kit de materiais R$150/mês
      - insurance_value = 80.0      → seguro contra acidentes R$80/mês
      - bonus_pct_on_extra = 0.05   → 5% sobre receita das horas acima do plano
    """

    __tablename__ = "personal_benefit_tiers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    service_plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("service_plans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Kit mensal de materiais/benefícios fornecido pela plataforma (R$)
    monthly_kit_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Seguro contra acidentes mensais (R$)
    insurance_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Bônus percentual sobre horas vendidas acima do plano contratado
    bonus_pct_on_extra: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    service_plan: Mapped["ServicePlan"] = relationship(
        "ServicePlan", backref="benefit_tier"
    )
