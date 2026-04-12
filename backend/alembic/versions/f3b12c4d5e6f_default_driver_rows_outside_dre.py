"""default_driver_rows_outside_dre

Revision ID: f3b12c4d5e6f
Revises: e7a1b4c2d9f0
Create Date: 2026-04-11

Ajusta o default do DRE para que linhas-base/driver (mix de planos,
ocupação, tickets, percentuais e salários-base) comecem fora do DRE,
sem impedir que o usuário as ligue novamente depois pela UI.
"""

from alembic import op
import sqlalchemy as sa

revision = "f3b12c4d5e6f"
down_revision = "e7a1b4c2d9f0"
branch_labels = None
depends_on = None


DRIVER_CODES = (
    "slots_por_hora",
    "horas_dia_util",
    "horas_dia_sabado",
    "dias_uteis_mes",
    "sabados_mes",
    "taxa_ocupacao",
    "preco_medio_hora",
    "ticket_medio_plano_mensal",
    "ticket_medio_plano_trimestral",
    "ticket_medio_plano_anual",
    "mix_plano_mensal_pct",
    "mix_plano_trimestral_pct",
    "mix_plano_anual_pct",
    "mix_diamante_pct",
    "mix_ouro_pct",
    "mix_prata_pct",
    "mix_bronze_pct",
    "beneficios_por_funcionario",
    "num_funcionarios",
    "num_personal_trainers",
    "receita_media_personal_mes",
    "custo_energia_fixo",
    "custo_energia_variavel_max",
    "automacao_reducao_pct",
    "custo_agua_fixo",
    "custo_agua_variavel_max",
    "kwh_consumo_mensal",
    "tarifa_kwh",
    "consumo_agua_m3_mensal",
    "tarifa_agua_m3",
    "encargos_folha_pct",
    "taxa_cartao_pct",
    "aliquota_imposto_receita",
    "capacidade_maxima_mes",
    "capacidade_estimada_aulas_mes",
    "taxa_ocupacao_referencia_utilidades",
    "folha_clt_base_calculada",
    "encargos_clt_calculados",
)


def upgrade() -> None:
    conn = op.get_bind()

    driver_stmt = sa.text(
        "UPDATE assumption_definitions SET include_in_dre = FALSE WHERE code IN :codes"
    ).bindparams(sa.bindparam("codes", expanding=True))
    conn.execute(driver_stmt, {"codes": list(DRIVER_CODES)})

    salary_stmt = sa.text(
        "UPDATE assumption_definitions SET include_in_dre = FALSE WHERE code LIKE 'salario_%'"
    )
    conn.execute(salary_stmt)


def downgrade() -> None:
    conn = op.get_bind()

    driver_stmt = sa.text(
        "UPDATE assumption_definitions SET include_in_dre = TRUE WHERE code IN :codes"
    ).bindparams(sa.bindparam("codes", expanding=True))
    conn.execute(driver_stmt, {"codes": list(DRIVER_CODES)})

    salary_stmt = sa.text(
        "UPDATE assumption_definitions SET include_in_dre = TRUE WHERE code LIKE 'salario_%'"
    )
    conn.execute(salary_stmt)
