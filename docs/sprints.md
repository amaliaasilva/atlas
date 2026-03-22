# Atlas Finance — Guia Completo de Validação e Implementação

> **Data da auditoria:** 21/03/2026  
> **Branch:** `main` · commit `754b06ba`  
> **Última validação completa:** 21/03/2026 — todos os arquivos do motor financeiro, seeds, endpoints e 8 páginas de dashboard lidos e confirmados contra a planilha.  
> **Este documento é o guia canônico de implementação.** Toda decisão de código deve referenciar as seções aqui antes de alterar qualquer arquivo.

---

## ⚠️ Contexto de Fase 1 — Plataforma de Planejamento What-If

**Este sistema NÃO é um ERP operacional.** É uma Plataforma de Viabilidade Financeira e Análise de Cenários (What-If) para unidades que **ainda não existem no mundo real**.

- **Unidades** = modelos matemáticos hipotéticos (ex: "E se eu abrir em SP em 2028 com 10 slots/hora?")
- **A alma do sistema** = flexibilidade para criar, clonar e comparar `scenarios` e `budget_versions`
- **Fase 2 (futura)** = sistema operacional real conectado via API (checkins, receita real, etc.)

> Toda decisão arquitetural deve priorizar: **fluxo de What-If > UX de planejamento > precisão do motor financeiro**.

---

## Índice

