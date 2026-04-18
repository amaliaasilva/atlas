"""rename_hygiene_kit_labels_and_fix_dre_flags

Revision ID: h8d2f5a1c3b7
Revises: g4c1a7e9b2d5
Create Date: 2026-04-16

Três ajustes relacionados ao kit de higiene:

1. Renomeia a premissa 'kit_higiene_por_aluno' para refletir o domínio correto
   (kit por professor diamante ativo, não por aluno final).

2. Renomeia a linha de DRE 'hygiene_kit_cost' pelo mesmo motivo.

3. Corrige flags include_in_dre:
   - kit_higiene_por_aluno → False  (driver interno; entra na DRE via total mensal)
   - kit_higiene_professor_calculado_mes → True  (é o total mensal que vai para a DRE)
"""

from alembic import op
import sqlalchemy as sa

revision = "h8d2f5a1c3b7"
down_revision = "g4c1a7e9b2d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Renomeia premissa unitária (driver interno)
    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET name = :new_name "
            "WHERE code = 'kit_higiene_por_aluno'"
        ),
        {"new_name": "Kit higiene por professor diamante ativo/mês"},
    )

    # 2. Renomeia linha de DRE
    conn.execute(
        sa.text(
            "UPDATE line_item_definitions "
            "SET name = :new_name "
            "WHERE code = 'hygiene_kit_cost'"
        ),
        {"new_name": "Kit Higiene (por professor diamante)"},
    )

    # 3a. Driver interno: sai da DRE (não deve ser somado como custo direto)
    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET include_in_dre = false "
            "WHERE code = 'kit_higiene_por_aluno'"
        )
    )

    # 3b. Total mensal pré-calculado: entra na DRE como custo variável real
    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET include_in_dre = true "
            "WHERE code = 'kit_higiene_professor_calculado_mes'"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET name = :old_name "
            "WHERE code = 'kit_higiene_por_aluno'"
        ),
        {"old_name": "Kit higiene por aluno/mês"},
    )

    conn.execute(
        sa.text(
            "UPDATE line_item_definitions "
            "SET name = :old_name "
            "WHERE code = 'hygiene_kit_cost'"
        ),
        {"old_name": "Kit Higiene (por aluno)"},
    )

    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET include_in_dre = true "
            "WHERE code = 'kit_higiene_por_aluno'"
        )
    )

    conn.execute(
        sa.text(
            "UPDATE assumption_definitions "
            "SET include_in_dre = false "
            "WHERE code = 'kit_higiene_professor_calculado_mes'"
        )
    )
