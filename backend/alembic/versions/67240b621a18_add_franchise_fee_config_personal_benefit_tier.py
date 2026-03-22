"""
add_franchise_fee_config_personal_benefit_tier

Revision ID: 67240b621a18
Revises: 3d0dd2868e94
Create Date: 2026-03-21

Sprint 4 — Features Estratégicas:
  - Nova tabela franchise_fee_configs (split de receita franqueador/franqueado)
  - Nova tabela personal_benefit_tiers (benefícios escalonados de PT por plano)
"""

from alembic import op
import sqlalchemy as sa

revision = "67240b621a18"
down_revision = "3d0dd2868e94"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. franchise_fee_configs ─────────────────────────────────────────────
    op.create_table(
        "franchise_fee_configs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "business_id",
            sa.String(36),
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "platform_fee_pct", sa.Float(), nullable=False, server_default="0.10"
        ),
        sa.Column(
            "referral_commission_pct", sa.Float(), nullable=False, server_default="0.02"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_franchise_fee_configs_business_id", "franchise_fee_configs", ["business_id"]
    )

    # ── 2. personal_benefit_tiers ────────────────────────────────────────────
    op.create_table(
        "personal_benefit_tiers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "service_plan_id",
            sa.String(36),
            sa.ForeignKey("service_plans.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "monthly_kit_value", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column("insurance_value", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column(
            "bonus_pct_on_extra", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_personal_benefit_tiers_service_plan_id",
        "personal_benefit_tiers",
        ["service_plan_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_personal_benefit_tiers_service_plan_id", table_name="personal_benefit_tiers"
    )
    op.drop_table("personal_benefit_tiers")

    op.drop_index(
        "ix_franchise_fee_configs_business_id", table_name="franchise_fee_configs"
    )
    op.drop_table("franchise_fee_configs")
