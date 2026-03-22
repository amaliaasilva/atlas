"""
Atlas Finance — ServicePlan Model
Planos/categorias de Personal Trainer (Bronze, Prata, Ouro, Diamante).
Resolve ARCH-06 / GAP-02: tabela de produtos do coworking B2B.
"""

import uuid
from sqlalchemy import String, Float, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class ServicePlan(Base, TimestampMixin):
    """
    Representa um plano/categoria de uso do espaço para Personal Trainers.

    Exemplos (dados do Excel):
      - Diamante: R$ 65/hora, meta 40% do mix, 200+ aulas/mês
      - Ouro:     R$ 60/hora, meta 30%, 110–200 aulas/mês
      - Prata:    R$ 55/hora, meta 20%, 41–70 aulas/mês
      - Bronze:   R$ 50/hora, meta 15%, 4–40 aulas/mês

    O preço médio ponderado (ex.: R$ 57,50/hora) é calculado pelo motor
    financeiro como sum(price_per_hour × target_mix_pct).
    """

    __tablename__ = "service_plans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Identificação
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # bronze/prata/ouro/diamante
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Precificação
    price_per_hour: Mapped[float] = mapped_column(Float, nullable=False)  # R$/hora

    # Mix de vendas alvo (soma de todos os planos deve = 1.0)
    target_mix_pct: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)

    # Metas de uso (aulas/mês por PT neste plano)
    min_classes_month: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_classes_month: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship(
        "Business", back_populates="service_plans"
    )
