"""
add_occupancy_multiplier_to_scenarios

Revision ID: b9e4f2c6d8a0
Revises: a1b2c3d4e5f6
Create Date: 2026-04-02

Adiciona coluna occupancy_multiplier à tabela scenarios.
Valor padrão 1.0 = sem ajuste (comportamento do cenário base).
Cenários agressivos usam, ex: 1.15 (115% da taxa_ocupacao do cenário base).
Cenários conservadores usam, ex: 0.80 (80% da taxa_ocupacao do cenário base).
"""

from alembic import op
import sqlalchemy as sa

revision = "b9e4f2c6d8a0"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scenarios",
        sa.Column(
            "occupancy_multiplier",
            sa.Float(),
            nullable=False,
            server_default="1.0",
        ),
    )


def downgrade() -> None:
    op.drop_column("scenarios", "occupancy_multiplier")
