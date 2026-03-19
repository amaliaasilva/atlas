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
from app.models.organization import Organization
from app.models.business import Business
from app.models.unit import Unit
from app.models.scenario import Scenario
from app.models.assumption import AssumptionCategory, AssumptionDefinition
from app.models.line_item import LineItemDefinition
from app.models.user import User, Role


UNITS_DATA = [
    {
        "name": "Laboratório",
        "code": "LAB",
        "opening_year": 2026,
        "sort_order": 1,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Segunda Unidade",
        "code": "UNIT02",
        "opening_year": 2027,
        "sort_order": 2,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Terceira Unidade",
        "code": "UNIT03",
        "opening_year": 2027,
        "sort_order": 3,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Quarta Unidade",
        "code": "UNIT04",
        "opening_year": 2028,
        "sort_order": 4,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Quinta Unidade",
        "code": "UNIT05",
        "opening_year": 2028,
        "sort_order": 5,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Sexta Unidade",
        "code": "UNIT06",
        "opening_year": 2029,
        "sort_order": 6,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Sétima Unidade",
        "code": "UNIT07",
        "opening_year": 2029,
        "sort_order": 7,
        "city": "São Paulo",
        "state": "SP",
    },
    {
        "name": "Oitava Unidade",
        "code": "UNIT08",
        "opening_year": 2030,
        "sort_order": 8,
        "city": "São Paulo",
        "state": "SP",
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
        (
            "alunos_capacidade_maxima",
            "Capacidade máxima de alunos",
            "integer",
            "alunos",
            200,
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
        ),
        (
            "salario_recepcao",
            "Salário - Recepção",
            "currency",
            "R$",
            2200.0,
            True,
            "static",
        ),
        (
            "salario_marketing",
            "Salário - Marketing",
            "currency",
            "R$",
            0.0,
            True,
            "static",
        ),
        (
            "salario_comercial",
            "Salário - Comercial",
            "currency",
            "R$",
            0.0,
            True,
            "static",
        ),
        ("salario_gerente", "Salário - Gerente", "currency", "R$", 0.0, True, "static"),
        (
            "salario_educador_fisico",
            "Salário - Educador Físico",
            "currency",
            "R$",
            0.0,
            True,
            "static",
        ),
        ("pro_labore", "Pró-labore", "currency", "R$", 5000.0, True, "static"),
        (
            "encargos_folha_pct",
            "Encargos sobre folha (%)",
            "percentage",
            "%",
            0.08,
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
        (
            "kwh_consumo_mensal",
            "Consumo de energia (kWh/mês)",
            "numeric",
            "kWh",
            4000.0,
            True,
            "monthly",
        ),
        (
            "tarifa_kwh",
            "Tarifa de energia (R$/kWh)",
            "currency",
            "R$/kWh",
            0.912,
            True,
            "static",
        ),
        (
            "consumo_agua_m3_mensal",
            "Consumo de água (m³/mês)",
            "numeric",
            "m³",
            30.0,
            True,
            "monthly",
        ),
        (
            "tarifa_agua_m3",
            "Tarifa de água (R$/m³)",
            "currency",
            "R$/m³",
            15.2,
            True,
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
        ),
        (
            "servicos_administrativos",
            "Serviços administrativos",
            "currency",
            "R$",
            1000.0,
            True,
            "monthly",
        ),
        (
            "seguro_imovel",
            "Seguro do imóvel",
            "currency",
            "R$",
            1000.0,
            True,
            "monthly",
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
            0.0,
            True,
            "one_time",
        ),
        (
            "custo_obras_adaptacoes",
            "Custo de obras e adaptações",
            "currency",
            "R$",
            0.0,
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
            0.0,
            True,
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
        ),
    ],
    "OCUPACAO": [
        # Placeholder — a taxa de ocupação mensal já está em RECEITA,
        # aqui ficam premissas derivadas de ocupação se necessário
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
        "Ponto de Equilíbrio (alunos)",
        "result",
        "kpi",
        60,
        True,
        True,
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

    # 2. Admin user
    admin = db.query(User).filter(User.email == "admin@atlasfinance.com").first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@atlasfinance.com",
            full_name="Administrador Atlas",
            hashed_password=get_password_hash("Atlas@2026!"),
            is_superuser=True,
            status="active",
        )
        db.add(admin)
        db.commit()
        print("  ✓ Usuário admin criado: admin@atlasfinance.com / Atlas@2026!")
    else:
        print("  ✓ Usuário admin já existe")

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
            unit_ids[u_data["code"]] = existing
    db.commit()
    print(f"  ✓ {len(UNITS_DATA)} unidades criadas/verificadas")

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
    for cat_code, definitions in ASSUMPTION_DEFINITIONS.items():
        cat = cat_ids.get(cat_code)
        if not cat:
            continue
        for idx, (code, name, dtype, uom, default, editable, periodicity) in enumerate(
            definitions
        ):
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
                    data_type=dtype,
                    unit_of_measure=uom,
                    default_value=default,
                    editable=editable,
                    periodicity=periodicity,
                    applies_to="version",
                    sort_order=idx,
                )
                db.add(defn)
                defn_count += 1
    db.commit()
    print(f"  ✓ {defn_count} definições de premissas criadas")

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

    print("\n=== Seeds concluídos com sucesso! ===")
    print(f"  Organização:  {org.id}")
    print(f"  Negócio:      {business.id}")
    print("  Login:        admin@atlasfinance.com / Atlas@2026!")
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
