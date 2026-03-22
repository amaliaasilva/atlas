"""
Atlas Finance — FranchiseFeeConfig Model
Configuração de split de receita entre plataforma Atlas e franqueado PT.
Sprint 4 — Features Estratégicas.
"""

import uuid
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class FranchiseFeeConfig(Base, TimestampMixin):
    """
    Configuração de taxas da franquia por negócio.

    Exemplo:
      - platform_fee_pct = 0.10  → Atlas retém 10% da receita bruta
      - referral_commission_pct = 0.02 → 2% sobre receita do franqueado
                                         quando PT indica outro candidato

    Cálculo:
      franchisee_revenue   = gross_revenue × (1 - platform_fee_pct)
      platform_revenue     = gross_revenue × platform_fee_pct
      referral_commission  = franchisee_revenue × referral_commission_pct
    """

    __tablename__ = "franchise_fee_configs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Taxa da plataforma Atlas (% da receita bruta)
    platform_fee_pct: Mapped[float] = mapped_column(Float, default=0.10, nullable=False)

    # Comissão de indicação de novo PT (% da receita do franqueado)
    referral_commission_pct: Mapped[float] = mapped_column(Float, default=0.02, nullable=False)

    # Relationships
    business: Mapped["Business"] = relationship("Business", backref="franchise_fee_config")
