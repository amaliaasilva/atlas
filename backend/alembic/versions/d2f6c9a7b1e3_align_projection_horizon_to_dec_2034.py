"""
align_projection_horizon_to_dec_2034

Revision ID: d2f6c9a7b1e3
Revises: b9e4f2c6d8a0
Create Date: 2026-04-10

Alinha o horizonte padrão das versões de orçamento para 9 anos
(até dezembro/2034 para cenários iniciados em janeiro/2026) e sincroniza
`effective_end_date` com a janela projetada.
"""

from dateutil.relativedelta import relativedelta
from alembic import op
import sqlalchemy as sa

revision = "d2f6c9a7b1e3"
down_revision = "b9e4f2c6d8a0"
branch_labels = None
depends_on = None


budget_versions = sa.table(
    "budget_versions",
    sa.column("id", sa.String(36)),
    sa.column("effective_start_date", sa.Date()),
    sa.column("effective_end_date", sa.Date()),
    sa.column("projection_horizon_years", sa.Integer()),
)


def _end_date_for_years(start_date, years: int):
    return start_date + relativedelta(months=years * 12) - relativedelta(days=1)


def upgrade() -> None:
    op.alter_column(
        "budget_versions",
        "projection_horizon_years",
        existing_type=sa.Integer(),
        existing_nullable=False,
        server_default="9",
    )

    conn = op.get_bind()
    rows = conn.execute(
        sa.select(
            budget_versions.c.id,
            budget_versions.c.effective_start_date,
            budget_versions.c.projection_horizon_years,
        )
    ).fetchall()

    for row in rows:
        years = 9 if row.projection_horizon_years in (None, 10) else row.projection_horizon_years
        values = {"projection_horizon_years": years}
        if row.effective_start_date:
            values["effective_end_date"] = _end_date_for_years(row.effective_start_date, years)

        conn.execute(
            budget_versions.update()
            .where(budget_versions.c.id == row.id)
            .values(**values)
        )


def downgrade() -> None:
    op.alter_column(
        "budget_versions",
        "projection_horizon_years",
        existing_type=sa.Integer(),
        existing_nullable=False,
        server_default="10",
    )

    conn = op.get_bind()
    rows = conn.execute(
        sa.select(
            budget_versions.c.id,
            budget_versions.c.effective_start_date,
            budget_versions.c.projection_horizon_years,
        )
    ).fetchall()

    for row in rows:
        years = 10 if row.projection_horizon_years in (None, 9) else row.projection_horizon_years
        values = {"projection_horizon_years": years}
        if row.effective_start_date:
            values["effective_end_date"] = _end_date_for_years(row.effective_start_date, years)

        conn.execute(
            budget_versions.update()
            .where(budget_versions.c.id == row.id)
            .values(**values)
        )