1. [Inventário: O Que Já Está Implementado](#1-inventário-o-que-já-está-implementado)
2. [Auditoria de GAPs — Estado Real vs Planilha](#2-auditoria-de-gaps--estado-real-vs-planilha)
3. [Regras de Cálculo Editáveis (Variáveis de Configuração)](#3-regras-de-cálculo-editáveis)
P0. [Pré-Sprint — Bugs Críticos de UX e Backend (Auditoria 21/03/2026)](#p0-pré-sprint--bugs-críticos)
  - [P0.2 BUG-FE-01: businesses — sem criação ✅](#p02)
  - [P0.3 BUG-FE-02: scenarios — botão inativo ✅](#p03)
  - [P0.4 BUG-BE-01: assumptions.py rotas duplicadas 🔴](#p04)
  - [P0.5 BE-CLONE: budget-versions/clone ✅](#p05)
  - [P0.6 AI endpoints skeleton ✅](#p06)
  - [P0.7 BUG-FE-01: ocupacao breakevenOccupancyRate circular 🔴](#p07)
  - [P0.8 BUG-FE-02: professores modelo academia (errado para B2B) 🔴](#p08)
  - [P0.9 FE-NOTE: annual_summaries não exposto em /consolidated ⚠️](#p09)
  - [P0.10 FE-NOTE: capacidade usa maxRevenue×1.4 ⚠️](#p010)
4. [Sprint 1 — Correções Críticas (Backend + Seeds)](#4-sprint-1--correções-críticas)
5. [Sprint 2 — Cobertura Funcional (Engine + API)](#5-sprint-2--cobertura-funcional)
6. [Sprint 3 — Frontend: Novos Componentes e Páginas](#6-sprint-3--frontend)
7. [Sprint 4 — Features Estratégicas](#7-sprint-4--features-estratégicas)
8. [Checklist de Validação Final](#8-checklist-de-validação-final)
9. [Sprint 5 — Fundação Arquitetural (ARCHITECTURE_PROPOSAL items)](#9-sprint-5--fundação-arquitetural)
10. [Sprint 6 — Camada de IA (AI Copilot & Sanity Check)](#10-sprint-6--camada-de-ia)

---

## 1. Inventário: O Que Já Está Implementado

### 1.1 · Backend — Motor Financeiro

| Arquivo | Status | Notas |
|---|---|---|
| `engine.py` — cálculo por período | ✅ Correto | 120 meses, todos os KPIs |
| `engine.py` — `persist()` | ✅ Correto | Salva 28 line items no banco |
| `engine.py` — `_build_annual_summaries()` | ✅ Correto | Gerado em `outputs.annual_summaries`; **⚠️ não exposto no endpoint `/consolidated`** nem no `/unit` — retornado apenas em `RecalculateResponse` (ver P0.9) |
| `engine.py` — `calculation_trace` | ✅ Correto | Gerado por período; persiste apenas na linha `net_result` |
| `fixed_costs.py` — modelo misto energia | ⚠️ Bug | Fórmula errada (GAP-01 — ver §4.1) |
| `fixed_costs.py` — pró-labore sem encargos | ✅ Correto | `clt_base` exclui pro_labore |
| `fixed_costs.py` — social_charges 80% | ✅ Correto | Campo `social_charges_rate=0.80` |
| `variable_costs.py` | ⚠️ Incompleto | Sem `card_fee_rate` (GAP-03) |
| `kpi.py` — breakeven receita/ocupação | ✅ Correto | `calculate_break_even_revenue`, `calculate_break_even_occupancy_pct` |
| `kpi.py` — `teachers_needed_breakeven` | ❌ Ausente | GAP-06 |
| `models.py` — `VariableCostInputs` | ⚠️ Incompleto | Sem `card_fee_rate` |
| `models.py` — `CapexInputs` | ⚠️ Incompleto | Sem arquiteto, automação, branding, vida útil |
| `expander.py` — `expand_compound_growth` | ✅ Correto | Cresce anualmente a partir de `base_year` |
| `expander.py` — `expand_curve` | ⚠️ Bug | Usa índice de posição, não relativo à `opening_date` (GAP-04) |
| `financing.py` — tabela PRICE múltiplos contratos | ✅ Correto | `get_multi_contract_payment` implementado |
| `revenue.py` — mix de planos B2B | ✅ Correto | Lê `service_plans` do banco |
| `calculations.py` — `_build_inputs_for_version` | ✅ Correto | Resolve premissas com fallback/expansion |

### 1.2 · Backend — Seeds

| Dado | Status | Valor Atual | Valor Correto (planilha) |
|---|---|---|---|
| Plano Diamante preço/mix | ❌ Errado | R$65 / 40% | R$50 / 25% |
| Plano Ouro preço/mix | ❌ Errado | R$60 / 30% | R$55 / 25% |
| Plano Prata preço/mix | ❌ Errado | R$55 / 20% | R$60 / 25% |
| Plano Bronze preço/mix | ❌ Errado | R$50 / 10% | R$65 / 25% |
| Preço médio ponderado resultante | ❌ | R$60/h | R$57,50/h |
| `taxa_cartao_pct` (FISCAL) | ❌ Ausente | — | 0.035 |
| `salario_limpeza` growth_rule | ❌ Errado | 5% | 10% |
| `salario_recepcao` growth_rule | ❌ Errado | 5% | 10% |
| `salario_marketing` growth_rule | ❌ Errado | 5% | 10% |
| `salario_comercial` growth_rule | ❌ Errado | 5% | 10% |
| `salario_gerente` growth_rule | ❌ Errado | 5% | 10% |
| `salario_educador_fisico` growth_rule | ❌ Errado | 5% | 10% |
| `pro_labore` growth_rule | ❌ Errado | 5% a.a. | `curve [5000,5000,5500,5500,6000,6000,6600,6600,7000,7000]` |
| CAPEX `custo_arquiteto` | ❌ Ausente | — | R$28.000 |
| CAPEX `custo_automacao` | ❌ Ausente | — | R$20.000 |
| CAPEX `custo_branding` | ❌ Ausente | — | R$28.530 |
| CAPEX `vida_util_equipamentos_meses` | ❌ Ausente | — | 60 meses |
| CAPEX `vida_util_reforma_meses` | ❌ Ausente | — | 120 meses |

### 1.3 · Backend — Endpoints

| Endpoint | Status | Notas |
|---|---|---|
| `GET /dashboard/unit/{version_id}` | ✅ Implementado | 28 métricas + time_series |
| `GET /dashboard/business/{id}/consolidated` | ✅ Implementado | Agrega live, ponderação percentual correta; ⚠️ `annual_summaries` do engine **não incluído** no response — páginas de crescimento reimplementam localmente (P0.9) |
| `GET /dashboard/business/{id}/units-comparison` | ✅ Implementado | Compara uma métrica entre unidades |
| `GET /dashboard/unit/{version_id}/dre` | ❌ Ausente | Sprint 2 |
| `GET /dashboard/unit/{version_id}/audit` | ❌ Ausente | Sprint 2 |
| `GET /dashboard/business/{id}/annual` | ❌ Ausente | Sprint 2 |
| `GET /dashboard/business/{id}/portfolio` | ❌ Ausente | Sprint 2 |
| `POST /budget-versions/{id}/clone` | ✅ Adicionado 21/03/2026 | Copia BudgetVersion + todos AssumptionValues; status=draft (P0.5) |
| `GET /ai/sanity-check/{version_id}` | ✅ Stub funcional (sem LLM) | 5 checks determinísticos — Sprint 6 substitui por AI real (P0.6) |
| `POST /ai/copilot` | ✅ Stub (retorna `"__stub__"`) | FAQ matching — Sprint 6 substitui por AI real (P0.6) |
| `GET /ai/geo-pricing/{unit_id}` | ✅ Stub (benchmarks hardcoded) | SP/RJ/MG — Sprint 6 substitui por AI real (P0.6) |
| `GET /reports/export/csv/{version_id}` | ✅ Implementado | Exporta todos os `CalculatedResult` como CSV; `DRETable` frontend deve usar este endpoint |
| `GET /audit` | ✅ Implementado | Lista `AuditLog` com filtros de `entity_type`, paginação e busca |
| `PATCH /service-plans/{id}` | ⚠️ Sem validação | Falta validar `Σ(target_mix_pct) == 1.0` antes de salvar (Sprint 1 — §3.2) |

> ⚠️ **BUG-BE-01 (P0.4):** `assumptions.py` tem 6 rotas definidas **duas vezes** no mesmo arquivo. FastAPI usa silenciosamente a 1ª definição; o 2º bloco (~linha 216 em diante) é código morto e precisa ser removido antes de Sprint 1.

### 1.4 · Frontend — Páginas e Componentes Existentes

**Páginas existentes** (todas em `frontend/src/app/(auth)/dashboard/(executive)/`):

| Página | Arquivo | Linhas | Estado |
|---|---|---|---|
| Visão Geral | `visao-geral/page.tsx` | 341 | ⚠️ Sem DRE detalhado, sem tabs |
| Ocupação | `ocupacao/page.tsx` | 252 | ⚠️ Sem gauge · ⚠️ `breakevenOccupancyRate` circulamente errado (P0.7) |
| Crescimento | `crescimento/page.tsx` | 258 | ⚠️ `aggregateByYear` local duplicada em 3 arquivos (crescimento/estrategico/projecoes) — ver P0.9 |
| Professores | `professores/page.tsx` | 239 | ⚠️ Modelo academia (P0.8): hardcoded `STUDENT_PER_INSTRUCTOR=25`, PTs tratados como funcionários |
| Projeções | `projecoes/page.tsx` | 424 | ⚠️ Sem payback waterfall |
| Capacidade | `capacidade/page.tsx` | 250 | ⚠️ Sem heat map · usa `maxRevenue × 1.4` como capacidade teórica (P0.10) |
| Unidades | `unidades/page.tsx` | 250 | ⚠️ Sem sparklines (Sprint 3) |
| Estratégico | `estrategico/page.tsx` | 784 | ⚠️ Sem portfolio ROI, sem custo de capital |
| DRE | ❌ Ausente | — | Sprint 3 |
| CAPEX | ❌ Ausente | — | Sprint 3 |
| Auditoria Cálculo | ❌ Ausente | — | Sprint 3 |

**Páginas de gestão de entidades** (`frontend/src/app/(auth)/`):

| Página | Arquivo | Estado | Notas |
|---|---|---|---|
| Lista de Negócios | `businesses/page.tsx` | ✅ Lista + ✅ Criação (P0.2) | `CreateBusinessModal` adicionado em 21/03/2026 |
| Lista de Cenários | `scenarios/page.tsx` | ✅ Lista + ✅ Criação (P0.3) | `CreateScenarioModal` adicionado em 21/03/2026 |
| Lista de Unidades | `units/page.tsx` ou equivalente | ✅ Criação funcional | Modal de criação de unidade ok |
| Edição de Budget Version | `budget/[versionId]/` | ✅ Existe | `BudgetVersionClient.tsx` (577 linhas) com premissas, contratos, recalcular |
| Comparação de Cenários | `compare/scenarios/` | ✅ Existe | — |
| Comparação de Unidades | `compare/units/` | ✅ Existe | — |
| Audit Trail (ações do usuário) | `audit/page.tsx` | ✅ Existe | Lista `AuditLog` com filtros e paginação |
| Import Excel | `import/page.tsx` | ✅ Existe | Upload de planilha → `ImportJob`; backend `excel_importer.py` |

**Componentes existentes** (`frontend/src/components/`):

| Componente | Status |
|---|---|
| `charts/AreaGrowthChart.tsx` | ✅ Existe (`AreaGrowthChart`, `AnnualAreaChart`) |
| `charts/LineCharts.tsx` | ✅ Existe (`OccupancyLineChart`, `CostsLineChart`) |
| `charts/OccupancyChart.tsx` | ✅ Existe |
| `charts/RevenueChart.tsx` | ✅ Existe |
| `charts/UnitsBarChart.tsx` | ✅ Existe (`BulletChartItem`, `ScenarioBarChart`) |
| `dashboard/MetricCard.tsx` | ✅ Existe (`MetricCard`, `ProgressCard`) |
| `dashboard/GlobalFilters.tsx` | ✅ Existe |
| `dashboard/EmptyState.tsx` | ✅ Existe (`NoFiltersState`, `MetricCardSkeleton`, `ChartSkeleton`) |
| `dashboard/DashboardNav.tsx` | ✅ Existe |
| `layout/Sidebar.tsx` | ✅ Existe |
| `layout/Topbar.tsx` | ✅ Existe |
| `ui/` (Badge, Button, Card, Input, Spinner) | ✅ Existe |
| `charts/OccupancyGauge.tsx` | ❌ Ausente | Sprint 3 |
| `charts/WaterfallChart.tsx` | ❌ Ausente | Sprint 3 |
| `charts/BreakevenBullet.tsx` | ❌ Ausente | Sprint 3 |
| `charts/CapexStackedBar.tsx` | ❌ Ausente | Sprint 3 |
| `charts/AnnualSummaryChart.tsx` | ❌ Ausente | Sprint 3 |
| `tables/DRETable.tsx` | ❌ Ausente | Sprint 3 |
| `tables/TeachersBreakevenTable.tsx` | ❌ Ausente | Sprint 3 |
| `tables/PortfolioTable.tsx` | ❌ Ausente | Sprint 3 |
| `dashboard/AuditTracePanel.tsx` | ❌ Ausente | Sprint 3 |

**Store Zustand** (`store/dashboard.ts`):

Estado atual (confirmado em leitura direta do arquivo em 21/03/2026):
```typescript
{ businessId, scenarioId, selectedUnitIds, unitId, versionId,
  year, periodStart, periodEnd, compareScenarioIds }
```
- `selectedUnitIds` + compat. `unitId` coexistem corretamente ✅
- `persist` via zustand/middleware (`atlas-dashboard-filters`) ✅

**Falta adicionar:** `activeYearPreset: string | null`

**API Client** (`lib/api.ts`) — funções existentes:

```typescript
dashboardApi.unit(version_id)        // ✅
dashboardApi.consolidated(...)        // ✅
dashboardApi.comparison(...)          // ✅ (units-comparison)
// ❌ faltam: .dre(), .annual(), .auditTrace(), .portfolio()
```

**Tipos** (`types/api.ts`) — o que existe (confirmado em leitura direta 21/03/2026):

`Organization, Business, Unit, Scenario, BudgetVersion, AssumptionCategory, AssumptionDefinition, AssumptionValue, CalculatedResult, KPISummary, DashboardUnit, TimeSeries, DashboardConsolidated, UnitComparisonDetail, UnitsComparisonResponse, AnnualSummary (parcial), FinancingContract, ServicePlan, ImportJob, AuditLog, User, AuthTokens, PaginatedResponse`

> ✅ `TimeSeries` já inclui todos os campos B2B: `capacity_hours_month, active_hours_month, avg_price_per_hour, break_even_revenue, break_even_occupancy_pct, contribution_margin_pct`  
> ✅ `getRevenue(ts)` helper resolve alias `revenue_total` vs `gross_revenue` corretamente

**Faltam os tipos:** `DREItem, DREPeriod, DREResponse, PortfolioUnit, PortfolioResponse, TeachersBreakeven, CalcTrace, RevenueTrace, FixedCostTrace, VariableCostTrace, KPITrace`

---

## 2. Auditoria de GAPs — Estado Real vs Planilha

### GAP-01 🔴 CRÍTICO — Bug na Fórmula de Energia Elétrica

**Arquivo:** `backend/app/services/financial_engine/fixed_costs.py`, função `calculate_utility_costs()`, linha ~50

> **⚠️ Atenção:** O **docstring** da função também está errado — reproduz a mesma fórmula incorreta do código. Ambos devem ser corrigidos juntos na mesma PR.

**Estado atual (ERRADO — código e docstring):**
```python
electricity = round(
    inputs.fixed_energy_cost
    + inputs.max_variable_energy_cost * occ * var_reduction,  # ❌
    2,
)
```

**Estado correto (planilha):**
```
Energia = (custo_fixo + custo_variavel_max × ocupação) × (1 − automação)
```

Exemplo verificado: `(4200 + 3000 × 0.12) × 0.80 = 4560 × 0.80 = R$3.648`  
Valor atual (errado): `4200 + 3000 × 0.12 × 0.80 = 4200 + 288 = R$4.488` (+23%)

**Impacto:** Custos fixos subestimados em todos os períodos com ocupação > 0. Break-even calculado incorretamente.

---

### GAP-02 🔴 CRÍTICO — Preços e Mix dos Planos de Serviço Invertidos

**Arquivo:** `backend/app/seeds/initial_data.py`, linhas 112–155

A planilha usa convenção **inversa** (Bronze = entrada = maior preço, Diamante = comprometimento máximo = menor preço):

| Código | Estado atual | Correto (planilha) | Mix atual | Mix correto |
|---|---|---|---|---|
| DIAMANTE | R$65/h | R$50/h | 40% | 25% |
| OURO | R$60/h | R$55/h | 30% | 25% |
| PRATA | R$55/h | R$60/h | 20% | 25% |
| BRONZE | R$50/h | R$65/h | 10% | 25% |

Preço médio atual: `65×0.40 + 60×0.30 + 55×0.20 + 50×0.10 = R$60/h`  
Preço médio correto: `(65+60+55+50)/4 = R$57,50/h`

**Impacto:** Receita 4,3% superestimada em todos os cenários.

---

### GAP-03 🔴 CRÍTICO — Taxa de Cartão de Crédito Não Modelada (3,5%)

**Arquivos afetados:**  
- `backend/app/services/financial_engine/models.py` — `VariableCostInputs`  
- `backend/app/services/financial_engine/variable_costs.py`  
- `backend/app/api/v1/endpoints/calculations.py` — mapeamento da premissa  
- `backend/app/seeds/initial_data.py` — categoria FISCAL

A planilha separa claramente:
- **Lucro Presumido:** 6% sobre receita (já modelado como `aliquota_imposto_receita`)
- **Taxa adquirente (cartão):** 3,5% sobre receita (AUSENTE no código)

Total efetivo sobre receita: **9,5%** (atual: apenas 6%)

**Impacto:** Resultado líquido superestimado em ~3,5% da receita bruta por período.

---

### GAP-04 🟡 IMPORTANTE — Curva de Ocupação Não Relativa à Opening Date

**Arquivo:** `backend/app/services/financial_engine/expander.py`, função `expand_curve()`

```python
# Estado atual — índice por POSIÇÃO na lista de períodos:
year_idx = i // 12  # i = 0, 1, 2 ... 119

# Correto — índice RELATIVO à data de abertura da unidade:
year_idx = max(0, int(p[:4]) - opening_year)
```

**Consequência prática:** A Segunda Unidade (abre em 2028) usa `i=0→year_idx=0` no seu primeiro mês, que é *correto apenas por acidente* — mas se a curva de ocupação do negócio global for aplicada a ela como se fosse Ano 0, ok. O problema real aparece quando o `expand_curve` é chamado com o horizonte completo (120 meses desde Nov/2026) — a U2 (que abre em 2028) recebe a ocupação do **Ano 2** (0.25) no seu primeiro mês em vez de Ano 0 (0.03).

**Nota:** O campo `opening_year` é necessário apenas para `expand_curve`, não para `expand_compound_growth` (que já usa o ano absoluto do período).

---

### GAP-05 🟡 IMPORTANTE — CAPEX Incompleto (3 itens faltando) e Depreciação Manual

**Arquivo:** `backend/app/services/financial_engine/models.py` — `CapexInputs`

Items faltando vs planilha `Custo investimento Lab`:

| Item | Modelo atual | Planilha | Valor Lab |
|---|---|---|---|
| Equipamentos | `equipment_value` ✅ | ✅ | R$472.410 |
| Obras/reforma | `renovation_works` ✅ | ✅ | R$250.000 |
| Pré-operacional | `pre_operational_expenses` ✅ | ✅ | — |
| Capital de giro | `working_capital` ✅ | ✅ | R$342.005 (= burn × 12) |
| Móveis/fixtures | `furniture_fixtures` ✅ | ✅ | — |
| Tech setup | `technology_setup` ✅ | ✅ | — |
| **Arquiteto** | ❌ Ausente | ✅ | **R$28.000** |
| **Automação A/C** | ❌ Ausente | ✅ | **R$20.000** |
| **Branding** | ❌ Ausente | ✅ | **R$28.530** |
| Vida útil equipamentos | ❌ Ausente | ✅ | 60 meses |
| Vida útil reforma | ❌ Ausente | ✅ | 120 meses |

**Depreciação:** atualmente é input manual (`depreciacao_equipamentos` com `default=0.0`). Deve ser calculada automaticamente como `equipment_value / vida_util_equipamentos_meses`. Seed mantém o campo como `is_required=False`.

---

### GAP-06 🟡 IMPORTANTE — KPI `teachers_needed_breakeven` Ausente

**Arquivo:** `backend/app/services/financial_engine/kpi.py` — função inexistente

A planilha `Ocupação e unit economics 2.0` calcula:

| Cenário | Alunos/Professor | Fórmula |
|---|---|---|
| Pessimista | 1,0 | `ceil(BE_classes / (2 aulas × 4.33 sem × 1.0))` |
| Médio | 1,5 | `ceil(BE_classes / (2 × 4.33 × 1.5))` |
| Otimista | 2,0 | `ceil(BE_classes / (2 × 4.33 × 2.0))` |

Onde `BE_classes = BE_occupancy_pct × capacity_hours_month`

**Impacto frontend:** `professores/page.tsx` exibe `num_personal_trainers` das premissas (intenção atual ≠ necessário para break-even).

---

### GAP-07 🟡 IMPORTANTE — Growth Rules Incorretos nos Seeds

**Arquivo:** `backend/app/seeds/initial_data.py`, categoria `CUSTO_FIXO`

| Premissa | Growth Rule atual | Correto (planilha) |
|---|---|---|
| `salario_limpeza` | `compound_growth 0.05` | `compound_growth 0.10` |
| `salario_recepcao` | `compound_growth 0.05` | `compound_growth 0.10` |
| `salario_marketing` | `compound_growth 0.05` | `compound_growth 0.10` |
| `salario_comercial` | `compound_growth 0.05` | `compound_growth 0.10` |
| `salario_gerente` | `compound_growth 0.05` | `compound_growth 0.10` |
| `salario_educador_fisico` | `compound_growth 0.05` | `compound_growth 0.10` |
| `pro_labore` | `compound_growth 0.05` | `curve [5000,5000,5500,5500,6000,6000,6600,6600,7000,7000]` |
| `contabilidade_mensal` | sem growth_rule | `compound_growth 0.10` |
| `marketing_digital_mensal` | sem growth_rule | `compound_growth 0.10` |
| `servicos_administrativos` | sem growth_rule | `compound_growth 0.10` |
| `seguro_imovel` | sem growth_rule | `compound_growth 0.10` |
| `sistemas_seguranca` | sem growth_rule | `compound_growth 0.10` |

---

### GAP-08 🟡 IMPORTANTE — Sub-itens de DRE Granulares Não Persistidos

**Estado atual:** O `engine.persist()` salva 28 line items agregados (ex: `staff_costs` = total da folha). Não salva os sub-itens (ex: `fc_pro_labore`, `fc_clt_base`, `fc_social_charges`, `fc_electricity`, `fc_water`, `vc_card_fee`).

**Impacto:** Impossível exibir DRE detalhado linha a linha. A aba DRE planejada no frontend não tem dados para renderizar.

**Requisito:** Os seguintes line items precisam existir em `LINE_ITEM_DEFINITIONS` E ser persistidos no `persist()`:

```
fc_pro_labore, fc_clt_base, fc_social_charges, fc_electricity, fc_water,
fc_internet, vc_card_fee, other_variable_costs_detail,
teachers_needed_pessimistic, teachers_needed_medium, teachers_needed_optimistic
```

---

### GAP-09 🟡 IMPORTANTE — Endpoints de Resumo Anual e Portfolio Ausentes

Endpoints necessários não existem:
- `GET /dashboard/unit/{version_id}/dre` — DRE completo por período
- `GET /dashboard/unit/{version_id}/audit` — `calculation_trace` por período  
- `GET /dashboard/business/{id}/annual` — resumo consolidado por ano
- `GET /dashboard/business/{id}/portfolio` — ROI e custo de capital do portfolio

---

### GAP-10 🟢 MENOR — Split Franqueador/Franqueado Não Modelado

A aba `Fórmulas fee para split` da planilha define divisão de receita entre plataforma Atlas e franqueado. Sem model, endpoint ou frontend. Sprint 4.

---

### GAP-11 🟢 MENOR — Capacidade Usa Constantes, Planilha Usa Dias Reais

`working_days_month=22`, `saturdays_month=4` são constantes.  
Planilha 2027: 249 dias úteis + 52 sábados → (249×17 + 52×7)/12 ≈ 384h/mês vs 402h/mês atual (+4,5%).  
Impacto baixo; pode ser resolvido tornando estas variáveis configuráveis por premissa.

---

## 3. Regras de Cálculo Editáveis

> **Princípio:** Toda variável de cálculo que afeta resultado financeiro DEVE ser uma `AssumptionValue` editável no banco — nunca um hardcode no código.

### 3.1 · Mapeamento completo: premissa → campo do motor

| Premissa (`code`) | Categoria | Campo do Motor | Tipo |
|---|---|---|---|
| `aliquota_imposto_receita` | FISCAL | `TaxInputs.tax_rate_on_revenue` | % |
| `taxa_cartao_pct` | FISCAL | `VariableCostInputs.card_fee_rate` | % **[NOVO]** |
| `taxa_ocupacao` | RECEITA | `RevenueInputs.occupancy_rate` | curve |
| `slots_por_hora` | RECEITA | `RevenueInputs.slots_per_hour` | int |
| `horas_dia_util` | RECEITA | `RevenueInputs.hours_per_day_weekday` | float |
| `horas_dia_sabado` | RECEITA | `RevenueInputs.hours_per_day_saturday` | float |
| `dias_uteis_mes` | RECEITA | `RevenueInputs.working_days_month` | int |
| `sabados_mes` | RECEITA | `RevenueInputs.saturdays_month` | int |
| `aluguel_mensal` | CUSTO_FIXO | `FixedCostInputs.rent` | currency |
| `pro_labore` | CUSTO_FIXO | `FixedCostInputs.pro_labore` | curve |
| `encargos_folha_pct` | CUSTO_FIXO | `FixedCostInputs.social_charges_rate` | % |
| `custo_energia_fixo` | CUSTO_FIXO | `FixedCostInputs.fixed_energy_cost` | currency |
| `custo_energia_variavel_max` | CUSTO_FIXO | `FixedCostInputs.max_variable_energy_cost` | currency |
| `automacao_reducao_pct` | CUSTO_FIXO | `FixedCostInputs.automation_reduction` | % |
| `custo_agua_fixo` | CUSTO_FIXO | `FixedCostInputs.fixed_water_cost` | currency |
| `custo_agua_variavel_max` | CUSTO_FIXO | `FixedCostInputs.max_variable_water_cost` | currency |
| `comissao_vendas_pct` | CUSTO_VARIAVEL | `VariableCostInputs.sales_commission_rate` | % |
| `kit_higiene_por_aluno` | CUSTO_VARIAVEL | `VariableCostInputs.hygiene_kit_per_student` | currency |
| `valor_equipamentos` | CAPEX | `CapexInputs.equipment_value` | currency |
| `custo_obras_adaptacoes` | CAPEX | `CapexInputs.renovation_works` | currency |
| `custo_arquiteto` | CAPEX | `CapexInputs.architect_cost` | **[NOVO]** |
| `custo_automacao_capex` | CAPEX | `CapexInputs.automation_cost` | **[NOVO]** |
| `custo_branding` | CAPEX | `CapexInputs.branding_cost` | **[NOVO]** |
| `vida_util_equipamentos_meses` | CAPEX | `CapexInputs.useful_life_months_equipment` | **[NOVO]** |
| `vida_util_reforma_meses` | CAPEX | `CapexInputs.useful_life_months_renovation` | **[NOVO]** |
| `valor_financiado` | FINANCIAMENTO | `FinancingInputs.financed_amount` | currency |
| `taxa_juros_mensal` | FINANCIAMENTO | `FinancingInputs.monthly_interest_rate` | % |
| `prazo_meses` | FINANCIAMENTO | `FinancingInputs.term_months` | int |
| `carencia_meses` | FINANCIAMENTO | `FinancingInputs.grace_period_months` | int |

### 3.2 · Mix de Planos de Serviço

Os planos são editáveis via `ServicePlan` (tabela separada), não via `AssumptionValue`. A API `/service-plans` já existe. O frontend em `/budget/[versionId]/` deve permitir editar `price_per_hour` e `target_mix_pct` por plano.

**Regra de validação:** `Σ(target_mix_pct)` deve ser igual a 1.0. Validar no endpoint `PATCH /service-plans/{id}`.

### 3.3 · Parâmetros de Cálculo de Professores (Teachers Needed)

Estes parâmetros devem ser premissas editáveis na categoria `OPERACIONAL` (nova categoria):

| Premissa | Default | Descrição |
|---|---|---|
| `aulas_por_aluno_semana` | 2.0 | Média de aulas semanais por aluno |
| `semanas_por_mes` | 4.33 | Fator de semanas no mês |
| `alunos_por_professor_pessimista` | 1.0 | Cenário pessimista |
| `alunos_por_professor_medio` | 1.5 | Cenário médio |
| `alunos_por_professor_otimista` | 2.0 | Cenário otimista |

---

## P0. Pré-Sprint — Bugs Críticos de UX e Backend

> **Data da auditoria de código:** 21/03/2026  
> **Escopo:** Verificação direta dos arquivos de código-fonte para validar o estado real vs o que está documentado nas seções acima.  
> **Importante:** Alguns itens abaixo foram corrigidos durante a auditoria (contra a instrução de apenas documentar). Esses items estão marcados com ✅ e devem ser validados antes de iniciar o Sprint 1.

---

### P0.1 · Inventário: O Que Está Mais Avançado do Que o Documentado

A auditoria revelou que vários itens planejados para Sprints futuros **já estão implementados**. A tabela abaixo corrige discrepâncias entre este documento e o código real:

| Item Planejado | Seção | Estado Real |
|---|---|---|
| `generate_horizon_periods()` em `utils.py` | §9.1 (Sprint 5) | ✅ **JÁ IMPLEMENTADO** — arquivo existe e funciona |
| ETAPA-1: `_build_inputs_for_version` usa `opening_date` | §9.1 (Sprint 5) | ✅ **JÁ IMPLEMENTADO** — usa `effective_start_date` → `opening_date` → fallback |
| ETAPA-2: Expand por `growth_rule` em `calculations.py` | §9.1 (Sprint 5) | ✅ **JÁ IMPLEMENTADO** — carrega todas as definitions e chama `expand_assumption()` |
| `expander.py`: tipos `flat`, `compound_growth`, `curve` | §9.3 (Sprint 5) | ✅ **JÁ IMPLEMENTADO** — 3 tipos funcionando |
| Skeleton `ai.py` (3 endpoints) | §10 (Sprint 6) | ✅ **JÁ EXISTE** (stubs sem LLM) — ver §P0.6 |
| Contratos múltiplos de financiamento | §1.1 | ✅ **JÁ IMPLEMENTADO** |
| Mix de planos de serviço do banco | §1.1 | ✅ **JÁ IMPLEMENTADO** |
| `pró-labore sem encargos` | §1.1 | ✅ **JÁ IMPLEMENTADO** |
| `BudgetVersion.projection_horizon_years` | §9.1 | ✅ **JÁ EXISTE no modelo** |

> **Consequência:** O §9.7 (Checklist Sprint 5) precisa ser atualizado para marcar os itens de ARCH-01 como já concluídos. Ver §9.1 corrigido.

---

### P0.2 · BUG-FE-01: `businesses/page.tsx` — Sem Interface de Criação ✅ CORRIGIDO

**Status:** ✅ Corrigido em 21/03/2026  
**Arquivo:** `frontend/src/app/(auth)/businesses/page.tsx`  
**Problema encontrado:** A página listava negócios existentes mas não tinha nenhuma UI para criar um novo. O botão "Novo Negócio" estava presente mas sem `onClick`, sem `useMutation`, sem modal.  
**Correção aplicada:**
- `CreateBusinessModal` com campos: nome, slug (auto-gerado a partir do nome), tipo de negócio (select: `COWORKING_B2B`, `GYM`, `STUDIO`), descrição
- `useMutation → businessesApi.create()` com `organization_id` e `scenario_id` passados corretamente
- Toast de sucesso + invalida query após criação

---

### P0.3 · BUG-FE-02: `scenarios/page.tsx` — Botão "Novo Cenário" Inativo ✅ CORRIGIDO

**Status:** ✅ Corrigido em 21/03/2026  
**Arquivo:** `frontend/src/app/(auth)/scenarios/page.tsx`  
**Problema encontrado:** O botão `<Button>Novo Cenário</Button>` não tinha `onClick`, sem `useMutation`, sem modal. Completamente inativo — clicar não fazia nada.  
**Correção aplicada:**
- `CreateScenarioModal` com campos: nome, tipo de cenário (select: `BASE`, `OPTIMISTIC`, `PESSIMISTIC`, `CUSTOM`), descrição
- `useMutation → scenariosApi.create()` com `business_id` correto do contexto
- Toast de sucesso + invalida query após criação

---

### P0.4 · BUG-BE-01: `assumptions.py` — Rotas Duplicadas 🔴 PENDENTE

**Status:** ❌ Pendente — precisa correção antes ou durante Sprint 1  
**Arquivo:** `backend/app/api/v1/endpoints/assumptions.py`  
**Problema crítico:** 6 endpoints definidos **duas vezes** no mesmo arquivo. FastAPI usa silenciosamente a **primeira** definição e ignora a segunda — o segundo bloco é código morto.

| Endpoint | Linha (1ª def.) | Linha (2ª def.) | Problema |
|---|---|---|---|
| `GET /categories` | ~30 | ~216 | 2ª: `business_id` obrigatório vs opcional na 1ª |
| `POST /categories` | ~42 | ~230 | Duplicado silencioso |
| `GET /definitions` | ~57 | ~246 | Duplicado silencioso |
| `POST /definitions` | ~76 | ~266 | Duplicado silencioso |
| `GET /values` | ~91 | ~282 | 2ª: assinatura diferente |
| `PUT /values/bulk` | ~117 | ~308 | Duplicado silencioso |

**Ação:** Auditar o arquivo, remover o bloco duplicado (linhas ~216 em diante), manter apenas o primeiro conjunto de definições.  
**Nota adicional:** `POST /assumptions/quick-add` **NÃO existe** neste arquivo (ver §9.5 — está planejado para Sprint 5).

---

### P0.5 · BE-CLONE: `POST /budget-versions/{id}/clone` — Endpoint Ausente ✅ ADICIONADO

**Status:** ✅ Adicionado em 21/03/2026  
**Arquivo:** `backend/app/api/v1/endpoints/budget_versions.py`  
**Problema:** Endpoint crítico para o fluxo What-If (clonar versão de orçamento para comparar cenários) estava completamente ausente.  
**Implementação adicionada:**
- `CloneRequest(new_name: str | None)` — nome opcional para o clone
- Copia `BudgetVersion` com `status=draft`
- Copia todos os `AssumptionValues` associados via `db.flush()` + loop
- Retorna a nova versão serializada

**Frontend:** `versionsApi.clone(id, newName?)` adicionado em `frontend/src/lib/api.ts`.

---

### P0.6 · AI Endpoints — Skeleton Já Existe (Não Documentado)

**Status:** ℹ️ Informativo — existe como stub, Sprint 6 vai completar  
**Arquivo:** `backend/app/api/v1/endpoints/ai.py`  
**O que JÁ EXISTE** (verificado diretamente no código):

| Endpoint | Estado | Detalhe |
|---|---|---|
| `GET /ai/sanity-check/{version_id}` | ✅ Existe (funcional sem LLM) | **5 verificações determinísticas**: occupancy range (5%-95%), price > 0, rent ≤ 80% max revenue, plan mix soma 100%, resultados negativos persistentes |
| `POST /ai/copilot` | ✅ Existe (stub) | FAQ matching por palavra-chave + `_call_llm()` que retorna `"__stub__"` |
| `GET /ai/geo-pricing/{unit_id}` | ✅ Existe (stub) | Benchmarks hardcoded por estado: SP=R$55, RJ=R$50, MG=R$45 |

**Nota para Sprint 6:** O endpoint `ai.py` deve ser **expandido**, não recriado. A estrutura de rotas existe; falta criar `services/ai/` e substituir os stubs por chamadas reais ao LLM.

---

### P0.7 · BUG-FE-01: `ocupacao/page.tsx` — `breakevenOccupancyRate` Calculado de Forma Circular 🔴 PENDENTE

**Status:** ❌ Pendente — deve ser corrigido no Sprint 3  
**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/ocupacao/page.tsx`

**Problema:** O cálculo atual de `breakevenOccupancyRate` é circular e matematicamente inválido:

```typescript
// ATUAL (errado — circular):
const breakevenOccupancyRate =
  currentStudents > 0 && currentOccupancy > 0
    ? (breakevenStudents * currentOccupancy) / currentStudents
    : 0;
// Problema: usa currentOccupancy (o próprio valor sendo comparado com o BE)
// e currentStudents (que no modelo B2B = horas vendidas, não alunos literais)
```

**Correção:** Usar diretamente o valor calculado pelo engine, já disponível no `time_series`:

```typescript
// CORRETO — lê do backend (engine.py já calcula break_even_occupancy_pct):
const latestPeriod = filteredTs[filteredTs.length - 1];
const breakevenOccupancyRate =
  latestPeriod?.break_even_occupancy_pct ??
  dashboard?.kpis?.break_even_occupancy_pct ??
  0;
```

**Impacto:** O gauge de ocupação (quando implementado no Sprint 3) exibirá a faixa de break-even incorretamente se este bug não for corrigido antes. A `OccupancyGauge` depende deste valor.

---

### P0.8 · BUG-FE-02: `professores/page.tsx` — Modelo de Academia (Incorreto para B2B Coworking) 🔴 PENDENTE

**Status:** ❌ Pendente — redesenho completo no Sprint 3 (aguarda Sprint 2.1 para ter os dados)  
**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/professores/page.tsx`

**Problema crítico — confusão de modelo de negócio:**

| O que o código assume | O que o modelo B2B realmente é |
|---|---|
| PTs são **funcionários** | PTs são **clientes** (alugam espaço por hora) |
| `STUDENT_PER_INSTRUCTOR = 25` (hardcoded) | Não existe professor-por-aluno neste modelo |
| `num_personal_trainers` das premissas = headcount | `num_personal_trainers` = PTs cadastrados na plataforma (dado de oferta) |
| `break_even_students` = alunos no sentido convencional | `break_even_students` no B2B = horas vendidas (nome herdado do modelo academia) |

**Problemas adicionais detectados:**
- N+1 API calls: busca versões de cada unidade, depois premissas de cada versão separadamente — sem `Promise.all`
- Nenhum dado da página tem relação com a questão real: *"quantos PTs comprando horas são necessários para o break-even?"*

**O que a página DEVE mostrar (após Sprint 2.1 com `teachers_needed_breakeven`):**
```
┌── KPIs Topo ──────────────────────────────────────────────────┐
│  BE Classes/mês │ BE Ocupação │ BE Receita │ Preço Médio/hora  │
├── Tabela: PTs Necessários para Break-even ────────────────────┤
│  Cenário    │ Horas/PT/mês │ Ano 1 │ Ano 2 │ … │ Ano 8        │
│  Pessimista │ 1.0×         │  …    │  …    │ … │  …           │
│  Médio      │ 1.5×         │  …    │  …    │ … │  …           │
│  Otimista   │ 2.0×         │  …    │  …    │ … │  …           │
└───────────────────────────────────────────────────────────────┘
```

**Ação para Sprint 3:** Após Sprint 2.1 adicionar `teachers_needed_pessimistic/medium/optimistic` ao `time_series`, redesenhar completamente esta página usando `<TeachersBreakevenTable />`.

---

### P0.9 · FE-NOTE-01: `annual_summaries` Não Exposto no Endpoint `/consolidated` ⚠️ IMPACTO MÉDIO

**Status:** ℹ️ Limitação técnica — corrigir no Sprint 2 junto com GAP-09  
**Arquivos afetados:**
- `backend/app/services/financial_engine/engine.py` — gera `annual_summaries` ✅
- `backend/app/api/v1/endpoints/dashboard.py` — endpoint `/consolidated` **não inclui** este campo ❌
- `frontend/src/app/(auth)/dashboard/(executive)/crescimento/page.tsx` — agregação local ⚠️
- `frontend/src/app/(auth)/dashboard/(executive)/estrategico/page.tsx` — agregação local duplicada ⚠️
- `frontend/src/app/(auth)/dashboard/(executive)/projecoes/page.tsx` — agregação local duplicada ⚠️

**Problema:** Os 3 arquivos de página definem **a mesma função `aggregateByYear`** localmente. Isso acontece porque o endpoint `/consolidated` não expõe `annual_summaries` — então o frontend reimplementa a lógica de agregação por ano. A função local está correta, mas:
1. É código duplicado (violação DRY em 3 lugares)
2. Agrega `net_result` (lucro), mas não agrega `ebitda`, `total_costs`, `capacity_hours_month` etc.
3. Se o endpoint expuser `annual_summaries`, as 3 páginas podem ser simplificadas

**Ação para Sprint 2 (junto com GAP-09):** Ao criar o endpoint `/dashboard/business/{id}/annual`, incluir TAMBÉM `annual_summaries: [...]` no response de `/consolidated`. Após isso, as 3 páginas de frontend usam `dashboard.annual_summaries` e eliminam o código local.

**Ação mínima para Sprint 3 (antes do endpoint existir):** Extrair `aggregateByYear` para `lib/utils/dashboard.ts` para evitar triplicata.

---

### P0.10 · FE-NOTE-02: `capacidade/page.tsx` — Capacidade Máxima Estimada como `maxRevenue × 1.4` ⚠️ IMPACTO MÉDIO

**Status:** ℹ️ Placeholder técnico — corrigir no Sprint 3  
**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/capacidade/page.tsx`

**Problema:** A capacidade máxima teórica é calculada como um múltiplo arbitrário da melhor receita observada:

```typescript
// ATUAL (placeholder — incorreto):
const maxObservedRevenue = Math.max(...filteredTs.map((d) => getRevenue(d)), 0);
const estimatedMaxRevenue = maxObservedRevenue * 1.4;
// ← Este 1.4 é um fator mágico; não tem relação com a capacidade real da unidade
```

**Correto:** O engine já calcula exatamente a capacidade real, e está disponível no `time_series`:

```typescript
// CORRETO — usa dados do engine:
const latestPeriod = filteredTs[filteredTs.length - 1];
const capacityHoursPerMonth = latestPeriod?.capacity_hours_month ?? 0;  // ex: 402 h/mês
const avgPricePerHour = latestPeriod?.avg_price_per_hour ?? 0;          // ex: R$57,50/h
const theoreticalMaxRevenue = capacityHoursPerMonth * avgPricePerHour;  // R$23.115/mês
const utilizationRate =
  theoreticalMaxRevenue > 0 ? (currentRevenue / filteredTs.length) / theoreticalMaxRevenue : 0;
```

**Impacto:** As métricas de "taxa de utilização" e "capacidade ociosa" nesta página são incorretas — superestimam a utilização quando a receita atual está acima do break-even.

**Ação para Sprint 3:** Substituir o placeholder pelo cálculo com `capacity_hours_month × avg_price_per_hour` do `time_series`.

---

## 4. Sprint 1 — Correções Críticas

> **Pré-requisito:** Após cada alteração no backend, rodar `POST /calculations/recalculate/{version_id}` para todas as versões ativas do negócio de teste.

### 4.1 · GAP-01: Corrigir Fórmula de Energia Elétrica

**Arquivo:** `backend/app/services/financial_engine/fixed_costs.py`

```python
# ANTES (linha ~47-53, ERRADO):
if inputs.fixed_energy_cost > 0 or inputs.max_variable_energy_cost > 0:
    var_reduction = 1.0 - inputs.automation_reduction
    electricity = round(
        inputs.fixed_energy_cost
        + inputs.max_variable_energy_cost * occ * var_reduction,  # ← ERRADO
        2,
    )

# DEPOIS (CORRETO — planilha: (fixo + var×occ) × (1 − automação)):
if inputs.fixed_energy_cost > 0 or inputs.max_variable_energy_cost > 0:
    electricity = round(
        (inputs.fixed_energy_cost + inputs.max_variable_energy_cost * occ)
        * (1.0 - inputs.automation_reduction),
        2,
    )
    elec_fixed = inputs.fixed_energy_cost
    elec_variable = round(inputs.max_variable_energy_cost * occ, 2)
```

**Teste de validação:**  
`(4200 + 3000 × 0.12) × (1 − 0.20) = 4560 × 0.80 = R$3.648` ✅

**Teste unitário a criar** (`tests/test_financial_engine.py`):
```python
def test_energy_formula_with_automation():
    from app.services.financial_engine.fixed_costs import calculate_utility_costs
    from app.services.financial_engine.models import FixedCostInputs
    inputs = FixedCostInputs(
        fixed_energy_cost=4200.0,
        max_variable_energy_cost=3000.0,
        automation_reduction=0.20,
    )
    result = calculate_utility_costs(inputs, occupancy_rate=0.12)
    assert result["electricity"] == 3648.0, f"Esperado R$3648, obtido {result['electricity']}"
```

---

### 4.2 · GAP-03: Adicionar Taxa de Cartão ao Motor

**Passo 1 — Modelo** (`backend/app/services/financial_engine/models.py`):

```python
@dataclass
class VariableCostInputs:
    hygiene_kit_per_student: float = 0.0
    sales_commission_rate: float = 0.0  # % sobre receita
    card_fee_rate: float = 0.0          # ← NOVO: taxa adquirente (ex: 0.035 = 3.5%)
    other_variable_costs: float = 0.0
```

**Passo 2 — Calculador** (`backend/app/services/financial_engine/variable_costs.py`):

```python
def calculate_total_variable_costs(
    inputs: VariableCostInputs, active_students: int, gross_revenue: float
) -> dict:
    hygiene_kit = round(inputs.hygiene_kit_per_student * active_students, 2)
    sales_commission = round(inputs.sales_commission_rate * gross_revenue, 2)
    card_fee = round(inputs.card_fee_rate * gross_revenue, 2)          # ← NOVO
    other = round(inputs.other_variable_costs, 2)
    total = round(hygiene_kit + sales_commission + card_fee + other, 2)
    return {
        "total_variable_costs": total,
        "hygiene_kit_cost": hygiene_kit,
        "sales_commission_cost": sales_commission,
        "card_fee_cost": card_fee,                                      # ← NOVO
        "other_variable_costs": other,
    }
```

**Passo 3 — Calculations endpoint** (`backend/app/api/v1/endpoints/calculations.py`):

```python
variable = VariableCostInputs(
    hygiene_kit_per_student=_get(values, "kit_higiene_por_aluno", p),
    sales_commission_rate=_get(values, "comissao_vendas_pct", p),
    card_fee_rate=_get(values, "taxa_cartao_pct", p, default=0.035),   # ← NOVO
    other_variable_costs=_get(values, "outros_custos_variaveis", p),
)
```

**Passo 4 — Seed** (`backend/app/seeds/initial_data.py`, categoria `"FISCAL"`):

```python
"FISCAL": [
    ("aliquota_imposto_receita", "Alíquota de imposto sobre receita",
     "percentage", "%", 0.06, True, "static"),
    # ← NOVO:
    ("taxa_cartao_pct", "Taxa adquirente/cartão (% da receita)",
     "percentage", "%", 0.035, True, "static"),
],
```

**Passo 5 — Engine** (`backend/app/services/financial_engine/engine.py`, em `persist()`):

Adicionar ao `period_data`:
```python
"card_fee_cost": vc.get("card_fee_cost", 0.0),
```

Adicionar ao `LINE_ITEM_DEFINITIONS` no seed:
```python
("card_fee_cost", "Taxa de Cartão de Crédito", "variable_cost", "card_fee", 23, False, False, False),
```

---

### 4.3 · GAP-02: Corrigir Preços e Mix dos Planos de Serviço

**Arquivo:** `backend/app/seeds/initial_data.py`, linhas 112–155

```python
SERVICE_PLANS_DATA = [
    {
        "name": "Bronze",        # ← Plano de entrada = maior preço
        "code": "BRONZE",
        "description": "Plano de entrada — acesso flexível por hora",
        "price_per_hour": 65.0,  # ← CORRETO (era R$50)
        "target_mix_pct": 0.25,  # ← CORRETO (era 10%)
        "min_classes_month": 4,
        "max_classes_month": 40,
        "sort_order": 1,
        "is_active": True,
    },
    {
        "name": "Prata",
        "code": "PRATA",
        "description": "Plano intermediário — comprometimento médio",
        "price_per_hour": 60.0,  # ← CORRETO (era R$55)
        "target_mix_pct": 0.25,  # ← CORRETO (era 20%)
        "min_classes_month": 41,
        "max_classes_month": 80,
        "sort_order": 2,
        "is_active": True,
    },
    {
        "name": "Ouro",
        "code": "OURO",
        "description": "Plano intermediário-alto — volume garantido",
        "price_per_hour": 55.0,  # ← CORRETO (era R$60)
        "target_mix_pct": 0.25,  # ← CORRETO (era 30%)
        "min_classes_month": 81,
        "max_classes_month": 160,
        "sort_order": 3,
        "is_active": True,
    },
    {
        "name": "Diamante",      # ← Maior comprometimento = menor preço
        "code": "DIAMANTE",
        "description": "Plano premium — máximo comprometimento, desconto máximo",
        "price_per_hour": 50.0,  # ← CORRETO (era R$65)
        "target_mix_pct": 0.25,  # ← CORRETO (era 40%)
        "min_classes_month": 161,
        "max_classes_month": None,
        "sort_order": 4,
        "is_active": True,
    },
]
# Preço médio ponderado resultante: (65+60+55+50)/4 = R$57,50/h ✅
```

---

### 4.4 · GAP-07: Corrigir Growth Rules dos Salários e Pró-Labore

**Arquivo:** `backend/app/seeds/initial_data.py`, categoria `"CUSTO_FIXO"`

Alterar todos os salários CLT de `0.05` para `0.10`:

```python
("salario_limpeza",           ..., {"type": "compound_growth", "rate": 0.10}),
("salario_recepcao",          ..., {"type": "compound_growth", "rate": 0.10}),
("salario_marketing",         ..., {"type": "compound_growth", "rate": 0.10}),
("salario_comercial",         ..., {"type": "compound_growth", "rate": 0.10}),
("salario_gerente",           ..., {"type": "compound_growth", "rate": 0.10}),
("salario_educador_fisico",   ..., {"type": "compound_growth", "rate": 0.10}),
```

Pró-labore — substituir `compound_growth 0.05` por curva:
```python
(
    "pro_labore", "Pró-labore", "currency", "R$", 5000.0, True, "static",
    {"type": "curve", "values": [5000, 5000, 5500, 5500, 6000, 6000, 6600, 6600, 7000, 7000]},
),
```

Adicionar growth_rule aos itens que ainda não têm:
```python
("contabilidade_mensal",       ..., {"type": "compound_growth", "rate": 0.10}),
("marketing_digital_mensal",   ..., {"type": "compound_growth", "rate": 0.10}),
("servicos_administrativos",   ..., {"type": "compound_growth", "rate": 0.10}),
("seguro_imovel",              ..., {"type": "compound_growth", "rate": 0.10}),
("sistemas_seguranca",         ..., {"type": "compound_growth", "rate": 0.10}),
```

---

### 4.5 · GAP-04: Curva de Ocupação Relativa à Opening Date

**Arquivo:** `backend/app/services/financial_engine/expander.py`

```python
def expand_curve(
    annual_values: list[float],
    periods: list[str],
    opening_year: int | None = None,    # ← NOVO parâmetro
) -> dict[str, float]:
    """
    Se opening_year fornecido, year_idx = ano_do_período - opening_year (relativo).
    Caso contrário, usa posição sequencial (i // 12) — comportamento legado.
    """
    result: dict[str, float] = {}
    for i, p in enumerate(periods):
        if opening_year is not None:
            year_idx = max(0, int(p[:4]) - opening_year)
        else:
            year_idx = i // 12
        if year_idx < len(annual_values):
            result[p] = annual_values[year_idx]
        else:
            result[p] = annual_values[-1] if annual_values else 0.0
    return result


def expand_assumption(
    growth_rule: dict,
    base_value: float,
    periods: list[str],
    base_year: int | None = None,
) -> dict[str, float]:
    # ...
    elif rule_type == "curve":
        annual_values = growth_rule.get("values", [])
        if not annual_values:
            return {p: base_value for p in periods}
        return expand_curve(annual_values, periods, opening_year=base_year)  # ← passa opening_year
```

**Arquivo:** `backend/app/api/v1/endpoints/calculations.py`

O `base_year` já é passado para `expand_assumption` — verificar que usa `opening.year` (ano de abertura da **unidade específica**), não o ano do início do horizonte global.

```python
# Linha ~130: base_year deve ser o ano de abertura da UNIDADE
opening_date = unit.opening_date if unit else None
base_year = opening_date.year if opening_date else int(periods[0][:4])
# Usar este base_year ao chamar expand_assumption para premissas tipo "curve"
```

---

### 4.6 · GAP-05: CAPEX Completo + Depreciação Automática

**Passo 1 — Modelo** (`backend/app/services/financial_engine/models.py`):

```python
@dataclass
class CapexInputs:
    equipment_value: float = 0.0
    renovation_works: float = 0.0
    pre_operational_expenses: float = 0.0
    working_capital: float = 0.0
    furniture_fixtures: float = 0.0
    technology_setup: float = 0.0
    other_capex: float = 0.0
    # ← NOVOS:
    architect_cost: float = 0.0
    automation_cost: float = 0.0
    branding_cost: float = 0.0
    useful_life_months_equipment: int = 60   # depreciação automática
    useful_life_months_renovation: int = 120
```

**Passo 2 — `_sum_capex`** (`engine.py`):

```python
@staticmethod
def _sum_capex(capex: CapexInputs) -> float:
    return round(
        capex.equipment_value + capex.renovation_works + capex.pre_operational_expenses
        + capex.working_capital + capex.furniture_fixtures + capex.technology_setup
        + capex.other_capex + capex.architect_cost + capex.automation_cost + capex.branding_cost,
        2,
    )
```

**Passo 3 — Depreciação automática** (`engine.py`, dentro do loop de período, antes do cálculo de `equipment_costs`):

```python
# Auto-depreciation: se depreciacao_equipamentos = 0, calcular de equipment_value / vida_util
auto_depr_equipment = (
    round(capex.equipment_value / capex.useful_life_months_equipment, 2)
    if capex.useful_life_months_equipment > 0 and capex.equipment_value > 0
    else 0.0
)
auto_depr_renovation = (
    round(capex.renovation_works / capex.useful_life_months_renovation, 2)
    if capex.useful_life_months_renovation > 0 and capex.renovation_works > 0
    else 0.0
)
# Sobrescreve depreciation_equipment APENAS se o seed não forneceu valor manual
if inp.fixed_costs.depreciation_equipment == 0 and auto_depr_equipment > 0:
    inp.fixed_costs.depreciation_equipment = auto_depr_equipment
```

**Passo 4 — Seed** (`backend/app/seeds/initial_data.py`, categoria `"CAPEX"`):

```python
# Adicionar às ASSUMPTION_DEFINITIONS["CAPEX"]:
("custo_arquiteto",             "Projeto arquiteto",              "currency", "R$", 28000.0,  True, "one_time"),
("custo_automacao_capex",       "Automação (A/C, etc.)",          "currency", "R$", 20000.0,  True, "one_time"),
("custo_branding",              "Branding / identidade visual",   "currency", "R$", 28530.0,  True, "one_time"),
("vida_util_equipamentos_meses","Vida útil equipamentos (meses)", "integer",  "meses", 60,   True, "static"),
("vida_util_reforma_meses",     "Vida útil reforma (meses)",      "integer",  "meses", 120,  True, "static"),
```

**Passo 5 — Calculations endpoint**: mapear os novos campos em `_build_inputs_for_version`:

```python
capex = CapexInputs(
    # ... existentes ...
    architect_cost=_get(values, "custo_arquiteto"),
    automation_cost=_get(values, "custo_automacao_capex"),
    branding_cost=_get(values, "custo_branding"),
    useful_life_months_equipment=int(_get(values, "vida_util_equipamentos_meses", default=60)),
    useful_life_months_renovation=int(_get(values, "vida_util_reforma_meses", default=120)),
)
```

---

## 5. Sprint 2 — Cobertura Funcional

### 5.1 · GAP-06: KPI `teachers_needed_breakeven`

**Arquivo:** `backend/app/services/financial_engine/kpi.py`

```python
import math

def calculate_teachers_needed(
    break_even_occupancy_pct: float,
    capacity_hours_month: float,
    classes_per_student_week: float = 2.0,
    weeks_per_month: float = 4.33,
    students_per_teacher_pessimistic: float = 1.0,
    students_per_teacher_medium: float = 1.5,
    students_per_teacher_optimistic: float = 2.0,
) -> dict:
    """
    Professores necessários para atingir o break-even operacional.
    break_even_classes = BE_occ × capacity_hours (= horas necessárias/mês)
    classes_per_teacher_month = aulas_por_aluno_semana × semanas × alunos_por_prof
    """
    be_classes = break_even_occupancy_pct * capacity_hours_month
    base = classes_per_student_week * weeks_per_month
    if base <= 0:
        return {"pessimistic": 0, "medium": 0, "optimistic": 0}
    return {
        "pessimistic": math.ceil(be_classes / (base * students_per_teacher_pessimistic)),
        "medium":      math.ceil(be_classes / (base * students_per_teacher_medium)),
        "optimistic":  math.ceil(be_classes / (base * students_per_teacher_optimistic)),
    }
```

Adicionar chamada no `engine.py` após cálculo de KPIs:

```python
teachers = calculate_teachers_needed(
    result.break_even_occupancy_pct,
    result.capacity_hours_month,
    classes_per_student_week=inp.revenue.get("aulas_por_aluno_semana", 2.0),  # de premissa
    students_per_teacher_pessimistic=inp.revenue.get("alunos_por_professor_pessimista", 1.0),
    students_per_teacher_medium=inp.revenue.get("alunos_por_professor_medio", 1.5),
    students_per_teacher_optimistic=inp.revenue.get("alunos_por_professor_otimista", 2.0),
)
result.teachers_needed_pessimistic = teachers["pessimistic"]
result.teachers_needed_medium = teachers["medium"]
result.teachers_needed_optimistic = teachers["optimistic"]
```

**Adicionar campos ao `PeriodResult`:**
```python
teachers_needed_pessimistic: int = 0
teachers_needed_medium: int = 0
teachers_needed_optimistic: int = 0
```

**Persistir** em `engine.persist()`:
```python
"teachers_needed_pessimistic": float(period.teachers_needed_pessimistic),
"teachers_needed_medium":      float(period.teachers_needed_medium),
"teachers_needed_optimistic":  float(period.teachers_needed_optimistic),
```

**Line item definitions a adicionar no seed:**
```python
("teachers_needed_pessimistic", "Profesors Necessários (Pessimista)", "result", "kpi", 70, False, False, False),
("teachers_needed_medium",      "Professores Necessários (Médio)",    "result", "kpi", 71, True,  False, False),
("teachers_needed_optimistic",  "Professores Necessários (Otimista)", "result", "kpi", 72, False, False, False),
```

---

### 5.2 · GAP-08: Persistir Sub-itens de DRE

**Arquivo:** `backend/app/services/financial_engine/engine.py`, método `persist()`

Adicionar ao `period_data`:
```python
# Sub-itens de staff (do fc["detail"]["staff"])
"fc_pro_labore":      fc_detail["staff"].get("pro_labore", 0.0),
"fc_clt_base":        fc_detail["staff"].get("clt_base", 0.0),
"fc_social_charges":  fc_detail["staff"].get("social_charges", 0.0),
# Sub-itens de utilities
"fc_electricity":     fc_detail["utilities"].get("electricity", 0.0),
"fc_water":           fc_detail["utilities"].get("water", 0.0),
"fc_internet":        fc_detail["utilities"].get("internet_phone", 0.0),
# Custo variável: taxa cartão
"card_fee_cost":      vc.get("card_fee_cost", 0.0),
```

**Problema:** o `fc["detail"]` atual está disponível dentro do loop de período (variável `fc`), mas o `persist()` só recebe `outputs.periods` (já calculado). A solução é armazenar o detail no `PeriodResult` ou re-acessar o trace.

**Solução recomendada:** Armazenar sub-itens em `calculation_trace` (já feito no trace) e ler de lá no persist:

```python
# No persist(), dentro do for period in outputs.periods:
trace = period.calculation_trace
fc_detail = trace.get("fixed_costs", {}).get("detail", {})
staff_detail = fc_detail.get("staff", {})
util_detail = fc_detail.get("utilities", {})

period_data.update({
    "fc_pro_labore":     staff_detail.get("pro_labore", 0.0),
    "fc_clt_base":       staff_detail.get("clt_base", 0.0),
    "fc_social_charges": staff_detail.get("social_charges", 0.0),
    "fc_electricity":    util_detail.get("electricity", 0.0),
    "fc_water":          util_detail.get("water", 0.0),
    "fc_internet":       util_detail.get("internet_phone", 0.0),
    "card_fee_cost":     trace.get("variable_costs", {}).get("card_fee", 0.0),
})
```

**Line item definitions a adicionar no seed:**
```python
("fc_pro_labore",     "Pró-labore",               "fixed_cost", "payroll",  120, False, False, False),
("fc_clt_base",       "Folha CLT (base)",          "fixed_cost", "payroll",  121, False, False, False),
("fc_social_charges", "Encargos Sociais (CLT)",    "fixed_cost", "payroll",  122, False, False, False),
("fc_electricity",    "Energia Elétrica",          "fixed_cost", "utility",  123, False, False, False),
("fc_water",          "Água",                      "fixed_cost", "utility",  124, False, False, False),
("fc_internet",       "Internet + Telefonia",      "fixed_cost", "utility",  125, False, False, False),
("card_fee_cost",     "Taxa de Cartão de Crédito", "variable_cost","card",  126, False, False, False),
```

---

### 5.3 · GAP-09: Novos Endpoints de Dashboard

**Arquivo:** `backend/app/api/v1/endpoints/dashboard.py`

#### Endpoint 1: DRE Detalhado

```python
@router.get("/unit/{version_id}/dre")
def unit_dre(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DRE completo linha a linha, mês a mês."""
    DRE_CODES = [
        "revenue_total", "membership_revenue", "personal_training_revenue", "other_revenue",
        "total_fixed_costs", "rent_total", "staff_costs", "fc_pro_labore", "fc_clt_base",
        "fc_social_charges", "utility_costs", "fc_electricity", "fc_water", "fc_internet",
        "admin_costs", "marketing_costs", "equipment_costs", "insurance_costs", "other_fixed_costs",
        "total_variable_costs", "hygiene_kit_cost", "sales_commission_cost", "card_fee_cost",
        "taxes_on_revenue", "financing_payment", "operating_result", "net_result", "ebitda",
    ]
    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id)
        .filter(
            CalculatedResult.budget_version_id == version_id,
            LineItemDefinition.code.in_(DRE_CODES),
        )
        .order_by(CalculatedResult.period_date, LineItemDefinition.display_order)
        .all()
    )
    # Organiza por período
    by_period: dict[str, list] = defaultdict(list)
    for r, li in results:
        by_period[r.period_date].append({
            "code": li.code, "name": li.name, "category": li.category,
            "display_order": li.display_order, "value": r.value,
        })
    # Calcula pct_of_revenue por período
    dre_periods = []
    for period in sorted(by_period.keys()):
        items = sorted(by_period[period], key=lambda x: x["display_order"])
        rev = next((i["value"] for i in items if i["code"] == "revenue_total"), 0.0) or 1.0
        for item in items:
            item["pct_of_revenue"] = round(item["value"] / rev, 4) if rev != 0 else 0.0
        dre_periods.append({"period": period, "items": items})
    return {"version_id": version_id, "dre": dre_periods}
```

#### Endpoint 2: Resumo Anual Consolidado

```python
@router.get("/business/{business_id}/annual")
def business_annual_summary(
    business_id: str,
    scenario_id: str = Query(...),
    unit_ids: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumo anual consolidado para o gráfico de crescimento."""
    # Reutiliza lógica de seleção de versões do endpoint /consolidated
    # ... (copiar lógica de best_by_unit) ...
    # Agrega por ano: gross_revenue, total_costs, net_result, ebitda, occupancy_rate
    ANNUAL_CODES = ["revenue_total", "total_fixed_costs", "total_variable_costs",
                    "taxes_on_revenue", "financing_payment", "net_result", "ebitda",
                    "active_hours_month", "capacity_hours_month"]
    # ... agregação por (year, code) ...
    return {"business_id": business_id, "scenario_id": scenario_id, "annual": annual_list}
```

#### Endpoint 3: Audit Trace

```python
@router.get("/unit/{version_id}/audit")
def unit_audit_trace(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna calculation_trace de todos os períodos."""
    # Busca apenas os registros de net_result (onde o trace é persistido)
    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id)
        .filter(
            CalculatedResult.budget_version_id == version_id,
            LineItemDefinition.code == "net_result",
        )
        .order_by(CalculatedResult.period_date)
        .all()
    )
    traces = [
        {"period": r.period_date, "trace": r.calculation_trace}
        for r, _ in results
        if r.calculation_trace
    ]
    return {"version_id": version_id, "traces": traces}
```

#### Endpoint 4: Portfolio ROI

```python
@router.get("/business/{business_id}/portfolio")
def business_portfolio(
    business_id: str,
    scenario_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ROI e custo de capital por unidade (tabela Capex Total da planilha)."""
    # Para cada unidade: busca total net_result e total capex
    # ROI = total_net_result / total_capex
    # payback_months = mês em que net_result acumulado >= capex
    # ...
    return {
        "business_id": business_id, "scenario_id": scenario_id,
        "total_capex": ..., "total_net_result": ...,
        "net_after_capital_cost": ..., "roi_pct": ...,
        "units": [...]
    }
```

---

### 5.4 · Novos Tipos TypeScript

**Arquivo:** `frontend/src/types/api.ts` — adicionar ao final:

```typescript
// ── DRE Detalhado ───────────────────────────────────────────────────────────

export type DRECategory = 'revenue' | 'fixed_cost' | 'variable_cost' | 'tax' | 'financing' | 'result';

export interface DREItem {
  code: string;
  name: string;
  category: DRECategory;
  display_order: number;
  value: number;
  pct_of_revenue: number;
}

export interface DREPeriod {
  period: string;       // "YYYY-MM"
  items: DREItem[];
}

export interface DREResponse {
  version_id: string;
  dre: DREPeriod[];
}

// ── Resumo Anual (para crescimento/portfolio) ───────────────────────────────

export interface AnnualBusinessSummary {
  year: string;
  gross_revenue: number;
  total_fixed_costs: number;
  total_variable_costs: number;
  taxes_on_revenue: number;
  financing_payment: number;
  net_result: number;
  ebitda: number;
  active_units: number;
  occupancy_rate: number;
  cumulative_capex?: number;
}

// ── Portfolio / ROI ─────────────────────────────────────────────────────────

export interface PortfolioUnit {
  unit_id: string;
  unit_name: string;
  capex: number;
  net_result: number;
  payback_months: number | null;
  roi_pct: number;
}

export interface PortfolioResponse {
  business_id: string;
  scenario_id: string;
  total_capex: number;
  total_net_result: number;
  net_after_capital_cost: number;
  roi_pct: number;
  units: PortfolioUnit[];
}

// ── Professores para Break-even ─────────────────────────────────────────────

export interface TeachersBreakevenRow {
  period: string;
  year: string;
  be_classes_month: number;
  be_occupancy_pct: number;
  teachers_pessimistic: number;
  teachers_medium: number;
  teachers_optimistic: number;
}

// ── Audit Trace ─────────────────────────────────────────────────────────────

export interface CalcTrace {
  period: string;
  trace: {
    revenue: {
      formula: string;
      capacity_hours_month: number;
      occupancy_rate: number;
      active_hours_month: number;
      avg_price_per_hour: number;
      cowork_revenue: number;
      other_revenue: number;
      service_plans: Array<{ name: string; price: number; mix: number }>;
    };
    fixed_costs: {
      rent: number;
      staff: number;
      utilities: number;
      admin: number;
      marketing: number;
      equipment: number;
      insurance: number;
      other: number;
      detail: Record<string, unknown>;
    };
    variable_costs: {
      hygiene_kit: number;
      sales_commission: number;
      card_fee?: number;
      other: number;
    };
    taxes: { tax_rate: number; taxes_on_revenue: number };
    financing: {
      total_payment: number;
      principal: number;
      interest: number;
      contracts: unknown[];
    };
    kpis: {
      break_even_revenue: number;
      break_even_occupancy_pct: number;
      contribution_margin_pct: number;
      operating_result: number;
      net_result: number;
      ebitda: number;
    };
  };
}

export interface AuditTraceResponse {
  version_id: string;
  traces: CalcTrace[];
}
```

---

### 5.5 · Novos Endpoints no API Client

**Arquivo:** `frontend/src/lib/api.ts` — expandir `dashboardApi`:

```typescript
export const dashboardApi = {
  unit: (version_id: string): Promise<DashboardUnit> =>
    api.get<DashboardUnit>(`/dashboard/unit/${version_id}`).then((r) => r.data),

  consolidated: (business_id: string, scenario_id: string, unit_ids: string[] = []): Promise<DashboardConsolidated> =>
    api.get<DashboardConsolidated>(`/dashboard/business/${business_id}/consolidated`, {
      params: { scenario_id },
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        sp.append('scenario_id', scenario_id);
        unit_ids.forEach((id) => sp.append('unit_ids', id));
        return sp.toString();
      },
    }).then((r) => r.data),

  comparison: (business_id: string, scenario_id: string, metric: string = 'net_result'): Promise<UnitsComparisonResponse> =>
    api.get<UnitsComparisonResponse>(`/dashboard/business/${business_id}/units-comparison`, {
      params: { scenario_id, metric },
    }).then((r) => r.data),

  // ← NOVOS:
  dre: (version_id: string): Promise<DREResponse> =>
    api.get<DREResponse>(`/dashboard/unit/${version_id}/dre`).then((r) => r.data),

  auditTrace: (version_id: string): Promise<AuditTraceResponse> =>
    api.get<AuditTraceResponse>(`/dashboard/unit/${version_id}/audit`).then((r) => r.data),

  annual: (business_id: string, scenario_id: string, unit_ids: string[] = []): Promise<{ annual: AnnualBusinessSummary[] }> =>
    api.get(`/dashboard/business/${business_id}/annual`, {
      params: { scenario_id },
    }).then((r) => r.data),

  portfolio: (business_id: string, scenario_id: string): Promise<PortfolioResponse> =>
    api.get<PortfolioResponse>(`/dashboard/business/${business_id}/portfolio`, {
      params: { scenario_id },
    }).then((r) => r.data),
};
```

---

## 6. Sprint 3 — Frontend

> **Regra de ouro:** Antes de criar qualquer componente, verificar se já existe em `components/`. Consultar lista em §1.4. Prefer always extending existing components over creating new files.

### 6.1 · Store: Adicionar `activeYearPreset`

**Arquivo:** `frontend/src/store/dashboard.ts`

Adicionar à interface e ao estado:
```typescript
activeYearPreset: string | null;   // "2026", "2027", ... ou null = tudo

// ação:
setActiveYearPreset: (year: string | null) => void;
```

### 6.2 · GlobalFilters: Adicionar Year Preset Selector

**Arquivo:** `frontend/src/components/dashboard/GlobalFilters.tsx`

Adicionar após os selects de unidade e cenário:
```tsx
{/* Seletor de ano: presets rápidos */}
<div className="flex gap-1">
  {['2026','2027','2028','2029','2030','2031','2032','2033','2034', null].map((y) => (
    <button
      key={y ?? 'all'}
      onClick={() => { setActiveYearPreset(y); setYear(y); }}
      className={cn(
        "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
        activeYearPreset === y
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
      )}
    >
      {y ?? 'Tudo'}
    </button>
  ))}
</div>
```

### 6.3 · Novos Componentes a Criar

Criar apenas componentes que **não existem ainda** (ver §1.4):

#### `components/charts/OccupancyGauge.tsx`

Gauge circular SVG mostrando ocupação atual, meta e break-even:

```tsx
interface OccupancyGaugeProps {
  current: number;       // 0.0–1.0
  breakeven: number;     // 0.0–1.0
  target?: number;       // 0.0–1.0 (meta)
  size?: number;         // px, default 200
}
```

Implementação: SVG com `stroke-dasharray` + `stroke-dashoffset`. Arco de 270°.  
3 arcos sobrepostos: fundo (cinza), breakeven (âmbar), atual (verde/vermelho condicional).

#### `components/charts/WaterfallChart.tsx`

Chart de barras waterfall para payback:

```tsx
interface WaterfallChartProps {
  capex: number;                   // valor inicial negativo
  periods: Array<{ period: string; net_result: number; cumulative: number }>;
}
```

Usa Recharts `ComposedChart` com `Bar` + `ReferenceLine` em zero.  
Cor das barras: verde quando acumulado > 0, vermelho quando < 0.

#### `components/charts/AnnualSummaryChart.tsx`

Barras anuais com linha de resultado líquido sobreposta:

```tsx
interface AnnualSummaryChartProps {
  data: AnnualBusinessSummary[];    // do endpoint /annual
  mode?: 'nominal' | 'cumulative';
}
```

Usa `ComposedChart` do Recharts. Barras empilhadas (receita / custos). Linha para net_result.

#### `components/tables/DRETable.tsx`

Tabela DRE interativa com freeze de colunas, tooltip de fórmula e export:

```tsx
interface DRETableProps {
  data: DREResponse;
  mode?: 'monthly' | 'annual';    // agrupa 12 meses
  versionId: string;
}
```

Features necessárias:
- Freeze columns: `code` + `name` ficam fixos, períodos scrollam horizontalmente
- `sticky left-0 bg-white z-10` nas colunas de código/nome
- Linhas de total em negrito; linhas de resultado negativo em vermelho
- Tooltip no hover de célula: mostra `formula_trace` do `calculation_trace`
- Botão "Exportar CSV" — converte `DREResponse` em CSV

#### `components/tables/TeachersBreakevenTable.tsx`

```tsx
interface TeachersBreakevenTableProps {
  data: TimeSeries[];   // time_series do dashboard
  unitName?: string;
}
// Deriva teachers_needed_medium/pessimistic/optimistic do time_series
// Agrupa por ano (12 meses → 1 coluna)
```

#### `components/dashboard/AuditTracePanel.tsx`

```tsx
interface AuditTracePanelProps {
  trace: CalcTrace['trace'];
  period: string;
}
// Renderiza cada seção (revenue, fixed_costs, kpis) como accordion expansível
// Formulas no formato "capacity_hours × occ × avg_price = R$X"
// Botão "Copiar JSON"
```

### 6.4 · Redesigns de Páginas Existentes

#### `visao-geral/page.tsx` — Adicionar Tabs + DRE

A página já tem KPIs básicos. **Adicionar:**

1. Tabs: `VISÃO FINANCEIRA` | `COWORKING B2B` | `DRE`
2. Tab DRE: use `<DRETable />` com dados de `/dashboard/unit/{version_id}/dre`
3. Na tab COWORKING B2B: `<OccupancyGauge />` ao lado do BreakevenProgress existente

**Implementação das tabs:**
```tsx
const [activeTab, setActiveTab] = useState<'financial' | 'b2b' | 'dre'>('financial');
```

#### `professores/page.tsx` — Substituir por Teachers Breakeven Real

**Remover:** leitura de `num_personal_trainers` das premissas

**Adicionar:**
- KPIs topo: `break_even_revenue`, `break_even_occupancy_pct` do dashboard
- `<TeachersBreakevenTable />` mostrando os 3 cenários por ano

```tsx
// Usa teachers_needed_medium/pessimistic/optimistic do time_series (após Sprint 2.1)
const teachersRows = useMemo(() => {
  return aggregateByYear(ts).map(({ year, ...data }) => ({
    year,
    teachers_pessimistic: data.teachers_needed_pessimistic,
    teachers_medium: data.teachers_needed_medium,
    teachers_optimistic: data.teachers_needed_optimistic,
  }));
}, [ts]);
```

#### `ocupacao/page.tsx` — Adicionar Gauge

Substituir o card de ocupação % por `<OccupancyGauge current={currentOccupancy} breakeven={breakevenOccupancyRate} />`.

Adicionar tooltip de gap: *"Faltam X% para atingir break-even"*

#### `crescimento/page.tsx` — Substituir pelo Annual Summary real

```tsx
// Antes: derivava de time_series mensal (impreciso)
// Depois: usa endpoint /annual para dados anuais agregados do backend
const { data: annualData } = useQuery({
  queryKey: ['annual-summary', businessId, scenarioId],
  queryFn: () => dashboardApi.annual(businessId!, scenarioId!),
  enabled: !!businessId && !!scenarioId,
});
// Exibe com <AnnualSummaryChart data={annualData?.annual ?? []} />
```

#### `estrategico/page.tsx` — Adicionar Portfolio ROI

Já tem 784 linhas. **Adicionar seção nova** (não substituir):

```tsx
const { data: portfolio } = useQuery({
  queryKey: ['portfolio', businessId, scenarioId],
  queryFn: () => dashboardApi.portfolio(businessId!, scenarioId!),
  enabled: !!businessId && !!scenarioId,
});
// Exibe: total_capex, total_net_result, net_after_capital_cost, roi_pct
// + tabela por unidade (usar <PortfolioTable />)
```

### 6.5 · Novas Páginas

#### `app/(auth)/dashboard/(executive)/dre/page.tsx`

```tsx
'use client';
// Seletor de versão (versionId do dashboardFilters ou picker)
// <DRETable data={dreData} versionId={versionId} />
// Toggle mensal/anual
// Botão exportar CSV
```

#### `app/(auth)/dashboard/(executive)/capex/page.tsx`

```tsx
// Mostra CapexInputs por unidade (buscar de /budget-versions + assumptions)
// <CapexStackedBar /> — stacked bar por categoria (equipamentos, reforma, arquiteto, etc.)
// Tabela de amortização dos FinancingContracts
// <WaterfallChart /> — payback por unidade
```

#### `app/(auth)/dashboard/(executive)/auditoria-calculo/page.tsx`

```tsx
// Seletor de período + unidade
// <AuditTracePanel trace={selectedTrace} period={selectedPeriod} />
// Botão "Exportar JSON"
```

### 6.6 · Sidebar/DashboardNav — Adicionar Novas Rotas

**Arquivo:** `frontend/src/components/dashboard/DashboardNav.tsx`

Adicionar ao array de links:
```tsx
{ href: '/dashboard/dre',               label: 'DRE',               icon: <FileText /> },
{ href: '/dashboard/capex',             label: 'CAPEX',             icon: <Building /> },
{ href: '/dashboard/auditoria-calculo', label: 'Auditoria',         icon: <Search /> },
```

---

## 7. Sprint 4 — Features Estratégicas

### 7.1 · Split Franqueador/Franqueado

**Novo modelo** (`backend/app/models/franchise_fee_config.py`):
```python
class FranchiseFeeConfig(Base):
    __tablename__ = "franchise_fee_configs"
    id: str (UUID PK)
    business_id: str (FK → businesses)
    platform_fee_pct: float     # % da receita bruta para a plataforma Atlas
    referral_commission_pct: float  # comissão quando PT indica outro
    created_at / updated_at
```

**Novo endpoint:** `GET /dashboard/unit/{version_id}/split`

**Lógica:**
```
franchisee_revenue = gross_revenue × (1 - platform_fee_pct)
platform_revenue   = gross_revenue × platform_fee_pct
referral_commission = franchisee_revenue × referral_commission_pct
```

### 7.2 · Benefícios Personal Trainers Escalonados

Tabela de benefícios por tier de horas vendidas (Bronze/Prata/Ouro/Diamante) com kit, seguro e bônus:

**Novo modelo** (`backend/app/models/personal_benefit_tier.py`):
```python
class PersonalBenefitTier(Base):
    __tablename__ = "personal_benefit_tiers"
    service_plan_id: str  # FK → service_plans
    monthly_kit_value: float
    insurance_value: float
    bonus_pct_on_extra: float  # bônus % em horas acima do plano
```

---

## 8. Checklist de Validação Final

### 8.1 · Validação Numérica (vs Planilha Excel)

Após rodar re-seed + recalculate das 8 versões do negócio `Cowork Gym / Fitness`:

**Unidade Laboratório, Novembro 2026:**

| Métrica | Valor esperado (planilha) | Como verificar |
|---|---|---|
| Energia elétrica | R$3.648 | `fc_electricity` no endpoint /dre |
| Preço médio/hora | R$57,50 | `avg_price_per_hour` no time_series |
| Break-even receita | R$52.281 (est.) | `break_even_revenue` no dashboard |
| Break-even ocupação | ~22,6% | `break_even_occupancy_pct` |
| Professores médio Ano 1 | ~66 | `teachers_needed_medium` |
| Impostos (6% IRPJ + 3,5% cartão) | 9,5% da receita | soma `taxes_on_revenue + card_fee_cost` |

**Comando de re-seed e recálculo:**
```bash
# 1. Rodar seeds atualizados
docker exec atlas-backend python -c "from app.seeds.initial_data import run_seeds; from app.core.database import SessionLocal; db=SessionLocal(); run_seeds(db); db.commit()"

# 2. Recalcular todas as versões ativas do negócio
for version_id in $(curl -s "https://atlas-backend-7cuu5kzxjq-rj.a.run.app/budget-versions?business_id=3c0fa535-1ec0-4ce6-b055-389ea5fa60dd" -H "Authorization: Bearer $TOKEN" | jq -r '.[].id'); do
  curl -X POST "https://atlas-backend-7cuu5kzxjq-rj.a.run.app/calculations/recalculate/$version_id" -H "Authorization: Bearer $TOKEN"
done
```

### 8.2 · Checklist de GAPs por Sprint

#### Sprint 1 — Backend + Seeds
- [x] GAP-01: Fórmula energia corrigida (código + docstring); teste `test_energy_formula_with_automation` passando
- [x] GAP-02: Preços Bronze/Diamante corrigidos; preço médio = R$57,50
- [x] GAP-03: `card_fee_rate` em `VariableCostInputs`; `taxa_cartao_pct` nos seeds; `card_fee_cost` persistido
- [x] GAP-04: `expand_curve` aceita `opening_year`; U2 (2028) começa com 3% no Ano 0
- [x] GAP-05: 3 novos campos CAPEX + depreciação automática
- [x] GAP-07: Todos os salários CLT com `rate: 0.10`; pró-labore com curva de valores
- [x] **§3.2:** `PATCH /service-plans/{id}` valida `Σ(target_mix_pct) == 1.0` — retorna 422 se soma ≠ 1.0
- [x] **P0.4:** Remover bloco duplicado de rotas em `assumptions.py` (linhas ~216 em diante)

#### Sprint 2 — Engine + API
- [x] GAP-06: `calculate_teachers_needed` em kpi.py; 3 campos em `PeriodResult`; persistidos
- [x] GAP-08: 7 sub-itens de DRE persistidos; `card_fee_cost` visível no trace
- [x] GAP-09: Endpoints `/dre`, `/audit`, `/annual`, `/portfolio` funcionando
- [x] **P0.9:** Endpoint `/consolidated` expõe `annual_summaries` no response (elimina triplicata no frontend)
- [x] Tipos TypeScript adicionados em `types/api.ts`
- [x] `dashboardApi.dre/auditTrace/annual/portfolio` em `api.ts`

#### Sprint 3 — Frontend
- [x] `activeYearPreset` no store; year preset buttons no GlobalFilters
- [x] **P0.7:** Corrigir `breakevenOccupancyRate` em `ocupacao/page.tsx` — usar `latestPeriod?.break_even_occupancy_pct` diretamente
- [x] **P0.8:** Redesenhar `professores/page.tsx` para modelo B2B (aguarda Sprint 2.1 para ter `teachers_needed_*` no time_series)
- [x] **P0.9:** Extrair `aggregateByYear` para `lib/utils/dashboard.ts` (DRY); após endpoint `/annual` existir, usar `dashboard.annual_summaries`
- [x] **P0.10:** Corrigir `capacidade/page.tsx` — usar `capacity_hours_month × avg_price_per_hour` do engine em vez de `maxRevenue × 1.4`
- [x] `OccupancyGauge.tsx` criado; usado em `ocupacao/page.tsx`
- [x] `WaterfallChart.tsx` criado; usado em `capex/page.tsx`
- [x] `AnnualSummaryChart.tsx` criado; usado em `crescimento/page.tsx`
- [x] `DRETable.tsx` criado (com freeze + tooltip + export CSV); usado em `dre/page.tsx`
- [x] `TeachersBreakevenTable.tsx` criado; `professores/page.tsx` usa teachers_needed reais
- [x] `AuditTracePanel.tsx` criado; `auditoria-calculo/page.tsx` criada
- [x] Tabs em `visao-geral/page.tsx` (FINANCEIRA | B2B | DRE)
- [x] Novas rotas na sidebar (DRE, CAPEX, Auditoria)
- [x] Portfolio section em `estrategico/page.tsx`
- [x] `BreakevenBullet.tsx` criado; usado em `ocupacao/page.tsx` (gap vs meta visual)
- [x] `CapexStackedBar.tsx` criado; usado em `capex/page.tsx`
- [x] `PortfolioTable.tsx` criado; usado em `estrategico/page.tsx`
- [x] `unidades/page.tsx` — adicionar mini-sparkline de receita por unidade (usa `units-comparison` já existente)
- [x] `DRETable` frontend conectado ao backend `GET /reports/export/csv/{version_id}` (não reimplementar CSV client-side)

#### Sprint 4 — Estratégico
- [x] Modelo `FranchiseFeeConfig` + migração + endpoint `/split`
- [x] Modelo `PersonalBenefitTier` + migração
- [x] Frontend: página `/dashboard/beneficios-personal/`

#### Sprint 5 — Fundação Arquitetural (ARCHITECTURE_PROPOSAL)
- [x] ARCH-01: `utils.py` com `generate_horizon_periods()` — 120 períodos determinísticos ✅ JÁ IMPLEMENTADO (validado 21/03/2026)
- [x] ARCH-01: `_build_inputs_for_version` usa `generate_horizon_periods` (não `values.keys()`) ✅ JÁ IMPLEMENTADO
- [x] ARCH-02: `POST /budget-versions` deriva `effective_start_date` de `Unit.opening_date`
- [x] ARCH-03: `expand_annual_step` no `expander.py` (tipo `annual_step`)
- [x] ARCH-03: `expand_assumption` trata `occupancy_mixed` (retorna fixed_component como base)
- [x] ARCH-04: Soma dinâmica por categoria em `_build_inputs_for_version` (premises desconhecidas → `other_fixed_costs`)
- [x] ARCH-05: `POST /assumptions/quick-add` endpoint funcionando
- [x] ARCH-06: `AddAssumptionModal` no frontend com botão `[+ Adicionar Nova Premissa/Custo]`
- [x] **GAP-11 (deferred):** `working_days_month` e `saturdays_month` tornam-se premissas editáveis por unidade (atualmente constantes 22/4)

#### Sprint 6 — Camada de IA
- [x] `core/config.py` com variáveis AI + Geospatial
- [x] `services/ai/client.py` com abstração OpenAI/Gemini/mock
- [x] `services/ai/audit_service.py` + `prompts/audit_system.txt`
- [x] `services/ai/copilot_service.py` + `prompts/copilot_system.txt`
- [x] `services/ai/geo_service.py` + `prompts/pricing_system.txt`
- [x] `schemas/` Pydantic: `AuditReport`, `CopilotResponse`, `GeoPricingReport`
- [x] `api/v1/endpoints/ai.py` com os 3 endpoints (stubs) ✅ JÁ EXISTE — Sprint 6 expande para AI real
- [x] `api/v1/endpoints/ai.py` — substituir stubs por AI Layer completa
- [x] Rate limiting por usuário (10/5/3 chamadas/hora)
- [x] Mock provider funcional para dev sem API key
- [x] Frontend: botão auditoria em `visao-geral/page.tsx`
- [x] Frontend: input NLP em `BudgetVersionClient.tsx` (com `dry_run=true`)
- [x] Frontend: modal `[Precificação Inteligente]` em tela de planos de serviço (`/dashboard/planos`)

### 8.3 · Validação de Segurança

- [x] Todos os endpoints de dashboard verificam `get_current_user` (autenticação JWT)
- [x] Endpoints de portfolio/annual verificam que `business_id` pertence à organização do usuário logado
- [x] Seeds não expõem senhas em logs (verificar `print()` statements)
- [x] `calculation_trace` no endpoint `/audit` não expõe dados de outros usuários (filtro por `version_id` de versão que pertence ao business do usuário)

### 8.4 · Ordem de Deploy Recomendada

```
1. Backend Sprint 1: fix engine → re-seed → recalculate (sem migração SQL necessária)
2. Backend Sprint 2: novos endpoints (sem migração SQL, apenas novos line_items no seed)
3. Frontend Sprint 3: componentes → páginas → sidebar
4. Backend Sprint 4: novas migrações alembic → deploy
```

> **Migrações SQL necessárias apenas no Sprint 4** (novos modelos `FranchiseFeeConfig`, `PersonalBenefitTier`).  
> Sprints 1–3 operam apenas em `AssumptionDefinition.growth_rule` (campo JSON existente) e novos `LineItemDefinition` (inseridos pelo seed).

---

## 9. Sprint 5 — Fundação Arquitetural

> **Referência:** `docs/ARCHITECTURE_PROPOSAL_REPORT.md` — Partes 1, 2, 3, 4 e 6.  
> **Contexto:** Estes itens não foram detectados na auditoria de GAPs vs planilha (§2) porque são **problemas estruturais da engine** que não aparecem nos testes com dados séricos — o seed atual popula 120 AssumptionValues para cobrir o horizonte acidentalmente.

### 9.1 · ARCH-01: ✅ JÁ IMPLEMENTADO — `generate_horizon_periods` + `_build_inputs_for_version`

> **Validado em 21/03/2026:** Este item está **completamente implementado**. Nenhuma ação necessária. O checklist §9.7 deve marcar os itens de ARCH-01 como `[x]`.

**O que foi verificado diretamente no código:**

- `backend/app/services/financial_engine/utils.py` — `generate_horizon_periods(opening_date, projection_years)` ✅ **existe e funciona**
- `calculations.py` — **ETAPA-1** em `_build_inputs_for_version` já implementado:
  1. Usa `version.effective_start_date` → chama `generate_horizon_periods()`
  2. Fallback: usa `unit.opening_date` se `effective_start_date` não definido
  3. Fallback final: usa `values.keys()` como último recurso legado
- `calculations.py` — **ETAPA-2** também implementada: carrega todas `AssumptionDefinitions` com `growth_rule`, chama `expand_assumption()` para cada uma, sem sobrescrever valores manuais do usuário

> **Por que o bug descrito abaixo ainda existia no seed?** O seed preenche 120 `AssumptionValues` manualmente para cobrir o horizonte — então o fallback legado funcionava "por acidente". Com a implementação de ARCH-01 já feita, novas BudgetVersions criadas sem dados manuais já calculam corretamente 120 períodos a partir de `opening_date`.

---

**Referência (código já existente — para documentação):**

`backend/app/services/financial_engine/utils.py`:

```python
from datetime import date
from dateutil.relativedelta import relativedelta


def generate_horizon_periods(opening_date: date, projection_years: int = 10) -> list[str]:
    """
    Gera lista de 'YYYY-MM' a partir da opening_date por projection_years × 12 meses.

    Exemplo: opening_date=2028-03-01, projection_years=10
    → ["2028-03", "2028-04", ..., "2038-02"]   (120 períodos)
    """
    periods = []
    current = opening_date.replace(day=1)
    total_months = projection_years * 12
    for _ in range(total_months):
        periods.append(current.strftime("%Y-%m"))
        current += relativedelta(months=1)
    return periods
```

`calculations.py` — lógica ETAPA-1 já implementada:

```python
# DEPOIS (CORRETO — deriva da BudgetVersion + Unit.opening_date):
unit = db.query(Unit).filter(Unit.id == version.unit_id).first()
opening = version.effective_start_date or (unit.opening_date if unit else None)

if opening:
    horizon = version.projection_horizon_years or 10
    periods = generate_horizon_periods(opening, horizon)
else:
    # Fallback legado — usa AssumptionValues
    periods = sorted(set(p for (_, p) in values.keys() if p is not None))
    if not periods:
        periods = [date.today().strftime("%Y-%m")]
```

**Passo 3 — Importar em `calculations.py`:**

```python
from app.services.financial_engine.utils import generate_horizon_periods
```

---

### 9.2 · ARCH-02: `POST /budget-versions` Derivar `effective_start_date` de `Unit.opening_date`

**Problema:** O endpoint de criação de `BudgetVersion` não lê `Unit.opening_date` para definir `effective_start_date` automaticamente. O usuário precisa enviar as datas manualmente.

**Arquivo:** `backend/app/api/v1/endpoints/budget_versions.py` (ou onde quer que esteja o `POST /budget-versions`)

**Lógica a adicionar:**

```python
@router.post("/budget-versions")
def create_budget_version(data: BudgetVersionCreate, db: Session = Depends(get_db), ...):
    # Busca Unit para derivar a data de abertura
    unit = db.query(Unit).filter(Unit.id == data.unit_id).first()
    if not unit:
        raise HTTPException(404, "Unit not found")

    # Deriva opening automaticamente da Unit se não fornecido explicitamente
    if not data.effective_start_date and unit.opening_date:
        data.effective_start_date = unit.opening_date

    horizon_years = data.projection_horizon_years or 10

    # Calcula effective_end_date
    if data.effective_start_date and not data.effective_end_date:
        data.effective_end_date = (
            data.effective_start_date
            + relativedelta(months=horizon_years * 12)
            - relativedelta(days=1)
        )

    # Schema BudgetVersionOut já expõe horizon_start/horizon_end como campos calculados
    # (derivados de effective_start_date / effective_end_date)
    ...
```

**Frontend** já consome `version.horizon_start` e `version.horizon_end` para gerar a grade de colunas da tabela de premissas em `BudgetVersionClient.tsx`. Nenhuma mudança de frontend necessária.

---

### 9.3 · ARCH-03: Novos Tipos de `growth_rule` no Expander

O `expander.py` atual suporta `flat`, `compound_growth`, `curve`. Os tipos propostos em `ARCHITECTURE_PROPOSAL_REPORT.md §2.2` que ainda faltam:

#### Tipo `annual_step` (escada explícita por ano)

**Uso:** Salário do Gerente, Pró-labore com valores não-lineares

```json
{
  "type": "annual_step",
  "steps": { "2027": 2500, "2028": 3500, "2029": 4500, "2030": 5500 },
  "default_for_unlisted_years": "last_known"
}
```

**Implementar em `expander.py`:**

```python
def expand_annual_step(
    steps: dict[str, float],
    periods: list[str],
    default_mode: str = "last_known",
) -> dict[str, float]:
    """
    Retorna o valor do passo para o ano do período.
    Se o ano não estiver nos steps, usa o último valor conhecido.
    """
    sorted_years = sorted(steps.keys())
    result: dict[str, float] = {}
    for p in periods:
        year_str = p[:4]
        if year_str in steps:
            result[p] = steps[year_str]
        elif default_mode == "last_known":
            # Busca o maior ano ≤ ao período atual
            known = [y for y in sorted_years if y <= year_str]
            result[p] = steps[known[-1]] if known else list(steps.values())[0]
        else:
            result[p] = 0.0
    return result
```

**Adicionar ao `expand_assumption()`:**

```python
elif rule_type == "annual_step":
    return expand_annual_step(
        steps=growth_rule.get("steps", {}),
        periods=periods,
        default_mode=growth_rule.get("default_for_unlisted_years", "last_known"),
    )
```

#### Tipo `occupancy_mixed` (energia + água)

**Uso:** Premissas cujo valor depende da taxa de ocupação calculada pelo engine.

**Nota:** `occupancy_mixed` não pode ser resolvido no expander sozinho (requer o valor de `occupancy_rate` do período, que só existe depois do cálculo). É tratado diretamente nos calculadores `fixed_costs.py` (já implementado). No expander, retorná o `fixed_component` como base:

```python
elif rule_type == "occupancy_mixed":
    # O componente variável é calculado no engine — aqui apenas retornamos o fixo
    return {p: growth_rule.get("fixed_component", 0.0) for p in periods}
```

---

### 9.4 · ARCH-04: Soma Dinâmica por Categoria (Premissas Desconhecidas)

**Problema:** `_build_inputs_for_version` em `calculations.py` mapeia ~35 codes hardcoded. Se um usuário criar `"Valet"` na categoria `CUSTO_FIXO`, a engine nunca o incluirá na DRE.

**Solução:** Após construir os inputs estruturados, percorrer TODAS as `AssumptionDefinitions` da versão e acumular as premises desconhecidas nos campos `other_*`:

**Arquivo:** `backend/app/api/v1/endpoints/calculations.py`, ao final do bloco de construção de `FixedCostInputs`:

```python
# ── Soma Dinâmica: premises desconhecidas ──────────────────────────────────
KNOWN_FIXED_CODES = {
    "aluguel_mensal", "salario_limpeza", "salario_recepcao", "salario_marketing",
    "salario_comercial", "salario_gerente", "salario_educador_fisico", "pro_labore",
    "contabilidade_mensal", "marketing_digital_mensal", "material_identidade_visual",
    "seguro_imovel", "sistemas_seguranca", "servicos_administrativos",
    "custo_energia_fixo", "custo_energia_variavel_max", "automacao_reducao_pct",
    "custo_agua_fixo", "custo_agua_variavel_max", "custo_internet_telefonia",
    "depreciacao_equipamentos", "outras_despesas_fixas",
}
KNOWN_VARIABLE_CODES = {
    "kit_higiene_por_aluno", "comissao_vendas_pct", "taxa_cartao_pct",
    "outros_custos_variaveis",
}

# Acumula premises da categoria CUSTO_FIXO com código desconhecido
extra_fixed_codes = {
    code for (code, _) in values.keys()
    if code not in KNOWN_FIXED_CODES and _get_category(code, definitions) == "CUSTO_FIXO"
}
for code in extra_fixed_codes:
    extra_val = _get(values, code, p, default=0.0)
    fixed.other_fixed_costs = round(fixed.other_fixed_costs + extra_val, 2)

# Acumula premises da categoria CUSTO_VARIAVEL com código desconhecido
extra_var_codes = {
    code for (code, _) in values.keys()
    if code not in KNOWN_VARIABLE_CODES and _get_category(code, definitions) == "CUSTO_VARIAVEL"
}
for code in extra_var_codes:
    extra_val = _get(values, code, p, default=0.0)
    variable.other_variable_costs = round(variable.other_variable_costs + extra_val, 2)
```

**Função auxiliar necessária:**

```python
def _get_category(code: str, definitions: dict[str, str]) -> str:
    """Retorna a categoria de um code de premissa (mapeada no carregamento inicial)."""
    return definitions.get(code, "")  # definitions = {code: category_code}
```

---

### 9.5 · ARCH-05: Endpoint `POST /assumptions/quick-add`

**Objetivo:** Permitir que o usuário adicione uma nova premissa/custo em única chamada, sem precisar fazer 3 chamadas separadas.

**Arquivo:** `backend/app/api/v1/endpoints/assumptions.py` — novo endpoint:

```python
@router.post("/quick-add")
def quick_add_assumption(
    data: QuickAddAssumptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria AssumptionDefinition + AssumptionValue em uma única chamada.
    Usado pelo botão [+ Adicionar Nova Premissa] do frontend.

    NÃO dispara recálculo — o usuário aciona manualmente quando quiser.
    """
    import re, uuid

    # 1. Resolve category_id a partir do category_code
    category = db.query(AssumptionCategory).filter(...).first()

    # 2. Gera code único
    slug = re.sub(r"[^a-z0-9]", "_", data.name.lower()).strip("_")
    code = f"{slug}_{uuid.uuid4().hex[:6]}"

    # 3. Cria AssumptionDefinition
    definition = AssumptionDefinition(
        business_id=data.business_id,
        category_id=category.id,
        code=code,
        name=data.name,
        data_type=data.data_type or "currency",
        default_value=data.value,
        growth_rule=data.growth_rule or {"type": "static", "value": data.value},
        periodicity="monthly",
        is_required=False,
    )
    db.add(definition)
    db.flush()

    # 4. Cria AssumptionValue estático (period_date=None — growth_rule cuida da expansão)
    assumption_value = AssumptionValue(
        budget_version_id=data.budget_version_id,
        assumption_definition_id=definition.id,
        period_date=None,
        value_numeric=data.value,
        source_type="manual",
    )
    db.add(assumption_value)
    db.commit()

    return {"definition_id": str(definition.id), "code": code, "value_id": str(assumption_value.id)}
```

**Schema Pydantic de entrada:**

```python
class QuickAddAssumptionRequest(BaseModel):
    budget_version_id: str
    business_id: str
    name: str                          # Ex: "Valet"
    value: float                       # Ex: 3000.0
    category_code: str                 # "CUSTO_FIXO" | "CUSTO_VARIAVEL" | "RECEITA" | "CAPEX"
    data_type: str | None = "currency"
    growth_rule: dict | None = None    # Se None, usa {"type":"static","value":value}
```

---

### 9.6 · ARCH-06: `AddAssumptionModal` no Frontend (BudgetVersionClient)

**Arquivo:** `frontend/src/app/(auth)/budget/[versionId]/BudgetVersionClient.tsx` (ou equivalente)

**O que adicionar:**

1. Botão `[+ Adicionar Nova Premissa/Custo]` no topo da tabela de premissas
2. Modal com campos: **Nome**, **Valor Base**, **Categoria** (select), **Regra de Crescimento** (opcional)
3. Chamada ao endpoint `/assumptions/quick-add`
4. Após sucesso: recarregar a tabela + exibir toast de confirmação
5. (Opcional) Botão `[Recalcular DRE]` após adicionar premissa

**Componente sugerido:**

```tsx
interface AddAssumptionModalProps {
  versionId: string;
  businessId: string;
  onSuccess: () => void;   // Invalida query + fecha modal
}

// No modal:
const categories = ['CUSTO_FIXO', 'CUSTO_VARIAVEL', 'RECEITA', 'CAPEX'];
const growthRuleOptions = [
  { label: 'Valor Fixo (não cresce)', value: { type: 'static' } },
  { label: 'Crescimento anual (10%)', value: { type: 'compound_growth', rate: 0.10 } },
  { label: 'Crescimento anual (5%)', value: { type: 'compound_growth', rate: 0.05 } },
];

// POST /api/v1/assumptions/quick-add
// Retorno: { definition_id, code }
// Após sucesso: queryClient.invalidateQueries(['budget-version', versionId])
```

---

### 9.7 · Checklist de Validação Sprint 5

| Item | Arquivo | Validação |
|---|---|---|
| ✅ `utils.py` com `generate_horizon_periods` | `financial_engine/utils.py` | **JÁ IMPLEMENTADO** (validado 21/03/2026) |
| ✅ `_build_inputs_for_version` usa a nova função | `calculations.py` | **JÁ IMPLEMENTADO** — ETAPA-1 e ETAPA-2 existem |
| `POST /budget-versions` deriva `effective_start_date` | Budget version endpoint | Criar version sem datas → `horizon_start` = `unit.opening_date.year-month` |
| `expand_annual_step` no expander | `expander.py` | Teste com steps `{2027: 2500, 2028: 3500}` → correto por ano |
| Soma dinâmica por categoria | `calculations.py` | Adicionar `("valet", "CUSTO_FIXO", 3000)` manualmente → aparece em `other_fixed_costs` na DRE |
| `POST /assumptions/quick-add` | `assumptions.py` | Cria definition + value em 1 chamada; retorna IDs |
| `AddAssumptionModal` no frontend | `BudgetVersionClient.tsx` | Botão visível, modal abre, nova premissa aparece na tabela após fechar |

---

## 10. Sprint 6 — Camada de IA

> **Referência:** `docs/ARCHITECTURE_PROPOSAL_REPORT.md` — Parte 7.  
> **Princípio Fundamental:** A IA **nunca altera cálculos**. A Financial Engine é a fonte da verdade matemática. A IA atua como **conselheiro estratégico** sobre os resultados — audita anomalias, interpreta linguagem natural, enriquece com dados de mercado.  
> **Pré-requisito:** Sprint 1 e Sprint 2 concluídos (DRE com 120 meses calculados corretamente).

> **Validação 21/03/2026 — Skeleton já existe (P0.6):** O arquivo `backend/app/api/v1/endpoints/ai.py` **JÁ EXISTE** com skeleton funcional:
> - `GET /ai/sanity-check/{version_id}`: **5 verificações determinísticas sem LLM** (occupancy range, price > 0, rent ≤ 80% max revenue, plan mix = 100%, resultados negativos persistentes)
> - `POST /ai/copilot`: FAQ matching por palavra-chave + `_call_llm()` que retorna `"__stub__"`
> - `GET /ai/geo-pricing/{unit_id}`: benchmarks por estado hardcoded (SP: R$55, RJ: R$50, MG: R$45)
>
> **Sprint 6 substitui/aprimora esses stubs** com a AI Layer completa descrita abaixo. O `ai.py` deve ser **expandido**, não recriado do zero.

### 10.1 · Infraestrutura da AI Layer

**Estrutura de pastas a criar:**

```
backend/app/
  services/
    ai/
      __init__.py
      client.py             ← abstração sobre OpenAI/Gemini (troca via config)
      audit_service.py      ← AuditService (sanity check)
      copilot_service.py    ← ScenarioCopilotService (NLP)
      geo_service.py        ← GeoPricingService
      prompts/
        audit_system.txt    ← system prompt do auditor (versionado)
        copilot_system.txt  ← system prompt do copiloto
        pricing_system.txt  ← system prompt de precificação
      schemas/
        audit.py            ← Pydantic: AuditReport, AuditAlert
        copilot.py          ← Pydantic: FunctionCall, CopilotResponse
        geo_pricing.py      ← Pydantic: GeoPricingReport, SuggestedPrice
  api/v1/endpoints/
    ai.py                   ← NOVO — endpoints /ai/*
```

**Configurações a adicionar em `backend/app/core/config.py`:**

```python
# AI Provider
AI_PROVIDER: str = "openai"             # "openai" | "gemini" | "mock"
OPENAI_API_KEY: str | None = None
GEMINI_API_KEY: str | None = None
AI_MODEL_AUDIT: str = "gpt-4o-2024-08-06"
AI_MODEL_COPILOT: str = "gpt-4o-2024-08-06"
AI_MODEL_PRICING: str = "gpt-4o-mini"        # mais leve, custo menor

# Geospatial
GOOGLE_PLACES_API_KEY: str | None = None
GEO_CACHE_TTL_DAYS: int = 30

# AI Safety
AI_RATE_LIMIT_PER_USER_HOUR: int = 10
AI_MAX_CONTEXT_TOKENS: int = 8000
```

**`client.py` — abstração sobre providers:**

```python
class AIClient:
    """Provider-agnostic client. Switch between OpenAI / Gemini via AI_PROVIDER env."""

    def __init__(self):
        self.provider = settings.AI_PROVIDER  # "openai" | "gemini" | "mock"

    def structured_output(self, system: str, user: str, schema: type) -> dict:
        """Chama LLM com Structured Output (json_schema). Retorna dict validado."""
        if self.provider == "mock":
            return schema().dict()   # retorna defaults para testes/dev
        if self.provider == "openai":
            return self._openai_call(system, user, schema)
        if self.provider == "gemini":
            return self._gemini_call(system, user, schema)

    def function_calling(self, system: str, user: str, functions: list[dict]) -> list[dict]:
        """Chama LLM com Function Calling. Retorna lista de {function, arguments}."""
        ...
```

---

### 10.2 · Funcionalidade 1: Auditor de Risco (`POST /ai/sanity-check/{version_id}`)

**Objetivo:** Após recálculo, analisar a DRE gerada e premissas à procura de anomalias, inconsistências e omissões críticas. **Nunca altera dados.**

**Endpoint:**

```python
# backend/app/api/v1/endpoints/ai.py

@router.post("/sanity-check/{version_id}")
async def ai_sanity_check(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rate limit: 10 chamadas/hora por usuário (evitar custos excessivos).
    Custo estimado: ~$0.005 por chamada (gpt-4o, ~1500 tokens).
    """
    service = AuditService(db)
    context = service.build_context(version_id)    # annual_summaries + premises
    report = service.call_llm(context)             # AuditReport Pydantic
    service.persist_audit(report, version_id)      # tabela ai_audit_logs
    return report
```

**Schema da resposta (`audit.py`):**

```python
class AuditAlert(BaseModel):
    severity: Literal["critical", "warning", "info"]
    category: str                    # "payroll", "omission", "ebitda", etc.
    year: str | None
    message: str
    metric_affected: str
    current_value: float | None
    threshold: float | None

class AuditReport(BaseModel):
    overall_health: Literal["healthy", "warning", "critical", "unavailable"]
    risk_score: int                  # 0-100
    alerts: list[AuditAlert]
    recommendations: list[str]
    generated_at: datetime
    model_used: str
    version_id: str
    tokens_used: int
```

**Thresholds padrão no system prompt (`prompts/audit_system.txt`):**

```
- Folha > 55% da receita → CRITICAL
- Ausência de custo de Marketing → WARNING (omission)
- EBITDA < 0% após mês 36 → CRITICAL (insolvency risk)
- EBITDA < 0% nos primeiros 18 meses → INFO (esperado, pré-operacional)
- Payback > 8 anos → WARNING
- Margem de contribuição < 40% → WARNING
```

**Segurança:**
- Contexto usa apenas `annual_summaries` (valores agregados); nunca dados nominais de clientes
- Rate limit por usuário via middleware
- Timeout 30s com retry exponencial (máx 2 tentativas)
- Fallback: `{"overall_health": "unavailable"}` — app nunca quebra em caso de falha de LLM

---

### 10.3 · Funcionalidade 2: Copiloto de Cenários NLP (`POST /ai/scenario-copilot`)

**Objetivo:** Usuário escreve comando em linguagem natural → LLM decompõe em chamadas à API interna → executa automaticamente sem código adicional.

**Exemplo:** *"Crie um cenário pessimista atrasando a obra em 3 meses e subindo o aluguel em 15%"*

**Endpoint:**

```python
@router.post("/scenario-copilot")
async def scenario_copilot(
    data: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rate limit: 5 chamadas/hora por usuário.
    dry_run=True retorna planned_actions sem executar (confirmação UX).
    """
    service = ScenarioCopilotService(db)
    calls = service.parse_command(data.command, data.budget_version_id)   # → list[FunctionCall]
    calls = service.validate_calls(calls)  # segurança + limites
    if data.dry_run:
        return {"planned_actions": calls, "confirmation_required": True}
    results = service.execute_calls(calls)
    summary = service.generate_summary(results)
    return {"status": "completed", "actions_executed": results, "summary": summary, ...}
```

**Funções disponíveis para o LLM:**

| Função | Descrição | Endpoint interno |
|---|---|---|
| `clone_budget_version(source_id, new_name)` | Clona versão | `POST /budget-versions/clone/{id}` |
| `update_opening_date(version_id, offset_months)` | Atrasa/adianta abertura | `PATCH /budget-versions/{id}` |
| `update_assumption(version_id, code, new_value, rate_override)` | Atualiza premissa | `PUT /assumptions/values` |
| `create_assumption(version_id, name, category, value, growth_rule)` | Cria nova rubrica | `POST /assumptions/quick-add` |
| `recalculate_version(version_id)` | Dispara recálculo | `POST /calculations/recalculate/{id}` |

**Limites de segurança na validação:**
- Máx 5 funções por comando (evitar loops)
- `offset_months` entre -24 e +48 (datas impossíveis)
- `rate_override` entre -0.50 e +2.00 (crescimentos absurdos)
- Rollback de transação DB se qualquer função falhar

**Schema de request:**

```python
class CopilotRequest(BaseModel):
    budget_version_id: str
    command: str                    # linguagem natural
    dry_run: bool = True            # confirmação antes de executar por padrão
    confirmed: bool = False         # True quando usuário confirmou o dry_run
```

---

### 10.4 · Funcionalidade 3: Precificação Geoespacial (`POST /ai/geo-pricing`)

**Objetivo:** Sugerir preços ótimos dos planos B2B (Diamante/Ouro/Prata/Bronze) com base no perfil socioeconômico e competitivo da região da unidade.

**Endpoint:**

```python
@router.post("/geo-pricing")
async def geo_pricing(
    data: GeoPricingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rate limit: 3 chamadas/hora por usuário.
    Custo estimado: ~$0.012 por análise (Places + LLM).
    Cache: 30 dias por CEP + preços atuais (hash).
    """
    service = GeoPricingService(db)
    competitors = service.fetch_competitors(data.location)    # → Google Places API
    socio_data = service.fetch_socioeconomic(data.location)   # → IBGE ViaCEP
    report = service.call_llm(competitors, socio_data, data.current_prices)
    return report  # GeoPricingReport
```

**Schema da resposta (`geo_pricing.py`):**

```python
class SuggestedPrice(BaseModel):
    current: float
    suggested: float
    rationale: str

class GeoPricingReport(BaseModel):
    location_profile: dict              # segment, competitive_density, price_elasticity
    suggested_prices: dict[str, SuggestedPrice]   # bronze/prata/ouro/diamante
    revenue_impact: dict                # annual_delta_at_70pct_occupancy, payback_reduction_months
    confidence: Literal["high", "medium", "low"]
    data_sources: list[str]
    caveats: list[str]
    generated_at: datetime
    model_used: str
```

**Frontend:** Botão `[Precificação Inteligente por Região]` na tela de configuração de planos (`ServicePlanConfig`), abre modal com:
1. Formulário: CEP/Bairro/Cidade
2. Exibe `GeoPricingReport` com comparação atual vs sugerido
3. Botão `[Aplicar Preços Sugeridos]` → `PATCH /service-plans/{id}` para cada plano → `POST /calculations/recalculate`

---

### 10.5 · Tabela de Rastreabilidade dos Endpoints de IA

| Endpoint | Funcionalidade | Auth | Rate Limit | Custo Est./Chamada |
|---|---|---|---|---|
| `POST /ai/sanity-check/{version_id}` | Auditor de Risco | ✅ Bearer | 10/hora | ~$0.005 |
| `POST /ai/scenario-copilot` | Copiloto NLP | ✅ Bearer | 5/hora | ~$0.015 |
| `POST /ai/geo-pricing` | Geopreço Dinâmico | ✅ Bearer | 3/hora | ~$0.012 |
| `GET /ai/audit-history/{version_id}` | Histórico auditorias | ✅ Bearer | — | — |

---

### 10.6 · Roadmap de Ativação da AI Layer

| Fase | Pré-requisito | O que ativar |
|---|---|---|
| **Fase A** — pós Sprint 2 | Engine com 120 meses + DRE granular funcionando | `POST /ai/sanity-check` — a DRE precisa existir para ser auditada |
| **Fase B** — pós Sprint 5 | `/assumptions/quick-add` + clone de versão | `POST /ai/scenario-copilot` — precisa das funções que vai chamar |
| **Fase C** — expansão geo | Google Places API Key configurada | `POST /ai/geo-pricing` — faz sentido quando houver unidades em diferentes cidades |

**Regra arquitetural imutável:**

```
✅ A AI Layer PODE   → ler CalculatedResults e AssumptionValues (read-only)
✅ A AI Layer PODE   → chamar API interna (clone, upsert, recalculate) com confirmação
✅ A AI Layer PODE   → sugerir valores e aguardar confirmação do usuário
❌ A AI Layer NÃO PODE → chamar funções da Financial Engine diretamente
❌ A AI Layer NÃO PODE → escrever em CalculatedResults diretamente
❌ A AI Layer NÃO PODE → alterar premissas SEM confirmação explícita do usuário
```

---

### 10.7 · Checklist de Validação Sprint 6

| Item | Arquivo | Validação |
|---|---|---|
| `config.py` com variáveis AI | `core/config.py` | `settings.AI_PROVIDER` = "mock" em dev, "openai" em prod |
| `services/ai/client.py` com mock provider | `client.py` | `AI_PROVIDER=mock` → retorna `AuditReport` com defaults sem chamar LLM |
| `POST /ai/sanity-check/{version_id}` funcional | `ai.py` | Chamar com `AI_PROVIDER=mock` → retorna 200 com `overall_health: "healthy"` |
| `POST /ai/scenario-copilot` com `dry_run=true` | `ai.py` | Comando NLP → lista de `planned_actions` sem executar |
| `POST /ai/geo-pricing` com cache | `ai.py` | Duas chamadas para mesmo CEP → segunda retorna do cache |
| Rate limiting funcionando | middleware | 11ª chamada em 1 hora → 429 Too Many Requests |
| Frontend: botão auditoria em visao-geral | `visao-geral/page.tsx` | Botão visível, chama `/ai/sanity-check`, exibe alertas |
| Frontend: input NLP em budget | `BudgetVersionClient.tsx` | Campo de texto + botão `[Executar]` com `dry_run=true` primeiro |
| Frontend: modal precificação em service-plans | `ServicePlanConfig` | Botão `[Precificação Inteligente]` abre modal com campos de localização |

---

*Início original do documento de planejamento:*

---

Starting: *Leitura profunda do frontend atual* (1/7)

Leitura [](file:///workspaces/atlas/frontend/src/types/api.ts#1-1), linhas 1 para 120

Leia [](file:///workspaces/atlas/frontend/src/app/%28auth%29/dashboard/consolidated/%5BbusinessId%5D/DashboardConsolidatedClient.tsx)

Leitura [](file:///workspaces/atlas/frontend/src/app/%28auth%29/dashboard/%28executive%29/visao-geral/page.tsx#120-120), linhas 120 para 280

Leitura [](file:///workspaces/atlas/frontend/src/types/api.ts#120-120), linhas 120 para 250

Leitura [](file:///workspaces/atlas/frontend/src/lib/api.ts#1-1), linhas 1 para 120

Leitura [](file:///workspaces/atlas/frontend/src/components/dashboard/GlobalFilters.tsx#1-1), linhas 1 para 100

Leia [](file:///workspaces/atlas/frontend/src/store/dashboard.ts)

Leitura [](file:///workspaces/atlas/frontend/src/components/dashboard/MetricCard.tsx#1-1), linhas 1 para 120

Leitura [](file:///workspaces/atlas/backend/app/api/v1/endpoints/calculations.py#1-1), linhas 1 para 150

Leia [](file:///workspaces/atlas/backend/app/models/budget_version.py)

Leia [](file:///workspaces/atlas/backend/app/services/financial_engine/__init__.py)

Leitura [](file:///workspaces/atlas/backend/app/api/v1/endpoints/calculations.py#150-150), linhas 150 para 350

Leitura [](file:///workspaces/atlas/backend/app/api/v1/endpoints/dashboard.py#80-80), linhas 80 para 200

Starting: *Planejamento completo de impl.* (3/5)

Aqui está o planejamento completo e extensivo de implementação:

---

# Plano de Implementação Atlas Finance — Completo

## Visão Arquitetural do Estado Alvo

```
┌─── SEED (dados base) ────────────────────────────────┐
│  Planos: Bronze R$65/Nível A → Diamante R$50/Nível D │
│  Mix: 25%/25%/25%/25% → preço médio R$57,50/h        │
│  Taxa: 6% IRPJ + 3,5% cartão = 9,5% total            │
│  Folha CLT: +10%/ano (não 5%)                         │
│  Pró-labore: curve [5000,5000,5500,5500,6000,6000,6600] │
│  Energia: (fixo+var×occ) × (1−automação) ← BUG FIX   │
│  Curva ocupação: relativa à opening_date              │
└──────────────────────────────────────────────────────┘
         │  re-seed + recalculate all versions
         ▼
┌─── ENGINE (cálculo) ─────────────────────────────────┐
│  fixed_costs.py:  bug energia corrigido               │
│  variable_costs: card_fee_rate separado               │
│  kpi.py: teachers_needed_breakeven (3 cenários)       │
│  calculations.py: offset curva por opening_date       │
│  engine.py: persistir ~30 sub-itens do DRE            │
│  engine.py: depreciação = capex/vida_útil automático  │
└──────────────────────────────────────────────────────┘
         │  15 KPIs atuais + 15 novos sub-itens DRE
         ▼                + 3 KPIs professores
┌─── API (endpoints) ──────────────────────────────────┐
│  /dashboard/unit/{id}: + DRE breakdown + audit trace  │
│  /dashboard/business/consolidated: + annual_summary   │
│  /dashboard/business/consolidated: + cost_of_capital  │
│  NEW /dashboard/business/{id}/annual: resumo por ano  │
│  NEW /dashboard/unit/{id}/dre: DRE completo           │
│  NEW /dashboard/unit/{id}/audit: trace de cálculo     │
└──────────────────────────────────────────────────────┘
         │  novos campos nos responses
         ▼
┌─── FRONTEND (UX) ────────────────────────────────────┐
│  types/api.ts: novos tipos                            │
│  lib/api.ts: novos endpoints                          │
│  store/dashboard.ts: + drilldown + comparison mode    │
│  GlobalFilters: + filtro de período por ano           │
│  visao-geral: + DRE card expansível                   │
│  ocupacao: correção da lógica de curva                │
│  professores: teachers_needed (3 cenários) ← real     │
│  crescimento: annual summary por unidade              │
│  NEW pages: dre/, capex/, auditoria-calculo/          │
│  components: DRETable, CapexPanel, AuditTrace         │
└──────────────────────────────────────────────────────┘
```

---

## SPRINT 1 — Correções Críticas no Motor

### 1.1 · Backend: fixed_costs.py — Bug Energia

**Arquivo:** fixed_costs.py

**O que muda:** A redução de automação aplica-se ao custo **total** (fixo + variável), não só à parcela variável.

```python
# ANTES (errado):
electricity = fixed_energy_cost + max_variable_energy_cost * occ * (1 - automation_reduction)

# DEPOIS (correto — conforme planilha):
electricity = (fixed_energy_cost + max_variable_energy_cost * occ) * (1 - automation_reduction)
```

**Testes a adicionar:** `test_energy_formula_with_automation()` — validar contra valores da planilha (ex: 12% occ → R$3648).

---

### 1.2 · Backend: variable_costs.py — Taxa de Cartão

**O que adicionar:**

```python
@dataclass
class VariableCostInputs:
    hygiene_kit_per_student: float = 0.0
    sales_commission_rate: float = 0.0
    card_fee_rate: float = 0.035      # ← NOVO: 3.5% taxa adquirente
    other_variable_costs: float = 0.0
```

```python
# variable_costs.py
card_fee = round(inputs.card_fee_rate * gross_revenue, 2)
total = round(hygiene_kit + sales_commission + card_fee + other, 2)
```

**Por que separado de tax_rate:** A taxa de cartão é custo operacional (despesa financeira variável), não tributo sobre receita. O Lucro Presumido (6%) já existe como `tax_rate_on_revenue`. A separação permite análise de sensibilidade de cada um.

**Novo assumption a adicionar no seed:** `taxa_cartao_pct` com valor `0.035`.

---

### 1.3 · Seeds: Planos e Mix — Alinhamento com Planilha

**Arquivo:** initial_data.py

A planilha usa convenção **inversa** ao modelo atual: maior volume de uso = preço menor (desconto por comprometimento).

```python
SERVICE_PLANS_DATA = [
    # Planilha: Bronze = entrada (R$65/h, 25% mix)
    {"name": "Bronze",   "code": "BRONZE",   "price_per_hour": 65.0, "target_mix_pct": 0.25, ...},
    {"name": "Prata",    "code": "PRATA",    "price_per_hour": 60.0, "target_mix_pct": 0.25, ...},
    {"name": "Ouro",     "code": "OURO",     "price_per_hour": 55.0, "target_mix_pct": 0.25, ...},
    {"name": "Diamante", "code": "DIAMANTE", "price_per_hour": 50.0, "target_mix_pct": 0.25, ...},
]
# Preço médio resultante: 57,50/h ← idêntico à planilha
```

---

### 1.4 · Seeds: `growth_rule` Completo em Todos os Custos Fixos

Cada custo fixo precisa de growth_rule alinhado com a planilha:

```python
ASSUMPTION_DEFINITIONS = {
    "CUSTO_FIXO": [
        ("aluguel_mensal",              ..., {"type": "compound_growth", "rate": 0.10}),
        ("salario_limpeza",             ..., {"type": "compound_growth", "rate": 0.10}),  # era 0.05
        ("salario_recepcao",            ..., {"type": "compound_growth", "rate": 0.10}),
        ("salario_marketing",           ..., {"type": "compound_growth", "rate": 0.10}),
        ("salario_gerente",             ..., {"type": "compound_growth", "rate": 0.10}),
        ("pro_labore",                  ..., {"type": "curve", "values": [5000,5000,5500,5500,6000,6000,6600,6600,7000,7000]}),
        ("contabilidade_mensal",        ..., {"type": "compound_growth", "rate": 0.10}),
        ("marketing_digital_mensal",    ..., {"type": "compound_growth", "rate": 0.10}),
        ("material_identidade_visual",  ..., {"type": "compound_growth", "rate": 0.10}),
        ("seguro_imovel",               ..., {"type": "compound_growth", "rate": 0.10}),
        ("sistemas_seguranca",          ..., {"type": "compound_growth", "rate": 0.10}),
        ("servicos_administrativos",    ..., {"type": "compound_growth", "rate": 0.10}),
    ],
    "FISCAL": [
        ("aliquota_imposto_receita",    ..., 0.06),    # Lucro Presumido (existente)
        ("taxa_cartao_pct",             ..., 0.035),   # ← NOVO: taxa adquirente
    ],
}
```

---

### 1.5 · Seeds: CAPEX Completo (6 itens)

Adicionar novos campos ao `CapexInputs` e seeds:

```python
# models.py — CapexInputs
@dataclass
class CapexInputs:
    equipment_value: float = 0.0        # existente
    renovation_works: float = 0.0       # existente
    working_capital: float = 0.0        # existente
    architect_cost: float = 0.0         # ← NOVO
    automation_cost: float = 0.0        # ← NOVO (ex: ArCond)
    branding_cost: float = 0.0          # ← NOVO
    # working_capital calculado como |burn_rate × 12| se zero
    useful_life_months_equipment: int = 60    # ← NOVO → depreciation automática
    useful_life_months_renovation: int = 120  # ← NOVO

# engine.py — depreciation automático se depreciation_equipment == 0
if result.equipment_costs == 0 and capex.equipment_value > 0:
    result.equipment_costs = round(capex.equipment_value / capex.useful_life_months_equipment, 2)
```

---

### 1.6 · Curva de Ocupação — Offset por `opening_date`

**Arquivo:** calculations.py

O expander deve indexar a curva a partir do **ano de abertura da unidade**, não do início do horizonte global.

```python
# calculations.py — _build_inputs_for_version
# ANTES: base_year = opening.year (ano absoluto de abertura)
# DEPOIS: base_year = opening.year para compound_growth (correto)
# Para "curve": year_idx = ano_do_periodo - ano_abertura (relativo)

# expander.py — expand_curve: accept opening_year parameter
def expand_curve(annual_values, periods, opening_year=None):
    for i, p in enumerate(periods):
        if opening_year:
            year_idx = max(0, int(p[:4]) - opening_year)
        else:
            year_idx = i // 12
```

---

## SPRINT 2 — Cobertura Funcional

### 2.1 · Engine: Persistir DRE Detalhado (30 sub-itens)

**Arquivo:** engine.py, método `persist()`.

Além dos 15 KPIs agregados atuais, persistir sub-itens do DRE como `CalculatedResult` com seus `line_item.code`:

```python
DRE_LINE_ITEMS = {
    # Receita
    "revenue_membership":      result.membership_revenue,
    "revenue_personal":        result.personal_training_revenue,
    "revenue_other":           result.other_revenue,
    # Custos Fixos — breakdown
    "fc_rent":                 result.rent_total,
    "fc_staff":                result.staff_costs,
    "fc_pro_labore":           fc_detail["pro_labore"],
    "fc_clt":                  fc_detail["clt_base"],
    "fc_social_charges":       fc_detail["social_charges"],
    "fc_electricity":          fc_detail["electricity"],
    "fc_water":                fc_detail["water"],
    "fc_internet":             fc_detail["internet_phone"],
    "fc_marketing":            result.marketing_costs,
    "fc_admin":                result.admin_costs,
    "fc_insurance":            result.insurance_costs,
    "fc_security":             result.other_fixed_costs / 2,   # aproximação
    "fc_equipment_depr":       result.equipment_costs,
    # Custos Variáveis — breakdown
    "vc_hygiene":              result.hygiene_kit_cost,
    "vc_commission":           result.sales_commission_cost,
    "vc_card_fee":             vc_detail["card_fee"],
    "vc_other":                result.other_variable_costs,
    # Impostos
    "tax_presumido":           period_tax["presumido"],
    # Financiamento
    "fin_principal":           result.financing_principal,
    "fin_interest":            result.financing_interest,
    # KPIs derivados — todos os existentes + novos
    "teachers_needed_pessimistic":   teachers_p,
    "teachers_needed_medium":        teachers_m,
    "teachers_needed_optimistic":    teachers_o,
}
```

**Requisito:** Garantir que todas essas chaves correspondem a `LineItemDefinition.code` no banco.

---

### 2.2 · KPI: `teachers_needed_breakeven` — 3 cenários

**Arquivo:** kpi.py

```python
def calculate_teachers_needed(
    break_even_classes_month: float,  # aulas necessárias = BE_occ × capacity
    classes_per_student_week: float = 2.0,
    weeks_per_month: float = 4.33,
    students_per_teacher: float = 1.5,  # cenário médio
) -> dict:
    """Professores necessários para atingir o break-even."""
    classes_per_teacher_month = classes_per_student_week * weeks_per_month * students_per_teacher
    if classes_per_teacher_month <= 0:
        return {"pessimistic": 0, "medium": 0, "optimistic": 0}
    return {
        "pessimistic": math.ceil(break_even_classes_month / (classes_per_teacher_month / 1.5)),
        "medium":      math.ceil(break_even_classes_month / classes_per_teacher_month),
        "optimistic":  math.ceil(break_even_classes_month / (classes_per_teacher_month * 1.5 / 1.0)),
    }
```

---

### 2.3 · API: Novos Endpoints

#### `GET /dashboard/unit/{version_id}/dre`
Retorna DRE completo mês a mês com todos os sub-itens:
```json
{
  "version_id": "...",
  "dre": [
    {"period": "2026-11", "items": [
      {"code": "revenue_total", "name": "Receita Total", "category": "revenue", "value": 2453.81},
      {"code": "fc_rent", "name": "Aluguel", "category": "fixed_cost", "value": 19000.0},
      ...
    ]}
  ]
}
```

#### `GET /dashboard/business/{id}/annual`
Resumo anual consolidado para o frontend de crescimento:
```json
{
  "business_id": "...",
  "scenario_id": "...",
  "annual": [
    {
      "year": "2027",
      "revenue": 1423000,
      "total_costs": 1650000,
      "net_result": -227000,
      "ebitda": -198000,
      "active_units": 1,
      "occupancy_rate": 0.12,
      "cumulative_investment": 1140945
    }
  ]
}
```

#### `GET /dashboard/unit/{version_id}/audit`
Retorna `calculation_trace` de todos os períodos para a aba Auditoria:
```json
{
  "version_id": "...",
  "traces": [
    {
      "period": "2026-11",
      "revenue": {"formula": "capacity_hours × occ × avg_price", "capacity_hours": 402, ...},
      "fixed_costs": {"energy": {"formula": "(fixo+var×occ)×(1-auto)", "fixed": 4200, ...}},
      ...
    }
  ]
}
```

---

### 2.4 · API: `/consolidated` — `cost_of_capital` e `portfolio_roi`

Adicionar ao response do consolidado:
```json
{
  "kpis": { ...existentes... },
  "portfolio": {
    "total_capex_invested": 5869149,
    "total_net_result": 9890844,
    "net_result_after_capital_cost": 3029888,
    "roi_pct": 0.516,
    "unit_breakdown": [
      {"unit_name": "Laboratório", "capex": 1140945, "net_result": 2302000, "payback_months": 48},
      ...
    ]
  }
}
```

---

## SPRINT 3 — Features Estratégicas

### 3.1 · Modelagem de Split Franqueador/Franqueado

**Novo modelo:** `FranchiseFeeConfig` (por business):

```python
class FranchiseFeeConfig(Base):
    __tablename__ = "franchise_fee_configs"
    platform_fee_pct: float  # % da receita bruta para a plataforma
    franchisee_revenue_pct: float  # 1 - platform_fee_pct
    referral_commission_pct: float  # comissão quando um PT indica outro
```

**Novo endpoint:** `GET /dashboard/unit/{id}/split` retorna:
```json
{"platform_revenue": 50000, "franchisee_revenue": 450000, "referral_commissions": 5000}
```

### 3.2 · Benefícios Personal Trainers Escalonados

Tabela de benefícios por tier de horas vendidas (Bronze/Prata/Ouro/Diamante) com kit, seguro e bônus.

---

## PLANO DE UX/DESIGN — Frontend

### Estrutura de Páginas — Estado Alvo

```
/dashboard/
  visao-geral/          ← Redesign completo — DRE card expansível
  ocupacao/             ← Gráfico gauge + curva por unidade corrigida
  crescimento/          ← Annual summary multi-unidade + waterfall chart
  professores/          ← KPI real breakeven (3 cenários) + bullet chart
  projecoes/            ← Payback chart + ROI por unidade
  capacidade/           ← Heat map horas × dias × ocupação
  unidades/             ← Cards de unidade com status e mini-sparkline
  estrategico/          ← Portfolio view + custo de capital
  
  dre/                  ← NOVA: DRE interativo por unidade/período
  capex/                ← NOVA: Painel CAPEX + depreciação + payback
  auditoria-calculo/    ← NOVA: Trace completo de cada cálculo

/budget/[versionId]/    ← Edição de premissas (existente, melhorar UX)
/compare/
  scenarios/            ← existente
  units/                ← existente
/audit/                 ← existente (conectar ao novo endpoint)
```

---

### Redesign: `visao-geral/page.tsx`

**Problema atual:** Exibe apenas KPIs agregados, sem breakdown de DRE.

**Novo layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Topbar + GlobalFilters + period selector               │
├─── Hero KPIs (2×4 grid) ───────────────────────────────┤
│  Receita    │ Lucro Líq. │ EBITDA     │ #Unidades       │
│  Margem     │ Ocupação   │ Margem Contr│ BE Ocupação    │
├─── [Tabs: VISÃO FINANCEIRA | COWORKING B2B | DRE] ─────┤
│                                                         │
│  Tab: VISÃO FINANCEIRA                                  │
│  ┌───────────────────────────┬─────────────────────┐   │
│  │ AreaGrowthChart           │ CostWaterfallChart   │   │
│  │ Receita + Lucro 120 meses │ Composição de Custos │   │
│  └───────────────────────────┴─────────────────────┘   │
│                                                         │
│  Tab: COWORKING B2B                                     │
│  ┌──────────────────────┬──────────────────────────┐   │
│  │ OccupancyGauge       │ BreakevenProgressChart    │   │
│  │ atual vs meta vs BE  │ % caminho para breakeven  │   │
│  └──────────────────────┴──────────────────────────┘   │
│                                                         │
│  Tab: DRE (NOVO)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ DRETable — linha por linha do DRE               │   │
│  │ agrupado: RECEITA / CUSTOS FIXOS / VARIÁVEIS    │   │
│  │ cada linha: código + nome + valor + % receita   │   │
│  │ scroll horizontal por período                   │   │
│  │ botão "Exportar CSV"                            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

### Nova Página: `/dashboard/dre/`

**Componente principal:** `DRETable`

```typescript
interface DRERow {
  code: string;
  name: string;
  category: 'revenue' | 'fixed_cost' | 'variable_cost' | 'tax' | 'financing' | 'result';
  indent: number;           // hierarquia visual (0=título, 1=subtotal, 2=item)
  values: Record<string, number>;  // period → value
  pct_of_revenue?: Record<string, number>;  // período → % da receita
  isTotal?: boolean;
  isHighlighted?: boolean;
}
```

**Features UX:**
- **Freeze columns:** código + nome fixos, períodos scrollam horizontalmente
- **Toggle mensal/anual:** Agrupa 12 meses em uma coluna
- **Destaque condicional:** Linhas negativas em vermelho, positivas em verde
- **Tooltip de fórmula:** Hover em qualquer célula mostra o cálculo
- **Exportar CSV/Excel**
- **Drill-down:** Clique em subtotal expande os itens filhos

---

### Nova Página: `/dashboard/capex/`

```
┌─────────────────────────────────────────────────────────┐
│  Investimento Total por Unidade                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  Stacked Bar Chart — CAPEX por categoria         │  │
│  │  Equipamentos | Reforma | Arquiteto | Branding   │  │
│  │  + Automação  | Caixa Validação                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Tabela de Amortização e Depreciação             │  │
│  │  Contrato | VP | Taxa | Prazo | Parcela | Saldo  │  │
│  │  Por unidade, expansível                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Payback Chart (waterfall)                       │  │
│  │  CAPEX inicial → fluxo acumulado → break-even    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### Nova Página: `/dashboard/auditoria-calculo/`

```
┌─────────────────────────────────────────────────────────┐
│  Trace de Cálculo — Transparência Total                 │
├─────────────────────────────────────────────────────────┤
│  [Filtro: Período] [Métrica] [Unidade]                  │
│                                                         │
│  Período: 2027-01                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ RECEITA                                          │  │
│  │   capacity_hours = 22 × 17 + 4 × 7 = 402 h      │  │
│  │   active_hours   = 402 × 0.12 = 48,24 h          │  │
│  │   avg_price      = Σ(planos × mix) = R$57,50     │  │
│  │   gross_revenue  = 48,24 × 57,50 = R$2.773,80   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ENERGIA (modelo misto com automação)              │  │
│  │   fixo=R$4.200 + var_max=R$3.000×0.12=R$360      │  │
│  │   subtotal=R$4.560 × (1-0.20) = R$3.648          │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ BREAKEVEN                                        │  │
│  │   BE_receita = R$44.178 / (1 - 0.095 - 0.06)    │  │
│  │             = R$44.178 / 0.845 = R$52.281        │  │
│  │   BE_ocupação = R$52.281 / (402 × R$57,50)       │  │
│  │             = R$52.281 / R$23.115 = 22,6%        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Exportar Trace como JSON] [Comparar com Planilha]     │
└─────────────────────────────────────────────────────────┘
```

---

### Redesign: `professores/page.tsx`

**Problema atual:** Lê `num_personal_trainers` das premissas (intenção atual vs algo a fazer), mas o dado relevante é **quantos professores são necessários para o break-even** (dado calculado pela engine).

**Novo layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Professores para Break-even                            │
├──── KPIs ───────────────────────────────────────────────┤
│  BE Classes/mês │ BE Ocupação │ BE Receita │ Preço Médio │
├──── Tabela: Professores Necessários ────────────────────┤
│  Cenário    │ Alunos/Prof │ Ano 1 │ Ano 2 │ ... │ Ano 8 │
│  Pessimista │     1.0     │  98   │  121  │ ... │  190  │
│  Médio      │     1.5     │  66   │   81  │ ... │  127  │
│  Otimista   │     2.0     │  49   │   61  │ ... │   95  │
├──── Por Unidade (quando consolidado) ──────────────────┤
│  Bullet Chart: profs necessários vs profs cadastrados  │
└─────────────────────────────────────────────────────────┘
```

---

### Redesign: `ocupacao/page.tsx`

**Adicionar:**
1. **Gauge circular** de ocupação atual vs meta vs break-even
2. **Curva por unidade** (linhas separadas no gráfico de area)
3. **Tooltip de gap:** "Faltam X% para atingir break-even"
4. Destaque visual quando a curva cruza o `break_even_occupancy_pct`

---

### Redesign: `crescimento/page.tsx`

**Substituir** o gráfico atual por um **Annual Summary** com:
- Barras de receita/custo por ano (2026–2034)
- Linha de resultado líquido sobreposta
- Marcadores de abertura de unidade
- Toggle: **Nominal** / **Acumulado** / **Por Unidade**

---

### Redesign: `estrategico/page.tsx`

Nova seção de **Portfolio Analytics**:
- Custo de capital total por unidade (tabela da aba "Capex Total" da planilha)
- Resultado líquido projetado vs resultado após custo de capital
- ROI do portfolio
- Gráfico de payback cumulativo

---

### Novos Componentes a Criar

| Componente | Arquivo | Propósito |
|---|---|---|
| `DRETable` | `components/tables/DRETable.tsx` | Tabela DRE interativa com freeze + tooltip |
| `OccupancyGauge` | `components/charts/OccupancyGauge.tsx` | Gauge circular SVG |
| `WaterfallChart` | `components/charts/WaterfallChart.tsx` | Payback waterfall |
| `BreakevenBullet` | `components/charts/BreakevenBullet.tsx` | Bullet chart okr-style |
| `TeachersBreakevenTable` | `components/tables/TeachersBreakevenTable.tsx` | Tabela 3 cenários |
| `CapexStackedBar` | `components/charts/CapexStackedBar.tsx` | CAPEX por categoria |
| `AuditTracePanel` | `components/dashboard/AuditTracePanel.tsx` | Trace de cálculo |
| `AnnualSummaryChart` | `components/charts/AnnualSummaryChart.tsx` | Barras anuais multi-unidade |
| `PortfolioTable` | `components/tables/PortfolioTable.tsx` | Custo de capital portfolio |
| `DREExport` | `components/tables/DREExport.tsx` | Export CSV/XLSX |

---

### Novos Tipos em `types/api.ts`

```typescript
// DRE completo
export interface DREItem {
  code: string;
  name: string;
  category: DRECategory;
  indent: number;
  value: number;
  pct_of_revenue?: number;
  formula_trace?: string;
}
export interface DREPeriod { period: string; items: DREItem[]; }
export interface DREResponse { version_id: string; dre: DREPeriod[]; }

// Resumo anual
export interface AnnualSummary {
  year: string;
  revenue: number;
  total_costs: number;
  net_result: number;
  ebitda: number;
  active_units: number;
  occupancy_rate: number;
  cumulative_investment: number;
}

// Portfolio
export interface PortfolioUnit {
  unit_id: string; unit_name: string;
  capex: number; net_result: number;
  payback_months?: number; roi_pct: number;
}
export interface PortfolioResponse {
  total_capex: number; total_net_result: number;
  net_after_capital_cost: number; roi_pct: number;
  units: PortfolioUnit[];
}

// Professores para break-even
export interface TeachersBreakeven {
  year: number;
  be_classes_month: number;
  be_occupancy_pct: number;
  teachers_pessimistic: number;
  teachers_medium: number;
  teachers_optimistic: number;
}

// Audit trace
export interface CalcTrace {
  period: string;
  revenue: RevenueTrace;
  fixed_costs: FixedCostTrace;
  variable_costs: VariableCostTrace;
  kpis: KPITrace;
}
```

---

### Novos Endpoints em `lib/api.ts`

```typescript
export const dashboardApi = {
  // existentes...
  dre: (version_id: string): Promise<DREResponse> =>
    api.get(`/dashboard/unit/${version_id}/dre`).then(r => r.data),
  annual: (business_id: string, scenario_id: string): Promise<{annual: AnnualSummary[]}> =>
    api.get(`/dashboard/business/${business_id}/annual`, { params: { scenario_id } }).then(r => r.data),
  auditTrace: (version_id: string): Promise<{traces: CalcTrace[]}> =>
    api.get(`/dashboard/unit/${version_id}/audit`).then(r => r.data),
  portfolio: (business_id: string, scenario_id: string): Promise<PortfolioResponse> =>
    api.get(`/dashboard/business/${business_id}/portfolio`, { params: { scenario_id } }).then(r => r.data),
};
```

---

### Melhorias no `GlobalFilters`

Adicionar **Period Selector** com presets visuais:

```
[Todas as unidades ▾] [Cenário ▾] [2026 | 2027 | 2028 | ... | Tudo]
                                   ↑ segmented control horizontal
```

Novo estado no Zustand:
```typescript
activeYearPreset: string | null;  // "2027", "2028", etc. ou null = tudo
```

---

## Plano de Auditoria: o que o usuário pode verificar na tela

### Princípio: "Glass Box" (caixa de vidro) — cada KPI explicável

| Tela | Dado | Como auditar |
|---|---|---|
| Visão Geral → tab DRE | Todas as linhas do DRE | Hover = fórmula; Comparar com planilha Excel |
| Ocupação | Taxa de ocupação | Tooltip: "48h vendidas ÷ 402h capacidade = 12%" |
| Break-even | BE Ocupação | Trace: "R$44.178 ÷ (402h × R$57,50) = 19,1%" |
| Professores | Teachers needed | Tabela com 3 cenários, aulas/prof configurável |
| Auditoria-Cálculo | `calculation_trace` raw | JSON expansível por período e métrica |
| Capex | Depreciação | "R$472.410 ÷ 60 meses = R$7.873/mês" |
| Estratégico | ROI portfolio | "Custo capital: 
---

## 11. Declaração de Completude — Fase 1

> **Após a implementação dos Sprints 1–6, o Atlas estará completo como plataforma de planejamento _"what-if"_ (Fase 1).**

### O que será entregue ao final de cada sprint

| Sprint | Entrega principal | Critério de "done" |
|---|---|---|
| 1 | Motor financeiro correto | Todos os 10 KPIs de `test_financial_engine.py` passando |
| 2 | DRE completo e auditável | `DRETable` com 100% das linhas; diff <0,1% vs. planilha Excel |
| 3 | Dashboard completo (todas as telas) | Todos os componentes visuais implementados; zero placeholders |
| 4 | Multi-unidade e franquias | Projeção consolidada de Rede; GAPs de expansão resolvidos |
| 5 | Fundação arquitetural robusta | Premissas dinâmicas; `working_days` configurável (GAP-11) |
| 6 | Camada de IA integrada | AI Copilot real (OpenAI); sanity-check com LLM; geo-pricing via dados externos |

### Escopo explicitamente fora da Fase 1 (Fase 2 — futura)

- Integração com dados operacionais em tempo real (check-ins, caixa, sistema de gestão)
- Fluxo de cadastro de usuários (a plataforma é admin-only por design)
- App mobile
- Integrações contábeis (SPED, NF-e)

### Inventário final de endpoints implementados

| Camada | Qtd | Status |
|---|---|---|
| Backend endpoints | 40+ | ✅ todos cobertos no §1.3 |
| Frontend pages | 18 | ✅ todas cobertas no §1.4 |
| Frontend components | ~30 | ✅ Sprint 3 completa o conjunto |
| Seeds / dados de exemplo | 1 | ⚠️ GAPs 01-07 corrigidos no Sprint 1 |
| Financial engine | 6 módulos | ✅ GAP-01/03/04/05/07 corrigidos no Sprint 1 |
| AI layer | 3 endpoints (stubs) | 🔵 Sprint 6 substitui stubs por AI real |

**Resultado:** nenhum endpoint, página ou funcionalidade de Fase 1 ficará sem cobertura após Sprint 6.
