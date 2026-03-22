"""
refactor_domain_to_coworking_b2b

Revision ID: 3d0dd2868e94
Revises: (initial)
Create Date: 2026-03-20

Alterações baseadas no Schema Validation Report (Gap Analysis Excel vs BD):
  - ARCH-03: Unit.opening_year (int) → opening_date (Date)
  - GAP-01:  Unit + slots_per_hour, hours_open_weekday, hours_open_saturday
  - ARCH-01/04: AssumptionDefinition + granularity, growth_rule
  - ARCH-07: AuditLog + budget_version_id (FK nullable)
  - ARCH-08: BudgetVersion + projection_horizon_years
  - ARCH-06: Nova tabela service_plans (planos Bronze/Prata/Ouro/Diamante)
  - ARCH-02: Nova tabela financing_contracts (múltiplos financiamentos/versão)
"""

from alembic import op
import sqlalchemy as sa

revision = "3d0dd2868e94"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Units: opening_year → opening_date + campos operacionais ──────────
    op.add_column("units", sa.Column("opening_date", sa.Date(), nullable=True))
    op.add_column(
        "units",
        sa.Column("slots_per_hour", sa.Integer(), nullable=False, server_default="10"),
    )
    op.add_column(
        "units",
        sa.Column(
            "hours_open_weekday", sa.Integer(), nullable=False, server_default="17"
        ),
    )
    op.add_column(
        "units",
        sa.Column(
            "hours_open_saturday", sa.Integer(), nullable=False, server_default="7"
        ),
    )

    # Migrar dados existentes: opening_year → opening_date (1º de janeiro do ano)
    op.execute(
        """
        UPDATE units
        SET opening_date = (CAST(opening_year AS TEXT) || '-01-01')::date
        WHERE opening_year IS NOT NULL
        """
    )
    op.drop_column("units", "opening_year")

    # ── 2. AssumptionDefinition: granularity + growth_rule ───────────────────
    op.add_column(
        "assumption_definitions",
        sa.Column(
            "granularity", sa.String(20), nullable=False, server_default="monthly"
        ),
    )
    op.add_column(
        "assumption_definitions",
        sa.Column("growth_rule", sa.JSON(), nullable=True),
    )

    # ── 3. AuditLog: budget_version_id (FK nullable) ─────────────────────────
    op.add_column(
        "audit_logs",
        sa.Column("budget_version_id", sa.String(36), nullable=True),
    )
    op.create_index(
        "ix_audit_logs_budget_version_id", "audit_logs", ["budget_version_id"]
    )
    op.create_foreign_key(
        "fk_audit_logs_budget_version_id",
        "audit_logs",
        "budget_versions",
        ["budget_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ── 4. BudgetVersion: projection_horizon_years ───────────────────────────
    op.add_column(
        "budget_versions",
        sa.Column(
            "projection_horizon_years",
            sa.Integer(),
            nullable=False,
            server_default="10",
        ),
    )

    # ── 5. ServicePlan (nova tabela) ─────────────────────────────────────────
    op.create_table(
        "service_plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "business_id",
            sa.String(36),
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_per_hour", sa.Float(), nullable=False),
        sa.Column("target_mix_pct", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column(
            "min_classes_month", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "max_classes_month", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    # ── 6. FinancingContract (nova tabela) ───────────────────────────────────
    op.create_table(
        "financing_contracts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "budget_version_id",
            sa.String(36),
            sa.ForeignKey("budget_versions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("financed_amount", sa.Float(), nullable=False),
        sa.Column("monthly_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("term_months", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "grace_period_months", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("down_payment_pct", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    # Reverter na ordem inversa

    op.drop_table("financing_contracts")
    op.drop_table("service_plans")

    op.drop_column("budget_versions", "projection_horizon_years")

    op.drop_constraint(
        "fk_audit_logs_budget_version_id", "audit_logs", type_="foreignkey"
    )
    op.drop_index("ix_audit_logs_budget_version_id", table_name="audit_logs")
    op.drop_column("audit_logs", "budget_version_id")

    op.drop_column("assumption_definitions", "growth_rule")
    op.drop_column("assumption_definitions", "granularity")

    # Reverter opening_date → opening_year
    op.add_column("units", sa.Column("opening_year", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE units
        SET opening_year = CAST(SUBSTR(CAST(opening_date AS TEXT), 1, 4) AS INTEGER)
        WHERE opening_date IS NOT NULL
        """
    )
    op.drop_column("units", "opening_date")
    op.drop_column("units", "hours_open_saturday")
    op.drop_column("units", "hours_open_weekday")
    op.drop_column("units", "slots_per_hour")
