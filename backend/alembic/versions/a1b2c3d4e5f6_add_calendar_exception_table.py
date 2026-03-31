"""
add_calendar_exception_table

Revision ID: a1b2c3d4e5f6
Revises: 67240b621a18
Create Date: 2026-03-31

Sprint BE-A: Camada de Calendário (D-01)
  - Nova tabela calendar_exceptions:
    Feriados nacionais/estaduais/municipais e exceções manuais por unidade.
    unit_id=NULL → feriado nacional (aplica a todos).
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "67240b621a18"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calendar_exceptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "unit_id",
            sa.String(36),
            sa.ForeignKey("units.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("exception_date", sa.Date(), nullable=False),
        sa.Column(
            "exception_type",
            sa.Enum(
                "holiday_national",
                "holiday_state",
                "holiday_municipal",
                "manual_close",
                "manual_open",
                name="calendarexceptiontype",
            ),
            nullable=False,
        ),
        sa.Column("description", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(36), nullable=True),
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
        "ix_calendar_exceptions_unit_id",
        "calendar_exceptions",
        ["unit_id"],
    )
    op.create_index(
        "ix_calendar_exceptions_date_unit",
        "calendar_exceptions",
        ["exception_date", "unit_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_calendar_exceptions_date_unit")
    op.drop_index("ix_calendar_exceptions_unit_id")
    op.drop_table("calendar_exceptions")
    op.execute("DROP TYPE IF EXISTS calendarexceptiontype")
