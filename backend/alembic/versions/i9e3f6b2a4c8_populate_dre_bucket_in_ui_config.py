"""populate_dre_bucket_in_ui_config

Revision ID: i9e3f6b2a4c8
Revises: h8d2f5a1c3b7
Create Date: 2026-04-16

Para cada código de premissa com papel definido no motor financeiro,
grava ui_config->>'dre_bucket' com a linha do DRE correspondente.

Códigos sem mapeamento explícito ficam sem dre_bucket — o engine os roteará
para other_fixed_costs (comportamento anterior preservado).
"""

from alembic import op
import sqlalchemy as sa
import json

revision = "i9e3f6b2a4c8"
down_revision = "h8d2f5a1c3b7"
branch_labels = None
depends_on = None

# Mapeamento código → linha DRE (dre_bucket)
CODE_BUCKET_MAP = {
    # ── Aluguel / Encargos do imóvel ─────────────────────────────────────────
    "aluguel_mensal": "rent_total",
    "condominio_mensal": "rent_total",
    "iptu_mensal": "rent_total",
    # ── Folha de pagamento ────────────────────────────────────────────────────
    "salario_limpeza": "staff_costs",
    "salario_recepcao": "staff_costs",
    "salario_marketing": "staff_costs",
    "salario_comercial": "staff_costs",
    "salario_gerente": "staff_costs",
    "salario_educador_fisico": "staff_costs",
    "pro_labore": "staff_costs",
    "encargos_folha_pct": "staff_costs",
    "beneficios_por_funcionario": "staff_costs",
    "num_funcionarios": "staff_costs",
    # ── Utilidades ────────────────────────────────────────────────────────────
    "custo_energia_fixo": "utility_costs",
    "custo_energia_variavel_max": "utility_costs",
    "automacao_reducao_pct": "utility_costs",
    "kwh_consumo_mensal": "utility_costs",
    "tarifa_kwh": "utility_costs",
    "custo_agua_fixo": "utility_costs",
    "custo_agua_variavel_max": "utility_costs",
    "consumo_agua_m3_mensal": "utility_costs",
    "tarifa_agua_m3": "utility_costs",
    "internet_telefonia_mensal": "utility_costs",
    # ── Adm + Contabilidade ───────────────────────────────────────────────────
    "material_escritorio": "admin_costs",
    "higiene_limpeza_mensal": "admin_costs",
    "sistema_gestao_mensal": "admin_costs",
    "juridico_mensal": "admin_costs",
    "contabilidade_mensal": "admin_costs",
    "servicos_administrativos": "admin_costs",
    # ── Marketing ─────────────────────────────────────────────────────────────
    "marketing_digital_mensal": "marketing_costs",
    "material_identidade_visual": "marketing_costs",
    "material_publicitario": "marketing_costs",
    # ── Equipamentos / Depreciação ────────────────────────────────────────────
    "depreciacao_equipamentos": "equipment_costs",
    "depreciacao_renovacao": "equipment_costs",
    "manutencao_equipamentos": "equipment_costs",
    # ── Seguros ───────────────────────────────────────────────────────────────
    "seguro_imovel": "insurance_costs",
    "seguro_equipamentos": "insurance_costs",
    # ── Outros custos fixos ───────────────────────────────────────────────────
    "sistemas_seguranca": "other_fixed_costs",
    "despesas_financeiras_taxas": "other_fixed_costs",
}


def upgrade() -> None:
    conn = op.get_bind()

    for code, bucket in CODE_BUCKET_MAP.items():
        # Para cada definição com esse code, faz merge do dre_bucket no ui_config JSON.
        # Funciona com ui_config NULL (cria JSON do zero) ou com valor existente.
        conn.execute(
            sa.text(
                """
                UPDATE assumption_definitions
                SET ui_config = CASE
                    WHEN ui_config IS NULL THEN :new_json::jsonb
                    ELSE ui_config || :patch::jsonb
                END
                WHERE code = :code
                """
            ),
            {
                "code": code,
                "new_json": json.dumps({"dre_bucket": bucket}),
                "patch": json.dumps({"dre_bucket": bucket}),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for code in CODE_BUCKET_MAP:
        conn.execute(
            sa.text(
                "UPDATE assumption_definitions "
                "SET ui_config = ui_config - 'dre_bucket' "
                "WHERE code = :code AND ui_config IS NOT NULL"
            ),
            {"code": code},
        )
