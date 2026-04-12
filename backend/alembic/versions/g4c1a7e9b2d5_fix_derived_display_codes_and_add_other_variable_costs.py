"""fix_derived_display_codes_and_add_other_variable_costs

Revision ID: g4c1a7e9b2d5
Revises: f3b12c4d5e6f
Create Date: 2026-04-12

Duas correções:

1. Marca como include_in_dre=False todos os codes derivados/preview que são
   calculados client-side para exibição no orçamento e NUNCA devem ser lidos
   como inputs pelo motor de cálculo (seriam contados duas vezes).
   Ex: impostos_calculados_mes, custo_taxa_cartao_calculado_mes etc.

2. Insere o line item 'other_variable_costs' (Outros Custos Variáveis) nas
   line_item_definitions de todos os negócios onde já existem as demais linhas
   de custos variáveis, caso ainda não exista. Isso torna visível na DRE
   qualquer custo variável extra vindo de premissas dinâmicas.
"""

from alembic import op
import sqlalchemy as sa
import uuid

revision = "g4c1a7e9b2d5"
down_revision = "f3b12c4d5e6f"
branch_labels = None
depends_on = None

# Todos os codes de premissas derivadas/preview que devem ter include_in_dre=False
DERIVED_DISPLAY_CODES = (
    "impostos_calculados_mes",
    "custo_taxa_cartao_calculado_mes",
    "receita_total_calculada_mes",
    "custo_energia_calculado_mes",
    "custo_agua_calculado_mes",
    "kit_higiene_professor_calculado_mes",
    "taxa_ocupacao_referencia_utilidades",
    "folha_clt_base_calculada",
    "encargos_clt_calculados",
    "folha_clt_total_calculada",
    "capacidade_maxima_mes",
    "capacidade_estimada_aulas_mes",
)


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Marca derived/display codes como include_in_dre=False
    codes_list = ", ".join(f"'{c}'" for c in DERIVED_DISPLAY_CODES)
    conn.execute(
        sa.text(
            f"UPDATE assumption_definitions "
            f"SET include_in_dre = false "
            f"WHERE code IN ({codes_list})"
        )
    )

    # 2. Insere other_variable_costs em todos os negócios que ainda não têm
    # Busca business_ids que já têm line items (evita criar em DBs sem seed)
    existing_businesses = conn.execute(
        sa.text(
            "SELECT DISTINCT business_id FROM line_item_definitions "
            "WHERE business_id IS NOT NULL"
        )
    ).fetchall()

    for row in existing_businesses:
        business_id = row[0]

        # Verifica se já existe
        exists = conn.execute(
            sa.text(
                "SELECT id FROM line_item_definitions "
                "WHERE code = 'other_variable_costs' AND business_id = :bid"
            ),
            {"bid": business_id},
        ).fetchone()

        if exists:
            # Garante que display_order e category estejam corretos
            conn.execute(
                sa.text(
                    "UPDATE line_item_definitions "
                    "SET display_order = 24, "
                    "    category = 'variable_cost', "
                    "    subcategory = 'other_variable', "
                    "    name = 'Outros Custos Variáveis' "
                    "WHERE code = 'other_variable_costs' AND business_id = :bid"
                ),
                {"bid": business_id},
            )
            continue

        new_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO line_item_definitions "
                "(id, business_id, code, name, category, subcategory, "
                " calculation_type, display_order, is_kpi, is_subtotal, "
                " created_at, updated_at) "
                "VALUES "
                "(:id, :bid, 'other_variable_costs', 'Outros Custos Variáveis', "
                " 'variable_cost', 'other_variable', "
                " 'formula', 24, false, false, "
                " NOW(), NOW())"
            ),
            {"id": new_id, "bid": business_id},
        )


def downgrade() -> None:
    conn = op.get_bind()

    # Reverte include_in_dre para True nos derived codes
    # (retorna ao estado anterior — podem causar double-count se ativados)
    codes_list = ", ".join(f"'{c}'" for c in DERIVED_DISPLAY_CODES)
    conn.execute(
        sa.text(
            f"UPDATE assumption_definitions "
            f"SET include_in_dre = true "
            f"WHERE code IN ({codes_list})"
        )
    )

    # Remove o line item criado (apenas os sem CalculatedResult associado)
    conn.execute(
        sa.text(
            "DELETE FROM line_item_definitions "
            "WHERE code = 'other_variable_costs' "
            "AND id NOT IN (SELECT DISTINCT line_item_id FROM calculated_results)"
        )
    )
