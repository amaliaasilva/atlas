"""
Atlas Finance — Seeds Iniciais
Popula o banco com:
  - 1 organização
  - 1 negócio (Cowork Gym / Fitness)
  - 8 unidades (Laboratório + Segunda a Oitava)
  - 3 cenários (base, conservador, agressivo)
  - Categorias e definições de premissas
  - Line item definitions
  - Roles
  - 1 usuário admin

Execute: python -m app.seeds.initial_data
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from datetime import date

from app.models.organization import Organization
from app.models.business import Business
from app.models.unit import Unit
from app.models.scenario import Scenario
from app.models.assumption import AssumptionCategory, AssumptionDefinition
from app.models.line_item import LineItemDefinition
from app.models.service_plan import ServicePlan
from app.models.budget_version import BudgetVersion
from app.models.user import User, Role


DRE_DEFAULT_OUTSIDE_CODES = {
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
    # ── Valores derivados/preview (calculados client-side para exibição)  ──
    # NUNCA devem entrar no motor de cálculo como inputs.
    "impostos_calculados_mes",
    "custo_taxa_cartao_calculado_mes",
    "receita_total_calculada_mes",
    "custo_energia_calculado_mes",
    "custo_agua_calculado_mes",
    "kit_higiene_professor_calculado_mes",
    "folha_clt_total_calculada",
}


def _default_include_in_dre(code: str) -> bool:
    return not (code.startswith("salario_") or code in DRE_DEFAULT_OUTSIDE_CODES)


UNITS_DATA = [
    {
        "name": "Laboratório",
        "code": "LAB",
        "opening_date": date(2026, 11, 1),
        "sort_order": 1,
        "city": "São Paulo",
        "state": "SP",
        "status": "pre_opening",  # abertura em nov/2026
    },
    {
        "name": "Segunda Unidade",
        "code": "UNIT02",
        "opening_date": date(2028, 3, 1),
        "sort_order": 2,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Terceira Unidade",
        "code": "UNIT03",
        "opening_date": date(2028, 10, 1),
        "sort_order": 3,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Quarta Unidade",
        "code": "UNIT04",
        "opening_date": date(2029, 3, 1),
        "sort_order": 4,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Quinta Unidade",
        "code": "UNIT05",
        "opening_date": date(2029, 10, 1),
        "sort_order": 5,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Sexta Unidade",
        "code": "UNIT06",
        "opening_date": date(2030, 3, 1),
        "sort_order": 6,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Sétima Unidade",
        "code": "UNIT07",
        "opening_date": date(2030, 10, 1),
        "sort_order": 7,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
    {
        "name": "Oitava Unidade",
        "code": "UNIT08",
        "opening_date": date(2031, 3, 1),
        "sort_order": 8,
        "city": "São Paulo",
        "state": "SP",
        "status": "planning",
    },
]

SERVICE_PLANS_DATA = [
    {
        "name": "Diamante",
        "code": "DIAMANTE",
        "description": "Plano de comprometimento máximo — maior frequência, melhor preço/hora",
        "price_per_hour": 50.0,
        "target_mix_pct": 0.25,
        "min_classes_month": 200,
        "max_classes_month": None,
        "sort_order": 1,
        "is_active": True,
    },
    {
        "name": "Ouro",
        "code": "OURO",
        "description": "Plano intermediário-alto",
        "price_per_hour": 55.0,
        "target_mix_pct": 0.25,
        "min_classes_month": 110,
        "max_classes_month": 200,
        "sort_order": 2,
        "is_active": True,
    },
    {
        "name": "Prata",
        "code": "PRATA",
        "description": "Plano intermediário",
        "price_per_hour": 60.0,
        "target_mix_pct": 0.25,
        "min_classes_month": 41,
        "max_classes_month": 70,
        "sort_order": 3,
        "is_active": True,
    },
    {
        "name": "Bronze",
        "code": "BRONZE",
        "description": "Plano flexível — menor compromisso, maior preço/hora",
        "price_per_hour": 65.0,
        "target_mix_pct": 0.25,
        "min_classes_month": 4,
        "max_classes_month": 40,
        "sort_order": 4,
        "is_active": True,
    },
]

ASSUMPTION_CATEGORIES = [
    {"code": "RECEITA", "name": "Receita", "sort_order": 1},
    {"code": "CUSTO_FIXO", "name": "Custos Fixos", "sort_order": 2},
    {"code": "CUSTO_VARIAVEL", "name": "Custos Variáveis", "sort_order": 3},
    {"code": "CAPEX", "name": "CAPEX / Investimento Inicial", "sort_order": 4},
    {"code": "FINANCIAMENTO", "name": "Financiamento", "sort_order": 5},
    {"code": "FISCAL", "name": "Premissas Fiscais", "sort_order": 6},
    {"code": "OCUPACAO", "name": "Ocupação e Capacidade", "sort_order": 7},
]

ASSUMPTION_DEFINITIONS = {
    "RECEITA": [
        # ── Modelo B2B Coworking (hora/slot) ────────────────────────────────
        (
            "slots_por_hora",
            "Vagas simultâneas por hora (slots/hora)",
            "integer",
            "vagas",
            10,
            True,
            "static",
            "Quantidade máxima de atendimentos simultâneos que cabem em cada hora de operação.",
        ),
        (
            "horas_dia_util",
            "Horas de funcionamento por dia útil",
            "numeric",
            "horas",
            17.0,
            True,
            "static",
            "Janela operacional de segunda a sexta usada no cálculo da capacidade mensal.",
        ),
        (
            "horas_dia_sabado",
            "Horas de funcionamento por sábado",
            "numeric",
            "horas",
            7.0,
            True,
            "static",
            "Janela operacional de sábado usada no cálculo da capacidade mensal.",
        ),
        (
            "dias_uteis_mes",
            "Dias úteis por mês",
            "integer",
            "dias",
            22,
            True,
            "static",
            "Base de dias úteis considerada para pré-calcular a capacidade máxima do mês.",
        ),
        (
            "sabados_mes",
            "Sábados por mês",
            "integer",
            "dias",
            4,
            True,
            "static",
            "Quantidade de sábados operados no mês usada na fórmula da capacidade.",
        ),
        (
            "capacidade_maxima_mes",
            "Capacidade máxima de aulas por mês",
            "numeric",
            "h/mês",
            4020.0,
            False,
            "monthly",
            "Capacidade máxima de aulas por mês = (dias úteis × horas/dia útil + sábados × horas/dia sábado) × slots por hora. O valor é informativo e é recalculado automaticamente a partir das premissas operacionais.",
        ),
        (
            "preco_medio_hora",
            "Preço médio ponderado por hora (R$/h)",
            "currency",
            "R$/h",
            57.50,
            True,
            "static",
        ),
        # ── Mix de planos por categoria ──────────────────────────────────────
        (
            "mix_diamante_pct",
            "Mix plano Diamante (R$50/h) — % do total",
            "percentage",
            "%",
            0.25,
            True,
            "static",
        ),
        (
            "mix_ouro_pct",
            "Mix plano Ouro (R$55/h) — % do total",
            "percentage",
            "%",
            0.25,
            True,
            "static",
        ),
        (
            "mix_prata_pct",
            "Mix plano Prata (R$60/h) — % do total",
            "percentage",
            "%",
            0.25,
            True,
            "static",
        ),
        (
            "mix_bronze_pct",
            "Mix plano Bronze (R$65/h) — % do total",
            "percentage",
            "%",
            0.25,
            True,
            "static",
        ),
        (
            "taxa_ocupacao",
            "Taxa de ocupação mensal",
            "percentage",
            "%",
            0.0,
            True,
            "monthly",
            # ETAPA-2: curva de ocupação padrão — 10 anos
            {
                "type": "curve",
                "values": [0.03, 0.12, 0.25, 0.40, 0.50, 0.60, 0.70, 0.75, 0.75, 0.75],
            },
        ),
        (
            "ticket_medio_plano_mensal",
            "Ticket médio - Plano mensal",
            "currency",
            "R$",
            199.90,
            True,
            "static",
        ),
        (
            "ticket_medio_plano_trimestral",
            "Ticket médio - Plano trimestral (mensal equiv.)",
            "currency",
            "R$",
            179.90,
            True,
            "static",
        ),
        (
            "ticket_medio_plano_anual",
            "Ticket médio - Plano anual (mensal equiv.)",
            "currency",
            "R$",
            159.90,
            True,
            "static",
        ),
        (
            "mix_plano_mensal_pct",
            "Mix de planos - % Mensal",
            "percentage",
            "%",
            0.7,
            True,
            "static",
        ),
        (
            "mix_plano_trimestral_pct",
            "Mix de planos - % Trimestral",
            "percentage",
            "%",
            0.2,
            True,
            "static",
        ),
        (
            "mix_plano_anual_pct",
            "Mix de planos - % Anual",
            "percentage",
            "%",
            0.1,
            True,
            "static",
        ),
        (
            "num_personal_trainers",
            "Número de Personal Trainers",
            "integer",
            "pessoas",
            2,
            True,
            "static",
        ),
        (
            "receita_media_personal_mes",
            "Receita média por Personal/mês",
            "currency",
            "R$",
            3000.0,
            True,
            "static",
        ),
        (
            "outras_receitas",
            "Outras receitas mensais",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
    ],
    "CUSTO_FIXO": [
        (
            "aluguel_mensal",
            "Aluguel mensal",
            "currency",
            "R$",
            19000.0,
            True,
            "monthly",
            # ETAPA-2: reajuste de 10% ao ano (IGP-M estimado)
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "condominio_mensal",
            "Condomínio mensal",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        ("iptu_mensal", "IPTU mensal", "currency", "R$", 0.0, True, "monthly"),
        (
            "salario_limpeza",
            "Salário - Limpeza",
            "currency",
            "R$",
            1980.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "salario_recepcao",
            "Salário - Recepção",
            "currency",
            "R$",
            2200.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "salario_marketing",
            "Salário - Marketing",
            "currency",
            "R$",
            0.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "salario_comercial",
            "Salário - Comercial",
            "currency",
            "R$",
            0.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "salario_gerente",
            "Salário - Gerente",
            "currency",
            "R$",
            0.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "salario_educador_fisico",
            "Salário - Educador Físico",
            "currency",
            "R$",
            0.0,
            True,
            "static",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "pro_labore",
            "Pró-labore",
            "currency",
            "R$",
            5000.0,
            True,
            "static",
            {
                "type": "curve",
                "values": [5000, 5000, 5500, 5500, 6000, 6000, 6600, 6600, 7000, 7000],
            },
        ),
        (
            "encargos_folha_pct",
            "Encargos sobre folha CLT (% — inclui INSS+FGTS+férias+13°)",
            "percentage",
            "%",
            0.80,
            True,
            "static",
        ),
        (
            "beneficios_por_funcionario",
            "Benefícios por funcionário (VT+VR)",
            "currency",
            "R$",
            0.0,
            True,
            "static",
        ),
        (
            "num_funcionarios",
            "Número de funcionários CLT",
            "integer",
            "pessoas",
            2,
            True,
            "static",
        ),
        # ── Energia: modelo misto (fixo + variável × ocupação) (GAP-03) ────
        (
            "custo_energia_fixo",
            "Energia elétrica — parcela fixa (R$/mês)",
            "currency",
            "R$",
            4200.0,
            True,
            "monthly",
        ),
        (
            "custo_energia_variavel_max",
            "Energia elétrica — máximo variável a 100% ocup. (R$/mês)",
            "currency",
            "R$",
            3000.0,
            True,
            "static",
        ),
        (
            "automacao_reducao_pct",
            "Redução por automação de A/C (% do total)",
            "percentage",
            "%",
            0.20,
            True,
            "static",
        ),
        (
            "custo_energia_calculado_mes",
            "Energia elétrica — total estimado (pré-calculado)",
            "currency",
            "R$/mês",
            0.0,
            False,
            "monthly",
            "Energia estimada = (parcela fixa + máximo variável a 100% ocupação × taxa de ocupação) × (1 − redução por automação de A/C). Valor informativo e recalculado automaticamente.",
        ),
        # ── Água: modelo misto (fixo + variável × ocupação) ──────────────────
        (
            "custo_agua_fixo",
            "Água — parcela fixa (R$/mês)",
            "currency",
            "R$",
            300.0,
            True,
            "monthly",
        ),
        (
            "custo_agua_variavel_max",
            "Água — máximo variável a 100% ocup. (R$/mês)",
            "currency",
            "R$",
            1300.0,
            True,
            "static",
        ),
        (
            "custo_agua_calculado_mes",
            "Água — total estimado (pré-calculado)",
            "currency",
            "R$/mês",
            0.0,
            False,
            "monthly",
            "Água estimada = parcela fixa + (máximo variável a 100% ocupação × taxa de ocupação). Valor informativo e recalculado automaticamente.",
        ),
        # ── Legado (mantido para compatibilidade) ────────────────────────────
        (
            "kwh_consumo_mensal",
            "Consumo de energia (kWh/mês) — legado",
            "numeric",
            "kWh",
            4000.0,
            False,
            "monthly",
        ),
        (
            "tarifa_kwh",
            "Tarifa de energia (R$/kWh) — legado",
            "currency",
            "R$/kWh",
            0.912,
            False,
            "static",
        ),
        (
            "consumo_agua_m3_mensal",
            "Consumo de água (m³/mês) — legado",
            "numeric",
            "m³",
            30.0,
            False,
            "monthly",
        ),
        (
            "tarifa_agua_m3",
            "Tarifa de água (R$/m³) — legado",
            "currency",
            "R$/m³",
            15.2,
            False,
            "static",
        ),
        (
            "internet_telefonia_mensal",
            "Internet + Telefonia",
            "currency",
            "R$",
            150.0,
            True,
            "monthly",
        ),
        (
            "material_escritorio",
            "Material de escritório",
            "currency",
            "R$",
            100.0,
            True,
            "monthly",
        ),
        (
            "higiene_limpeza_mensal",
            "Higiene e limpeza (fixo)",
            "currency",
            "R$",
            500.0,
            True,
            "monthly",
        ),
        (
            "sistema_gestao_mensal",
            "Software de gestão",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        (
            "juridico_mensal",
            "Honorários jurídicos",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        (
            "contabilidade_mensal",
            "Contabilidade",
            "currency",
            "R$",
            1800.0,
            True,
            "monthly",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "servicos_administrativos",
            "Serviços administrativos",
            "currency",
            "R$",
            1000.0,
            True,
            "monthly",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "seguro_imovel",
            "Seguro do imóvel",
            "currency",
            "R$",
            1000.0,
            True,
            "monthly",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "seguro_equipamentos",
            "Seguro de equipamentos",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        (
            "marketing_digital_mensal",
            "Marketing digital",
            "currency",
            "R$",
            3000.0,
            True,
            "monthly",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "material_identidade_visual",
            "Material identidade visual",
            "currency",
            "R$",
            2000.0,
            True,
            "one_time",
        ),
        (
            "material_publicitario",
            "Material publicitário",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        (
            "depreciacao_equipamentos",
            "Depreciação de equipamentos",
            "currency",
            "R$",
            0.0,
            False,
            "monthly",
        ),
        (
            "manutencao_equipamentos",
            "Manutenção preventiva de equipamentos",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
        (
            "sistemas_seguranca",
            "Sistemas de segurança e controle",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
            {"type": "compound_growth", "rate": 0.10},
        ),
        (
            "despesas_financeiras_taxas",
            "Taxas e despesas financeiras",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
    ],
    "CUSTO_VARIAVEL": [
        (
            "kit_higiene_por_aluno",
            "Kit higiene por aluno/mês",
            "currency",
            "R$",
            3.5,
            True,
            "static",
        ),
        (
            "comissao_vendas_pct",
            "Comissão de vendas (% da receita)",
            "percentage",
            "%",
            0.0,
            True,
            "static",
        ),
        (
            "outros_custos_variaveis",
            "Outros custos variáveis",
            "currency",
            "R$",
            0.0,
            True,
            "monthly",
        ),
    ],
    "CAPEX": [
        (
            "valor_equipamentos",
            "Valor de equipamentos",
            "currency",
            "R$",
            472410.26,
            True,
            "one_time",
        ),
        (
            "custo_obras_adaptacoes",
            "Custo de obras e adaptações",
            "currency",
            "R$",
            250000.0,
            True,
            "one_time",
        ),
        (
            "despesas_preoperacionais",
            "Despesas pré-operacionais",
            "currency",
            "R$",
            0.0,
            True,
            "one_time",
        ),
        (
            "capital_giro_inicial",
            "Capital de giro inicial",
            "currency",
            "R$",
            342004.95,
            False,
            "one_time",
        ),
        (
            "moveis_e_fixtures",
            "Móveis e instalações",
            "currency",
            "R$",
            0.0,
            True,
            "one_time",
        ),
        (
            "tecnologia_setup",
            "Setup de tecnologia",
            "currency",
            "R$",
            0.0,
            True,
            "one_time",
        ),
        ("outros_capex", "Outros CAPEX", "currency", "R$", 0.0, True, "one_time"),
        # GAP-05: itens faltantes versus planilha
        (
            "honorarios_arquiteto",
            "Honorários de arquiteto",
            "currency",
            "R$",
            28000.0,
            True,
            "one_time",
        ),
        (
            "automacao_ac",
            "Automação de A/C",
            "currency",
            "R$",
            20000.0,
            True,
            "one_time",
        ),
        (
            "branding_identidade_visual",
            "Branding / Identidade visual",
            "currency",
            "R$",
            28530.25,
            True,
            "one_time",
        ),
        (
            "vida_util_equipamentos_meses",
            "Vida útil dos equipamentos (meses)",
            "integer",
            "meses",
            60,
            True,
            "static",
        ),
        (
            "vida_util_reforma_meses",
            "Vida útil da reforma (meses)",
            "integer",
            "meses",
            120,
            True,
            "static",
        ),
    ],
    "FINANCIAMENTO": [
        ("valor_financiado", "Valor financiado", "currency", "R$", 0.0, True, "static"),
        (
            "taxa_juros_mensal",
            "Taxa de juros mensal",
            "percentage",
            "%",
            0.015,
            True,
            "static",
        ),
        (
            "prazo_meses",
            "Prazo do financiamento (meses)",
            "integer",
            "meses",
            60,
            True,
            "static",
        ),
        ("carencia_meses", "Carência (meses)", "integer", "meses", 0, True, "static"),
    ],
    "FISCAL": [
        (
            "aliquota_imposto_receita",
            "Alíquota de imposto sobre receita",
            "percentage",
            "%",
            0.06,
            True,
            "static",
            {"type": "curve", "values": [0.06, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633]},
            "Imposto aplicado sobre a receita. Ano 1 = 6%; do ano 2 em diante = 16,33% por padrão.",
        ),
        (
            "taxa_cartao_pct",
            "Taxa adquirente de cartão de crédito (% da receita)",
            "percentage",
            "%",
            0.035,
            True,
            "static",
            "Percentual aplicado sobre a receita total estimada. O valor em R$/mês aparece na linha pré-calculada logo abaixo.",
        ),
        (
            "custo_taxa_cartao_calculado_mes",
            "Taxa de cartão — custo estimado (pré-calculado)",
            "currency",
            "R$/mês",
            0.0,
            False,
            "monthly",
            "Taxa de cartão estimada = receita total estimada × taxa de cartão (% da receita). Valor informativo e recalculado automaticamente.",
        ),
        (
            "impostos_calculados_mes",
            "Impostos — total estimado (pré-calculado)",
            "currency",
            "R$/mês",
            0.0,
            False,
            "monthly",
            "Impostos estimados = receita total estimada × alíquota de imposto sobre receita. Valor informativo e recalculado automaticamente.",
        ),
    ],
    "OCUPACAO": [
        # Placeholder — a taxa de ocupação mensal continua em RECEITA.
    ],
}

LINE_ITEM_DEFINITIONS = [
    # Receita
    ("revenue_total", "Receita Total", "revenue", None, 0, True, True, False),
    (
        "membership_revenue",
        "Receita de Mensalidades",
        "revenue",
        "memberships",
        1,
        False,
        False,
        False,
    ),
    (
        "personal_training_revenue",
        "Receita de Personal Training",
        "revenue",
        "personal",
        2,
        False,
        False,
        False,
    ),
    ("other_revenue", "Outras Receitas", "revenue", "other", 3, False, False, False),
    # Custos fixos
    (
        "total_fixed_costs",
        "Total Custos Fixos",
        "fixed_cost",
        None,
        10,
        True,
        True,
        False,
    ),
    (
        "rent_total",
        "Aluguel + Condomínio + IPTU",
        "occupancy",
        "rent",
        11,
        False,
        False,
        False,
    ),
    (
        "staff_costs",
        "Pessoal (Folha + Encargos + Benefícios)",
        "staffing",
        "payroll",
        12,
        False,
        False,
        False,
    ),
    (
        "utility_costs",
        "Utilidades (Energia + Água + Telecom)",
        "utility",
        "utilities",
        13,
        False,
        False,
        False,
    ),
    (
        "admin_costs",
        "Despesas Administrativas",
        "fixed_cost",
        "admin",
        14,
        False,
        False,
        False,
    ),
    (
        "marketing_costs",
        "Marketing e Publicidade",
        "fixed_cost",
        "marketing",
        15,
        False,
        False,
        False,
    ),
    (
        "equipment_costs",
        "Equipamentos (Depreciação + Manutenção)",
        "fixed_cost",
        "equipment",
        16,
        False,
        False,
        False,
    ),
    ("insurance_costs", "Seguros", "fixed_cost", "insurance", 17, False, False, False),
    (
        "other_fixed_costs",
        "Outros Custos Fixos",
        "fixed_cost",
        "other_fixed",
        18,
        False,
        False,
        False,
    ),
    # Custos variáveis
    (
        "total_variable_costs",
        "Total Custos Variáveis",
        "variable_cost",
        None,
        20,
        True,
        True,
        False,
    ),
    (
        "hygiene_kit_cost",
        "Kit Higiene (por aluno)",
        "variable_cost",
        "hygiene",
        21,
        False,
        False,
        False,
    ),
    (
        "sales_commission_cost",
        "Comissões de Vendas",
        "variable_cost",
        "commission",
        22,
        False,
        False,
        False,
    ),
    (
        "card_fee_cost",
        "Taxa de Cartão de Crédito (3,5%)",
        "variable_cost",
        "card_fee",
        23,
        False,
        False,
        False,
    ),
    (
        "other_variable_costs",
        "Outros Custos Variáveis",
        "variable_cost",
        "other_variable",
        24,
        False,
        False,
        False,
    ),
    # Professores necessários — Break-even (GAP-06)
    (
        "teachers_needed_pessimistic",
        "Professores Necessários (Pessimista — 1 aluno/prof)",
        "operational",
        "teachers",
        24,
        False,
        False,
        False,
    ),
    (
        "teachers_needed_medium",
        "Professores Necessários (Médio — 1,5 alunos/prof)",
        "operational",
        "teachers",
        25,
        False,
        False,
        False,
    ),
    (
        "teachers_needed_optimistic",
        "Professores Necessários (Otimista — 2 alunos/prof)",
        "operational",
        "teachers",
        26,
        False,
        False,
        False,
    ),
    # Impostos
    (
        "taxes_on_revenue",
        "Impostos sobre Vendas (Presumido)",
        "tax",
        None,
        30,
        True,
        False,
        False,
    ),
    # Financiamento
    (
        "financing_payment",
        "Parcela do Financiamento",
        "financing",
        None,
        40,
        False,
        False,
        False,
    ),
    # Resultados
    (
        "operating_result",
        "Resultado Operacional",
        "result",
        None,
        50,
        True,
        True,
        False,
    ),
    ("net_result", "Resultado Líquido", "result", None, 51, True, True, False),
    ("ebitda", "EBITDA", "result", None, 52, True, True, False),
    # KPIs derivados
    (
        "break_even_students",
        "Ponto de Equilíbrio (horas/alunos)",
        "result",
        "kpi",
        60,
        True,
        True,
        False,
    ),
    # ── KPIs B2B Coworking ────────────────────────────────────────────────────
    ("occupancy_rate", "Taxa de Ocupação (%)", "result", "kpi", 61, True, False, True),
    (
        "capacity_hours_month",
        "Capacidade (horas/mês)",
        "result",
        "kpi",
        62,
        False,
        False,
        False,
    ),
    (
        "active_hours_month",
        "Horas Vendidas (horas/mês)",
        "result",
        "kpi",
        63,
        False,
        False,
        False,
    ),
    (
        "break_even_revenue",
        "Break-even Receita (R$)",
        "result",
        "kpi",
        64,
        True,
        True,
        False,
    ),
    (
        "break_even_occupancy_pct",
        "Break-even Ocupação (%)",
        "result",
        "kpi",
        65,
        True,
        False,
        True,
    ),
    (
        "contribution_margin_pct",
        "Margem de Contribuição (%)",
        "result",
        "kpi",
        66,
        True,
        False,
        True,
    ),
    ("net_margin", "Margem Líquida (%)", "result", "kpi", 67, True, False, True),
    (
        "active_students",
        "Slots Ativos / Horas Vendidas (int)",
        "result",
        "kpi",
        68,
        False,
        False,
        False,
    ),
    # Sub-itens de staff (GAP-08)
    ("fc_pro_labore", "Pró-labore", "fixed_cost", "payroll", 120, False, False, False),
    (
        "fc_clt_base",
        "Folha CLT (base s/encargos)",
        "fixed_cost",
        "payroll",
        121,
        False,
        False,
        False,
    ),
    (
        "fc_social_charges",
        "Encargos Sociais CLT (~80%)",
        "fixed_cost",
        "payroll",
        122,
        False,
        False,
        False,
    ),
    # Sub-itens de utilities (GAP-08)
    (
        "fc_electricity",
        "Energia Elétrica",
        "fixed_cost",
        "utility",
        123,
        False,
        False,
        False,
    ),
    ("fc_water", "Água e Esgoto", "fixed_cost", "utility", 124, False, False, False),
    (
        "fc_internet",
        "Internet + Telefonia",
        "fixed_cost",
        "utility",
        125,
        False,
        False,
        False,
    ),
    # D-04: três variantes de preço médio/hora
    (
        "avg_price_per_hour_sold",
        "Preço Médio / Hora Vendida (R$)",
        "result",
        "kpi",
        130,
        False,
        False,
        False,
    ),
    (
        "avg_price_per_hour_occupied",
        "Receita / Hora Ocupada (R$)",
        "result",
        "kpi",
        131,
        False,
        False,
        False,
    ),
    (
        "avg_price_per_hour_available",
        "Receita / Hora Disponível (R$)",
        "result",
        "kpi",
        132,
        False,
        False,
        False,
    ),
]


def run_seeds(db: Session):
    print("=== Atlas Finance — Iniciando seeds ===\n")

    # 1. Roles
    roles_data = [
        ("super_admin", "Super Administrador"),
        ("org_admin", "Administrador da Organização"),
        ("business_manager", "Gestor de Negócio"),
        ("analyst", "Analista"),
        ("viewer", "Visualizador"),
    ]
    role_map = {}
    for code, name in roles_data:
        existing = db.query(Role).filter(Role.code == code).first()
        if not existing:
            role = Role(id=str(uuid.uuid4()), code=code, name=name)
            db.add(role)
            role_map[code] = role
        else:
            role_map[code] = existing
    db.commit()
    print(f"  ✓ {len(roles_data)} roles criados/verificados")

    # 2. Admin user — garante que senha e status estão sempre corretos
    ADMIN_PASSWORD = "Atlas@2026!"
    admin = db.query(User).filter(User.email == "admin@atlasfinance.com").first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@atlasfinance.com",
            full_name="Administrador Atlas",
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            is_superuser=True,
            status="active",
        )
        db.add(admin)
        db.commit()
        print("  ✓ Usuário admin criado: admin@atlasfinance.com / Atlas@2026!")
    else:
        # Sempre atualiza hash e status para garantir acesso após re-deploys
        admin.hashed_password = get_password_hash(ADMIN_PASSWORD)
        admin.status = "active"
        admin.is_superuser = True
        db.commit()
        print("  ✓ Usuário admin sincronizado: admin@atlasfinance.com / Atlas@2026!")

    # 3. Organization
    org = db.query(Organization).filter(Organization.slug == "grupo-atlas").first()
    if not org:
        org = Organization(
            id=str(uuid.uuid4()),
            name="Grupo Atlas",
            slug="grupo-atlas",
            description="Grupo empresarial com múltiplos negócios",
        )
        db.add(org)
        db.commit()
        print("  ✓ Organização criada: Grupo Atlas")
    else:
        print("  ✓ Organização já existe")

    # 4. Business — Cowork Gym
    business = db.query(Business).filter(Business.slug == "cowork-gym").first()
    if not business:
        business = Business(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            name="Cowork Gym / Fitness",
            slug="cowork-gym",
            business_type="cowork_gym",
            description="Rede de academias e cowork fitness com múltiplas unidades em alavancagem",
        )
        db.add(business)
        db.commit()
        print("  ✓ Negócio criado: Cowork Gym / Fitness")
    else:
        print("  ✓ Negócio já existe")

    # 5. Units
    unit_ids = {}
    MUTABLE_UNIT_FIELDS = [
        "status",
        "opening_date",
        "sort_order",
        "city",
        "state",
        "slots_per_hour",
        "hours_open_weekday",
        "hours_open_saturday",
    ]
    for u_data in UNITS_DATA:
        existing = (
            db.query(Unit)
            .filter(
                Unit.business_id == business.id,
                Unit.code == u_data["code"],
            )
            .first()
        )
        if not existing:
            unit = Unit(
                id=str(uuid.uuid4()),
                business_id=business.id,
                **u_data,
            )
            db.add(unit)
            unit_ids[u_data["code"]] = unit
        else:
            # Atualiza campos mutáveis (status, opening_date, etc.) para refletir configuração atual
            for field in MUTABLE_UNIT_FIELDS:
                if field in u_data and getattr(existing, field, None) != u_data[field]:
                    setattr(existing, field, u_data[field])
            unit_ids[u_data["code"]] = existing
    db.commit()
    print(f"  ✓ {len(UNITS_DATA)} unidades criadas/atualizadas")

    # 6. Scenarios
    scenarios_data = [
        ("Base", "base", "Cenário base — premissas realistas"),
        ("Conservador", "conservative", "Cenário conservador — crescimento mais lento"),
        ("Agressivo", "aggressive", "Cenário agressivo — crescimento acelerado"),
    ]
    scenario_ids = {}
    for name, stype, desc in scenarios_data:
        existing = (
            db.query(Scenario)
            .filter(
                Scenario.business_id == business.id,
                Scenario.name == name,
            )
            .first()
        )
        if not existing:
            scenario = Scenario(
                id=str(uuid.uuid4()),
                business_id=business.id,
                name=name,
                scenario_type=stype,
                description=desc,
            )
            db.add(scenario)
            scenario_ids[name] = scenario
        else:
            scenario_ids[name] = existing
    db.commit()
    print(f"  ✓ {len(scenarios_data)} cenários criados/verificados")

    # 7. Assumption Categories
    cat_ids = {}
    for cat_data in ASSUMPTION_CATEGORIES:
        existing = (
            db.query(AssumptionCategory)
            .filter(
                AssumptionCategory.business_id == business.id,
                AssumptionCategory.code == cat_data["code"],
            )
            .first()
        )
        if not existing:
            cat = AssumptionCategory(
                id=str(uuid.uuid4()),
                business_id=business.id,
                **cat_data,
            )
            db.add(cat)
            cat_ids[cat_data["code"]] = cat
        else:
            cat_ids[cat_data["code"]] = existing
    db.commit()
    print(
        f"  ✓ {len(ASSUMPTION_CATEGORIES)} categorias de premissas criadas/verificadas"
    )

    # 8. Assumption Definitions
    defn_count = 0
    defn_updated = 0
    for cat_code, definitions in ASSUMPTION_DEFINITIONS.items():
        cat = cat_ids.get(cat_code)
        if not cat:
            continue
        for idx, defn_tuple in enumerate(definitions):
            code, name, dtype, uom, default, editable, periodicity = defn_tuple[:7]
            description = None
            growth_rule = None
            for extra in defn_tuple[7:]:
                if isinstance(extra, dict):
                    growth_rule = extra
                elif isinstance(extra, str):
                    description = extra
            existing = (
                db.query(AssumptionDefinition)
                .filter(
                    AssumptionDefinition.business_id == business.id,
                    AssumptionDefinition.code == code,
                )
                .first()
            )
            if not existing:
                defn = AssumptionDefinition(
                    id=str(uuid.uuid4()),
                    business_id=business.id,
                    category_id=cat.id,
                    code=code,
                    name=name,
                    description=description,
                    data_type=dtype,
                    unit_of_measure=uom,
                    default_value=default,
                    editable=editable,
                    periodicity=periodicity,
                    applies_to="version",
                    sort_order=idx,
                    growth_rule=growth_rule,
                    include_in_dre=_default_include_in_dre(code),
                    is_active=True,
                )
                db.add(defn)
                defn_count += 1
            else:
                changed = False
                desired_fields = {
                    "category_id": cat.id,
                    "name": name,
                    "description": description,
                    "data_type": dtype,
                    "unit_of_measure": uom,
                    "default_value": default,
                    "editable": editable,
                    "periodicity": periodicity,
                    "sort_order": idx,
                    "include_in_dre": _default_include_in_dre(code),
                    "is_active": True,
                }
                for field_name, desired_value in desired_fields.items():
                    if getattr(existing, field_name) != desired_value:
                        setattr(existing, field_name, desired_value)
                        changed = True
                if growth_rule != existing.growth_rule:
                    existing.growth_rule = growth_rule
                    changed = True
                if changed:
                    db.add(existing)
                    defn_updated += 1

    for legacy_code in {"alunos_capacidade_maxima"}:
        legacy_def = (
            db.query(AssumptionDefinition)
            .filter(
                AssumptionDefinition.business_id == business.id,
                AssumptionDefinition.code == legacy_code,
            )
            .first()
        )
        if legacy_def and legacy_def.is_active:
            legacy_def.is_active = False
            db.add(legacy_def)
            defn_updated += 1

    db.commit()
    print(
        f"  ✓ {defn_count} definições de premissas criadas, {defn_updated} atualizadas com growth_rule"
    )

    # 9. Line Item Definitions
    li_count = 0
    for (
        code,
        name,
        category,
        subcategory,
        order,
        is_kpi,
        is_subtotal,
        _,
    ) in LINE_ITEM_DEFINITIONS:
        existing = (
            db.query(LineItemDefinition)
            .filter(
                LineItemDefinition.business_id == business.id,
                LineItemDefinition.code == code,
            )
            .first()
        )
        if not existing:
            li = LineItemDefinition(
                id=str(uuid.uuid4()),
                business_id=business.id,
                code=code,
                name=name,
                category=category,
                subcategory=subcategory,
                calculation_type="formula",
                display_order=order,
                is_kpi=is_kpi,
                is_subtotal=is_subtotal,
            )
            db.add(li)
            li_count += 1
    db.commit()
    print(f"  ✓ {li_count} line items criados")

    # 10. Service Plans
    sp_count = 0
    for sp_data in SERVICE_PLANS_DATA:
        existing = (
            db.query(ServicePlan)
            .filter(
                ServicePlan.business_id == business.id,
                ServicePlan.code == sp_data["code"],
            )
            .first()
        )
        if not existing:
            sp = ServicePlan(
                id=str(uuid.uuid4()),
                business_id=business.id,
                **sp_data,
            )
            db.add(sp)
            sp_count += 1
    db.commit()
    print(f"  ✓ {sp_count} planos de serviço criados/verificados")

    # 11. Budget Versions — uma por unidade × cenário, com effective_start_date = opening_date
    opening_by_code = {u["code"]: u["opening_date"] for u in UNITS_DATA}
    scenario_label = {
        "Base": "Base",
        "Conservador": "Conservador",
        "Agressivo": "Agressivo",
    }
    bv_created = 0
    bv_updated = 0
    for s_name, scenario_obj in scenario_ids.items():
        for code, unit_obj in unit_ids.items():
            opening = opening_by_code.get(code)
            if not opening:
                continue
            existing_bv = (
                db.query(BudgetVersion)
                .filter(
                    BudgetVersion.unit_id == unit_obj.id,
                    BudgetVersion.scenario_id == scenario_obj.id,
                    BudgetVersion.is_active == True,
                )
                .first()
            )
            if not existing_bv:
                bv = BudgetVersion(
                    id=str(uuid.uuid4()),
                    unit_id=unit_obj.id,
                    scenario_id=scenario_obj.id,
                    version_name=f"Orçamento {scenario_label[s_name]} — {unit_obj.name}",
                    status="published",
                    effective_start_date=opening,
                    projection_horizon_years=9,
                    created_by=admin.id,
                )
                db.add(bv)
                bv_created += 1
            else:
                # Corrige effective_start_date se estiver errado (ex: todas em 2026-01)
                if existing_bv.effective_start_date != opening:
                    existing_bv.effective_start_date = opening
                    bv_updated += 1
    db.commit()
    print(
        f"  ✓ {bv_created} versões de orçamento criadas, {bv_updated} datas corrigidas"
    )

    print("\n=== Seeds concluídos com sucesso! ===")
    print(f"  Organização:  {org.id}")
    print(f"  Negócio:      {business.id}")
    print("  Login:        admin@atlasfinance.com")
    return {
        "org_id": org.id,
        "business_id": business.id,
        "unit_ids": {k: v.id for k, v in unit_ids.items()},
        "scenario_ids": {k: v.id for k, v in scenario_ids.items()},
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        run_seeds(db)
    finally:
        db.close()
