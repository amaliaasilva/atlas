"""add_dre_toggle_and_ui_config

Revision ID: e7a1b4c2d9f0
Revises: d2f6c9a7b1e3
Create Date: 2026-04-11

Adiciona metadados de UI e o toggle de inclusão no DRE para premissas,
permitindo separar linhas só de referência/organização das que realmente
entram no cálculo financeiro.
"""

from alembic import op
import sqlalchemy as sa

revision = "e7a1b4c2d9f0"
down_revision = "d2f6c9a7b1e3"
branch_labels = None
depends_on = None


assumption_definitions = sa.table(
    "assumption_definitions",
    sa.column("id", sa.String(36)),
    sa.column("code", sa.String(100)),
    sa.column("include_in_dre", sa.Boolean()),
)


def upgrade() -> None:
    op.add_column(
        "assumption_definitions",
        sa.Column(
            "include_in_dre",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "assumption_definitions",
        sa.Column("ui_config", sa.JSON(), nullable=True),
    )

    conn = op.get_bind()
    conn.execute(
        assumption_definitions.update()
        .where(
            sa.or_(
                assumption_definitions.c.code.ilike("separador_%"),
                assumption_definitions.c.code.ilike("separator_%"),
            )
        )
        .values(include_in_dre=False)
    )


def downgrade() -> None:
    op.drop_column("assumption_definitions", "ui_config")
    op.drop_column("assumption_definitions", "include_in_dre")
