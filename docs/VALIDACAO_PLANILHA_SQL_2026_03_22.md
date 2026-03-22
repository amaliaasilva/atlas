# Validacao Planilha x SQL/Seeds (22/03/2026)

## Escopo

Validacao cruzada dos dados de referencia das planilhas em /planilha com os seeds e contratos SQL do backend.

Fontes usadas:
- planilha/Consolidado - 2027-2034 Alav. (oito unidades).xlsx (aba Resultado consolidado)
- planilha/Orcamento 16.0 - Unidade Laboratorio (Alav.).xlsx (abas Custo investimento Lab e Ocupacao e unit economics 2.0)
- backend/app/seeds/initial_data.py
- backend/alembic/versions

## Resultado executivo

- Datas de abertura das 8 unidades: OK (alinhadas com planilha consolidada)
- Preco e mix dos 4 planos: OK (alinhados com planilha Lab)
- CAPEX baseline Lab: OK (6 itens alinhados)
- Taxa de cartao e vidas uteis: OK (0.035, 60 e 120)
- Migrations SQL: OK (cadeia de revisao presente)

## Evidencias validadas

### 1) Unidades e data de abertura

Planilha consolidada (Resultado consolidado, coluna C):
- Unidade 1: 2026-11-01
- Unidade 2: 2028-03-01
- Unidade 3: 2028-10-01
- Unidade 4: 2029-03-01
- Unidade 5: 2029-10-01
- Unidade 6: 2030-03-01
- Unidade 7: 2030-10-01
- Unidade 8: 2031-03-01

Seeds apos ajuste:
- LAB: 2026-11-01
- UNIT02: 2028-03-01
- UNIT03: 2028-10-01
- UNIT04: 2029-03-01
- UNIT05: 2029-10-01
- UNIT06: 2030-03-01
- UNIT07: 2030-10-01
- UNIT08: 2031-03-01

Status: OK

### 2) Planos de servico (preco/hora e mix)

Planilha Lab (Ocupacao e unit economics 2.0):
- Bronze: 65, mix 0.25
- Prata: 60, mix 0.25
- Ouro: 55, mix 0.25
- Diamante: 50, mix 0.25

Seeds:
- BRONZE: 65.0, mix 0.25
- PRATA: 60.0, mix 0.25
- OURO: 55.0, mix 0.25
- DIAMANTE: 50.0, mix 0.25

Status: OK

### 3) CAPEX baseline (Laboratorio)

Planilha Lab (Custo investimento Lab):
- valor_equipamentos: 472410.26
- honorarios_arquiteto: 28000.00
- custo_obras_adaptacoes: 250000.00
- automacao_ac: 20000.00
- branding_identidade_visual: 28530.25
- capital_giro_inicial: 342004.95

Seeds apos ajuste:
- valor_equipamentos: 472410.26
- honorarios_arquiteto: 28000.00
- custo_obras_adaptacoes: 250000.00
- automacao_ac: 20000.00
- branding_identidade_visual: 28530.25
- capital_giro_inicial: 342004.95

Status: OK

### 4) Premissas adicionais

- taxa_cartao_pct: 0.035
- vida_util_equipamentos_meses: 60
- vida_util_reforma_meses: 120

Status: OK

### 5) SQL/migrations

Versoes Alembic detectadas:
- 3d0dd2868e94_refactor_domain_to_coworking_b2b.py
- 67240b621a18_add_franchise_fee_config_personal_benefit_tier.py

Status: OK (cadeia presente e consistente para o dominio atual)

## Observacoes

- Esta validacao confere valores de referencia no seed e contratos de schema/migration.
- Para fechamento operacional em banco real, executar reseed + consulta SQL de conferencia nas tabelas units, service_plans e assumption_definitions.
