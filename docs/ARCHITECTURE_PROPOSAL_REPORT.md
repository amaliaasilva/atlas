# ARCHITECTURE PROPOSAL REPORT
## Projeção de 10 Anos, Offset de Unidades e Premissas Dinâmicas

> **Versão:** 1.1  
> **Data:** 2026-03-20  
> **Autor:** GitHub Copilot (Arquiteto de Sistemas / Engenheiro Financeiro)  
> **Contexto:** Baseado no Gap Analysis `SCHEMA_VALIDATION_REPORT.md` e na leitura do código atual em `backend/` e `frontend/`.  
> **v1.1:** Adicionada Parte 7 — Arquitetura de Integração de IA (AI Copilot & Sanity Check).

---

## Sumário Executivo

Este documento propõe a arquitetura para **quatro grandes evoluções** do Atlas:

1. **Linha do Tempo Correta (10 anos / 120 meses)** — a Engine passa a usar a `opening_date` real da unidade como âncora temporal, e cada `BudgetVersion` cobre exatamente `projection_horizon_years × 12` meses a partir dessa data.
2. **Premissas Dinâmicas com `growth_rule`** — qualquer custo/premissa pode ter uma regra de progressão automática (crescimento composto, escada anual, curva de ocupação), eliminando a necessidade de gravar 120 linhas manuais.
3. **UI de Adição de Premissa em Tempo Real** — botão `[+ Adicionar Nova Premissa/Custo]` na tela de orçamento que persiste no banco e dispara recálculo imediato da DRE.
4. **(NOVO v1.1) Camada de IA (AI Copilot & Sanity Check)** — três funcionalidades de inteligência artificial conectadas ao backend via API (OpenAI/Gemini): Auditor de Risco, Copiloto de Cenários NLP e Precificação Geoespacial Dinâmica. A IA **nunca altera cálculos** — atua como conselheiro estratégico sobre os resultados da Financial Engine determinística.

---

## Parte 1 — Linha do Tempo: Como Está vs. Como Deve Ser

### 1.1 — Como a `engine.py` Define as Datas Atualmente

**Diagnóstico do código atual:**

```
calculations.py → _build_inputs_for_version()
```

A função `_build_inputs_for_version` faz o seguinte para definir os períodos:

```python
# Descobre os períodos disponíveis (YYYY-MM) dos valores mensais
periods = sorted(set(period for (_, period) in values.keys() if period is not None))

if not periods:
    # Sem dados de período, usa apenas premissas estáticas em um período fictício
    periods = ["2026-08"]
```

**Problema crítico:** A lista de períodos é derivada inteiramente dos `AssumptionValues` já existentes no banco. Isso significa:

- Se o usuário criou 12 valores manualmente (Jan–Dez de 2027), o engine calcula apenas 12 períodos.
- Se não há nenhum valor mensal cadastrado, o engine calcula exatamente **1 período fictício** (`2026-08`).
- **Não existe nenhuma referência à `opening_date` da unidade.** A data real de abertura da unidade é completamente ignorada na geração dos períodos.
- O `BudgetVersion` possui `effective_start_date` e `effective_end_date`, mas a `_build_inputs_for_version` **nunca lê esses campos** para definir o horizonte.
- O campo `projection_horizon_years` já existe no modelo `BudgetVersion` (valor padrão = 10), mas também **nunca é usado** na geração do horizonte temporal.

**Resumo do problema:**

```
Estado Atual:
  Unit.opening_date = 2028-03-01      (ignorada na engine)
  BudgetVersion.effective_start_date  (ignorada na engine)
  BudgetVersion.projection_horizon_years = 10  (ignorado na engine)
  
  Períodos gerados = apenas o que estava nos AssumptionValues
  → Horizonte real é acidental, não intencional.

Estado Desejado:
  Unit.opening_date = 2028-03-01
  BudgetVersion.projection_horizon_years = 10
  
  Períodos gerados = ["2028-03", "2028-04", ..., "2038-02"]  (120 meses)
  → Horizonte é determinístico e baseado na data de abertura real.
```

---

### 1.2 — O Que Precisa Mudar no Backend

**Três componentes devem ser alterados:**

#### A) `Unit.opening_date` — já existe com tipo `Date`

O modelo `Unit` já foi corrigido (conforme ARCH-03 do gap report) e possui o campo `opening_date: Date`. O seed já usa datas como `date(2028, 3, 1)` para a Segunda Unidade. ✅ O campo está pronto.

#### B) `BudgetVersion` — geração automática do horizonte na criação

Ao criar uma `BudgetVersion`, o `effective_start_date` precisa ser derivado automaticamente da `opening_date` da unidade associada. O `effective_end_date` deve ser calculado como `opening_date + projection_horizon_years × 12 meses`.

**Fluxo proposto para `POST /budget-versions`:**

```
1. Frontend envia: { unit_id, scenario_id, name, projection_horizon_years=10 }
2. Backend faz JOIN para ler Unit.opening_date
3. effective_start_date = Unit.opening_date  (ex: 2028-03-01)
4. effective_end_date   = opening_date + 10 anos - 1 dia (ex: 2038-02-28)
5. Persiste com esses valores calculados
6. Retorna horizon_start="2028-03" e horizon_end="2038-02" ao frontend
```

O schema `BudgetVersionCreate` já possui `horizon_start` e `horizon_end` como campos — o validator precisa apenas priorizar a `opening_date` da unidade quando esses campos não forem fornecidos explicitamente.

#### C) `_build_inputs_for_version` — geração de períodos pela `BudgetVersion`

A função precisa ser refatorada assim:

```
Estado Atual (derivado dos AssumptionValues):
  periods = sorted(set(period for (_, period) in values.keys() ...))

Estado Proposto (derivado da BudgetVersion):
  start = version.effective_start_date   → "2028-03"
  end   = version.effective_end_date     → "2038-02"
  periods = generate_periods(start, end) → 120 períodos determinísticos
  
  Para cada período:
    - Busca AssumptionValues existentes (valores manuais/importados)
    - Para premises sem valor manual, aplica growth_rule (ver Parte 2)
    - Gera FinancialInputs com os valores expandidos
```

**Consequências positivas:**

- A Unidade 2 (abertura Mar/2028) gera meses `2028-03 → 2038-02` automaticamente.
- A Unidade 3 (abertura Out/2028) gera meses `2028-10 → 2038-09` automaticamente.
- O offset entre unidades no consolidado é calculado com precisão de mês.
- Nunca mais um período fictício `"2026-08"` é gerado.

---

### 1.3 — Geração dos Períodos: Lógica Detalhada

```
Função: generate_horizon_periods(opening_date, projection_years=10)

Entrada:  opening_date = date(2028, 3, 1), projection_years = 10
Saída:    ["2028-03", "2028-04", ..., "2028-12",
           "2029-01", ..., "2029-12",
           ...
           "2038-02"]

Total = 120 meses

Algoritmo:
  start_year, start_month = 2028, 3
  for i in range(projection_years * 12):
      yield f"{year}-{month:02d}"
      month += 1
      if month > 12: month = 1; year += 1
```

Esta lógica já existe no frontend (`generatePeriods` em `BudgetVersionClient.tsx`) e deve ser espelhada no backend como função utilitária em `financial_engine/utils.py`.

---

### 1.4 — Sincronização `effective_start_date` / `effective_end_date` com o Frontend

O frontend já consome `version.horizon_start` e `version.horizon_end` para gerar a grade de colunas da tabela de premissas:

```typescript
// BudgetVersionClient.tsx (linha 60)
const periods = useMemo(() => {
  if (!version?.horizon_start || !version?.horizon_end) return [];
  return generatePeriods(version.horizon_start, version.horizon_end);
}, [version]);
```

O schema `BudgetVersionOut` precisa incluir `horizon_start` e `horizon_end` como campos calculados derivados de `effective_start_date` / `effective_end_date` (já parcialmente implementado no schema conforme leitura do código).

---

## Parte 2 — Mecânica do `growth_rule`: Expansão de Premissas por 120 Meses

### 2.1 — O Problema: 120 Linhas vs. 1 Regra

Sem `growth_rule`, para salvar o aluguel de uma unidade por 10 anos com reajuste anual de 10%, o sistema precisaria de **120 `AssumptionValues`** — um por mês. Isso é inviável para o usuário editar manualmente.

A solução é armazenar **1 valor base** + **1 regra JSON** e expandir programaticamente durante o cálculo.

### 2.2 — Estrutura Proposta do JSON `growth_rule`

O campo `growth_rule: JSON` fica em `AssumptionDefinition` (regra padrão do tipo de premissa) ou sobrescrita por `AssumptionValue` (regra específica desta versão).

#### Tipo 1: Crescimento Composto Anual (`compound_growth`)

Uso: Aluguel (+10%/ano), Salários (+10%/ano), Despesas diversas (+10%/ano)

```json
{
  "type": "compound_growth",
  "base_value": 19000.00,
  "annual_rate": 0.10,
  "base_year": 2027,
  "start_month": "2027-01"
}
```

**Fórmula de expansão para o mês `YYYY-MM`:**
```
anos_decorridos = YYYY - base_year  (inteiro)
valor_mes = base_value × (1 + annual_rate) ^ anos_decorridos
```

Exemplo: Aluguel R$ 19.000 em 2027 → R$ 20.900 em 2028 → R$ 22.990 em 2029 → ...

---

#### Tipo 2: Escada Anual Explícita (`annual_step`)

Uso: Salário do Gerente (aumentos não-lineares), Pró-labore

```json
{
  "type": "annual_step",
  "steps": {
    "2027": 2500,
    "2028": 3500,
    "2029": 4500,
    "2030": 5500,
    "2031": 6500,
    "2032": 8000,
    "2033": 8000,
    "2034": 9000
  },
  "default_for_unlisted_years": "last_known"
}
```

**Fórmula:** valor do mês = `steps[YYYY]` (ou último step conhecido se o ano não estiver listado).

---

#### Tipo 3: Curva de Ocupação (`occupancy_curve`)

Uso: `taxa_ocupacao` — a premissa mais importante do negócio

```json
{
  "type": "occupancy_curve",
  "curve": [
    { "year_offset": 1, "rate": 0.03 },
    { "year_offset": 2, "rate": 0.12 },
    { "year_offset": 3, "rate": 0.25 },
    { "year_offset": 4, "rate": 0.40 },
    { "year_offset": 5, "rate": 0.50 },
    { "year_offset": 6, "rate": 0.60 },
    { "year_offset": 7, "rate": 0.70 },
    { "year_offset": 8, "rate": 0.75 },
    { "year_offset": 9, "rate": 0.75 },
    { "year_offset": 10, "rate": 0.75 }
  ],
  "base_date": "2026-11"
}
```

**Fórmula:** `year_offset = ceil((período - base_date) / 12)` → busca `rate` no array pelo offset.

---

#### Tipo 4: Valor Fixo / Estático (`static`)

Uso: Alíquota de imposto, taxa do cartão, vagas/hora

```json
{
  "type": "static",
  "value": 0.06
}
```

---

#### Tipo 5: Misto Ocupação-Dependente (`occupancy_mixed`)

Uso: Energia elétrica, Água — `fixo + variável × ocupação`

```json
{
  "type": "occupancy_mixed",
  "fixed_component": 4200.0,
  "variable_component_at_100pct": 3000.0,
  "automation_reduction": 0.20
}
```

**Fórmula:** `custo = fixed_component + variable_component_at_100pct × occupancy_rate × (1 - automation_reduction)`

---

### 2.3 — Como a Engine Interpreta o `growth_rule`

A engine atual em `_build_inputs_for_version` usa uma função auxiliar `_get(values, code, period)` para buscar valores. Esta função deve ser estendida para uma nova **`AssumptionExpander`**:

```
Algoritmo de resolução de valor para (code, period="2031-06"):

1. Existe AssumptionValue manual para (code, "2031-06")?
   → SIM: usa o valor manual. Fim.

2. Existe AssumptionValue estático para (code, None)?
   → SIM: lê o growth_rule associado à definition.
   → Aplica expand(growth_rule, base_value, period="2031-06", opening_date)
   → Retorna o valor expandido.

3. Existe AssumptionDefinition com default_value?
   → Retorna default_value (sem progressão).

4. Retorna 0.0.
```

**Prioridade:** Manual > Regra Expandida > Default

Isso garante que o usuário sempre pode sobrescrever um mês específico sem perder a regra para os demais.

---

### 2.4 — Onde Armazenar o `growth_rule`

Dois níveis de configuração:

| Nível | Onde | Descrição |
|---|---|---|
| **Padrão do negócio** | `AssumptionDefinition.growth_rule` (JSON) | Regra padrão que vale para todas as `BudgetVersions` que não sobrescrevam |
| **Por versão** | `AssumptionValue` com `period_date = NULL` + campo `growth_rule_override: JSON` | Permite personalização por versão sem alterar o padrão global |

Para o MVP, **apenas o nível de `AssumptionDefinition`** é necessário. O nível por version é uma evolução futura.

---

## Parte 3 — Verificação de Cobertura das Etapas Solicitadas

### ETAPA 1: Refatorar a Financial Engine

**Status: ESTRUTURA EXISTE, LÓGICA TEMPORAL INCOMPLETA**

| Requisito | Existe no código atual? | O que falta |
|---|---|---|
| `projection_horizon_years` em `BudgetVersion` | ✅ Campo `Integer` com default=10 | A `_build_inputs_for_version` nunca o lê |
| `opening_date` na `Unit` | ✅ Campo `Date` com dados no seed | Não é lida em `_build_inputs_for_version` para gerar períodos |
| `effective_start_date` derivado da `opening_date` | ⚠️ O schema aceita o campo, mas não o deriva automaticamente da unit | Falta lógica no `POST /budget-versions` que busca `Unit.opening_date` |
| 120 períodos determinísticos | ❌ Períodos derivados dos `AssumptionValues` existentes | Implementar `generate_horizon_periods()` e usá-la na `_build_inputs_for_version` |
| DRE começa na `opening_date` da Unidade | ❌ Não existe essa ligação | A `Unit.opening_date` precisa alimentar `BudgetVersion.effective_start_date` automaticamente |

---

### ETAPA 2: Premissas Dinâmicas (Engine Agnóstica ao Nome)

**Status: PARCIALMENTE CORRETO — HÁ HARDCODING QUE PRECISA SER ELIMINADO**

**O problema atual em `_build_inputs_for_version`:**

```python
# calculations.py (linhas ~120–170) — código hardcoded por nome:
fixed = FixedCostInputs(
    rent=_get(values, "aluguel_mensal", p),
    cleaning_staff_salary=_get(values, "salario_limpeza", p),
    ...
    financial_fees=_get(values, "despesas_financeiras_taxas", p),
)
```

A engine só reconhece os ~35 codes hardcoded. Se um usuário criar `"Valet"` com categoria `CUSTO_FIXO`, a engine nunca vai incluí-lo na DRE.

**Arquitetura proposta: Soma Dinâmica por Categoria**

A engine precisa de um segundo passo após os inputs fixos:

```
Algoritmo de coleta dinâmica para o período "2029-06":

1. Mapeia todos os AssumptionValues da versão para o período
2. Para as definições CONHECIDAS (hardcoded codes) → usa o FixedCostInputs estruturado
3. Para as definições DESCONHECIDAS → soma por categoria:
   - category_code = "CUSTO_FIXO"   → acumula em FixedCostInputs.other_fixed_costs
   - category_code = "CUSTO_VARIAVEL" → acumula em VariableCostInputs.other_variable_costs
   - category_code = "RECEITA"      → acumula em RevenueInputs.other_revenue

Resultado: qualquer premissa nova é automaticamente incluída na DRE,
           sem modificar a engine.
```

**Campos receptores que já existem no modelo:**

| Categoria | Campo receptor | Existe? |
|---|---|---|
| `CUSTO_FIXO` (desconhecido) | `FixedCostInputs.other_fixed_costs` ou `FixedCostInputs.financial_fees` | ✅ Existe em `models.py` |
| `CUSTO_VARIAVEL` (desconhecido) | `VariableCostInputs.other_variable_costs` | ✅ Existe |
| `RECEITA` (desconhecido) | `RevenueInputs.other_revenue` | ✅ Existe |

A mudança é **apenas** em `_build_inputs_for_version`: após construir os `FixedCostInputs`, percorrer todas as definitions restantes e acumular nos campos `other_*`.

---

### ETAPA 3: UI de Novas Premissas

**Status: A INFRAESTRUTURA EXISTE. O BOTÃO E O MODAL NÃO EXISTEM AINDA.**

**O que está disponível hoje:**

| Componente | Existe? |
|---|---|
| `POST /assumptions/definitions` — cria nova definition | ✅ Em `assumptions.py` |
| `POST /assumptions/values/bulk-upsert` — cria valor para versão | ✅ Em `assumptions.py` |
| `POST /calculations/recalculate/{version_id}` — dispara recálculo | ✅ Em `calculations.py` |
| Frontend de premissas (`BudgetVersionClient.tsx`) | ✅ Tabela editável já funciona |
| Botão `[+ Adicionar Nova Premissa/Custo]` | ❌ Não existe |
| Modal de criação rápida | ❌ Não existe |

---

## Parte 4 — Resposta às Questões de Arquitetura

### Q1 — Offset da `opening_date` na Engine

**Como funciona o offset:**

```
Unidade 1 (Lab)       → opening_date = 2026-11-01 → mês 1 da DRE = "2026-11"
Unidade 2 (Segunda)   → opening_date = 2028-03-01 → mês 1 da DRE = "2028-03"
Unidade 3 (Terceira)  → opening_date = 2028-10-01 → mês 1 da DRE = "2028-10"
```

**Implementação no `_build_inputs_for_version`:**

```
ANTES:
  periods = sorted(set(period for (_, period) in values.keys() if period))
  → Deriva dos dados, ignora a unidade

DEPOIS:
  unit = db.query(Unit).filter(Unit.id == version.unit_id).first()
  opening = version.effective_start_date or unit.opening_date
  horizon = version.projection_horizon_years or 10
  periods = generate_horizon_periods(opening, horizon)
  → 120 strings ["YYYY-MM", ...] determinísticas
```

**Consequência no consolidado:**

O `consolidator.py` já itera por `unit → budget_version → calculated_results`. Com os `period_date` corretos para cada unidade, o consolidado automaticamente produz a soma correta mês a mês, com o offset natural embutido (U2 não tem resultados antes de Mar/2028).

**Períodos Pré-Operacionais:**

A engine já tem suporte ao campo `FinancialInputs.is_pre_operational` (lido no `engine.py` linha ~98). A lógica é:

```
Para cada período gerado antes da opening_date:
  → is_pre_operational = True
  → Receita = 0, apenas aluguel/custos base
  
Para cada período a partir da opening_date:
  → is_pre_operational = False
  → DRE completa
```

O parâmetro de pré-operacional pode ser calculado automaticamente como:
```
pré_op_meses = meses entre início do contrato/aluguel e opening_date
```
Atualmente está implícito no Excel como os meses de ago–out/2026 (antes da inauguração em nov/2026).

---

### Q2 — Fluxo de Criação de Premissa Dinâmica pelo Usuário

**Cenário: usuário cria "Valet" (R$ 3.000/mês, Custo Fixo)**

```
Step 1 — Frontend: Usuário clica em [+ Adicionar Nova Premissa/Custo]
  → Abre modal com: Nome, Valor Base, Categoria, Regra de Crescimento (opcional)

Step 2 — Frontend: Usuário preenche {name:"Valet", value:3000, category:"CUSTO_FIXO"}
  → Chama POST /assumptions/definitions com:
     { business_id, category_id (CUSTO_FIXO), code:"valet", name:"Valet",
       data_type:"currency", default_value:3000, periodicity:"monthly",
       growth_rule:{"type":"static","value":3000} }
  → API retorna { id: "def-uuid-...", code: "valet" }

Step 3 — Frontend: Com o definition.id, chama bulk-upsert para criar valores:
  → Para cada período no horizonte (ou apenas como valor estático):
     POST /assumptions/values/bulk-upsert
     [{ assumption_definition_id:"def-uuid", period_date:null, 
        value_numeric:3000, source_type:"manual" }]
     (um único valor estático — o growth_rule cuidará da expansão)

Step 4 — Frontend: Chama POST /calculations/recalculate/{versionId}
  → Engine lê todos os AssumptionValues
  → Reconhece "valet" como desconhecido
  → Acumula 3000 em FixedCostInputs.other_fixed_costs
  → Recalcula os 120 períodos
  → Persiste os novos CalculatedResults

Step 5 — Frontend: Recebe retorno do recálculo e redireciona para /results/:versionId
  → DRE atualizada com o custo "Valet" já incluído
```

**A Engine não precisa ser alterada** para incluir o novo custo — apenas a lógica de soma dinâmica por categoria precisa existir. Uma vez implementada, **qualquer premissa nova criada pelo usuário é incluída automaticamente para sempre**.

**Estrutura do endpoint que faz tudo em 1 chamada (`POST /assumptions/quick-add`):**

Para simplificar o frontend, propõe-se criar um endpoint composto:

```
POST /api/v1/assumptions/quick-add
Body:
{
  "budget_version_id": "...",
  "name": "Valet",
  "value": 3000.00,
  "category_code": "CUSTO_FIXO",
  "growth_rule": { "type": "static", "value": 3000.00 }
}

Respostas:
  201 → { definition_id, value_id, code }

Internamente faz:
  1. Resolve category_id a partir de category_code + business_id (via unit → budget_version → unit → business)
  2. Gera code = slugify(name) + "_" + random_suffix para evitar colisão
  3. Cria AssumptionDefinition
  4. Cria AssumptionValue estático (period_date=null)
  5. Retorna os IDs para o frontend
  
  (O recálculo é separado — o usuário aciona quando quiser)
```

---

### Q3 — Arquitetura de Frontend: Filtro de Ano na DRE

**Cenário:** A DRE tem 120 colunas (1 por mês). Mostrar tudo de uma vez é impraticável.

#### Opção A — A API devolve 120 meses e o Frontend filtra

```
GET /calculations/results/{version_id}
Retorna: array de 120+ objetos { period_date, metric_code, value }

Frontend filtra por "Ano selecionado" localmente via useMemo()
```

**Vantagens:**
- Uma única requisição HTTP, sem loading entre anos
- Filtros de ano são instantâneos (zero latência)
- Comparação entre anos é fácil (precalculado em memória)

**Desvantagens:**
- Payload inicial pode ser 120 meses × ~20 métricas = ~2.400 objetos JSON por versão (~150KB)
- Com 8 unidades no consolidado = ~1,2MB de dados

**Mitigação:** Comprimir com gzip (nginx já faz automaticamente) reduz ~150KB para ~15KB. Aceitável.

#### Opção B — O Frontend pede ano a ano

```
GET /calculations/results/{version_id}?year=2029
Retorna: array de 12 meses × métricas para o ano
```

**Vantagens:**
- Payload inicial menor (~12KB)
- Sem sobrecarga inicial

**Desvantagens:**
- Troca de ano = nova requisição HTTP + loading spinner (~300ms)
- Impossível comparar 2028 vs 2029 sem fazer 2 chamadas paralelas
- Complexidade maior no frontend (cache por ano, invalidação, etc.)

---

#### ✅ Recomendação: **Opção A + Separação de Resumo Anual**

```
GET /calculations/results/{version_id}
Retorna:
{
  "annual_summaries": { "2028": {...}, "2029": {...}, ... },  // 10 objetos leves
  "monthly_details": [...]  // 120+ objetos — carregados em background
}
```

**Estratégia de 2 fases:**

```
Fase 1 (imediata):
  → API retorna annual_summaries (já calculados pela engine._build_annual_summaries)
  → Frontend renderiza a visão anual imediatamente (default)
  → Usuário vê a DRE por ano em < 100ms

Fase 2 (sob demanda):
  → Quando usuário clica em "Ver detalhe mensal do ano 2029"
  → Frontend filtra monthly_details já em memória (sem nova requisição)
  → Ou faz GET ?year=2029 se o payload completo não foi carregado

Hook sugerido: useQuery com staleTime=5min para o payload completo
  → Cacheado no React Query após primeira carga
  → Troca de ano = zero latência a partir da segunda visita
```

**Estrutura de componentes React recomendada:**

```
<DRE Page>
  ├── <YearSelector />        — dropdown/pills: 2028 | 2029 | ... | 2038
  ├── <ViewToggle />          — [Anual] [Mensal]
  │
  ├── <AnnualDRETable        — view padrão, dados de annual_summaries
  │     data={annualSummaries}
  │     selectedYear={year} />
  │
  └── <MonthlyDRETable        — view drill-down, renderiza só se visible
        data={filteredMonthly}   e se payload mensal já carregado
        year={selectedYear}
        isLoading={!monthlyLoaded} />
```

**Por que não Server-Side Filtering:**

Os dados de 120 meses são pequenos para um único tenant/unidade. O ganho de performance de filtrar no servidor não compensa a complexidade adicional de paginação/parâmetro de ano na API de resultados. Com React Query e gzip, a abordagem Opção A com 2 fases é mais simples e mais rápida para o usuário.

---

## Parte 5 — Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                   CRIAÇÃO DE BudgetVersion                    │
│                                                               │
│  Frontend: POST /budget-versions                              │
│  { unit_id, scenario_id, name, projection_horizon_years=10 } │
│                           ↓                                   │
│  Backend:                                                     │
│    unit = query(Unit, id=unit_id)                             │
│    effective_start = unit.opening_date    ← NOVO              │
│    effective_end   = start + 10 anos - 1 dia                  │
│    Persiste BudgetVersion com esses campos                    │
│    Retorna: { horizon_start:"2028-03", horizon_end:"2038-02" }│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  EDIÇÃO DE PREMISSAS                          │
│                                                               │
│  Frontend renderiza tabela com 120 colunas                    │
│  (derivadas de horizon_start → horizon_end)                   │
│                                                               │
│  Usuário edita células → bulk-upsert                          │
│  Usuário clica [+ Adicionar Nova Premissa]                    │
│    → POST /assumptions/quick-add                              │
│    → Nova definition + value criados                          │
│    → Nova linha aparece na tabela                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  RECÁLCULO (POST /recalculate)                 │
│                                                               │
│  _build_inputs_for_version:                                   │
│    1. Lê version.effective_start_date + projection_years      │
│    2. Gera 120 períodos determinísticos (NOVO)                │
│    3. Para cada período:                                       │
│       a. Busca AssumptionValues manuais                       │
│       b. Para ausentes: aplica growth_rule (NOVO)             │
│       c. Acumula premises desconhecidas em other_* (NOVO)     │
│       d. Cria FinancialInputs                                 │
│                           ↓                                   │
│  FinancialEngine.calculate(120 inputs)                        │
│    → 120 PeriodResults                                        │
│    → annual_summaries (10 anos)                               │
│    → Payback, Burn Rate, KPIs por período                     │
│                           ↓                                   │
│  engine.persist(outputs, db)                                  │
│    → 120 CalculatedResults no banco                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  VISUALIZAÇÃO (DRE)                           │
│                                                               │
│  GET /calculations/results/{version_id}                       │
│    → Retorna annual_summaries (rápido) + monthly_details      │
│                                                               │
│  Frontend:                                                    │
│    Fase 1: Renderiza AnnualDRETable imediatamente             │
│    Fase 2: Carrega monthly_details em background              │
│    → YearSelector: filtra monthly em memória (0 latência)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Parte 6 — Priorização das Mudanças

### Sprint Imediato (Bloqueante)

| # | Componente | Arquivo | Mudança |
|---|---|---|---|
| 1 | API BudgetVersion | `budget_versions.py` | Derivar `effective_start_date` da `Unit.opening_date` no `POST` |
| 2 | Engine Bridge | `calculations.py` | `_build_inputs_for_version` usa `generate_horizon_periods(version.effective_start_date, horizon)` |
| 3 | Engine Utils | novo `financial_engine/utils.py` | Implementar `generate_horizon_periods()` |
| 4 | Expander | novo `financial_engine/expander.py` | Implementar `expand_assumption(growth_rule, base_value, period, opening_date)` |
| 5 | Engine Bridge | `calculations.py` | Adicionar soma dinâmica por categoria em `_build_inputs_for_version` |

### Sprint Seguinte (UI Dinâmica)

| # | Componente | Arquivo | Mudança |
|---|---|---|---|
| 6 | API Quick-Add | novo endpoint em `assumptions.py` | `POST /assumptions/quick-add` |
| 7 | Frontend Modal | `BudgetVersionClient.tsx` | Botão + modal `AddAssumptionModal` |
| 8 | API Results | `calculations.py` | `GET /results/{id}` retorna `annual_summaries` + `monthly_details` |
| 9 | Frontend DRE | novo `DRETable.tsx` | `YearSelector` + toggle anual/mensal |

### Backlog

| # | Componente | Mudança |
|---|---|---|
| 10 | `AssumptionDefinition` | Adicionar campo `growth_rule: JSON` na migration |
| 11 | Seed | Popular `growth_rule` para as definitions de aluguel, salários, ocupação |
| 12 | Frontend | Selector de `growth_rule` no modal de criação de premissa |

---

## Parte 7 — Arquitetura de Integração de IA (AI Copilot & Sanity Check)

> **Princípio fundamental:** A IA **não substitui** a Financial Engine determinística. A Engine é a fonte da verdade matemática — ela executa os cálculos com 100% de precisão e reprodutibilidade. A IA atua como uma camada de **interpretação semântica** sobre esses cálculos: audita anomalias, traduz linguagem natural em ações de API, e enriquece premissas com inteligência de mercado. As duas camadas nunca se sobrepõem.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ATLAS — AI LAYER                               │
│                                                                        │
│  Linguagem Natural / Contexto Externo                                  │
│         ↓                   ↓                    ↓                     │
│  [NLP Copiloto]    [Auditor de Risco]    [Geopreço Dinâmico]          │
│         ↓                   ↓                    ↓                     │
│    Function Calling    Structured Output    Places API + LLM           │
│         ↓                   ↓                    ↓                     │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    FastAPI (Backend)                          │     │
│  │  /ai/sanity-check  /ai/scenario-copilot  /ai/geo-pricing     │     │
│  └──────────────────────────────────────────────────────────────┘     │
│         ↓                   ↓                    ↓                     │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │         Financial Engine (Determinística — imutável)          │     │
│  └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 7.1 — Funcionalidade 1: Auditor de Risco e Esquecimento (Sanity Check)

#### Objetivo

Após a execução do `POST /calculations/recalculate/{version_id}`, o utilizador pode acionar o Auditor, que analisa a DRE gerada e os pressupostos configurados à procura de **anomalias**, **inconsistências** e **omissões críticas** — sem alterar nenhum dado.

#### Fluxo de Dados (FastAPI → LLM → Resposta Estruturada)

```
Step 1 — Endpoint de entrada:
  POST /api/v1/ai/sanity-check/{version_id}

Step 2 — Backend extrai o contexto da BD:
  a. CalculatedResults → annual_summaries (10 anos)
     Ex: { "2028": { "revenue": 185000, "payroll": 157250, ... } }

  b. AssumptionValues da versão → dict { code: value }
     Ex: { "aluguel_mensal": 19000, "marketing_budget": 0 (ausente!) }

  c. Unit.name, Unit.opening_date, BudgetVersion.name

Step 3 — Monta o payload do LLM (System Prompt + User Message):
  [SYSTEM]
  Você é um auditor financeiro especializado em negócios de coworking fitness.
  Analise a DRE projetada e as premissas fornecidas.
  NUNCA sugira alterar os cálculos matemáticos. Apenas identifique riscos,
  omissões e anomalias usando os thresholds abaixo como referência:
    - Folha de pagamento > 55% da receita → risco crítico
    - Ausência de custo de Marketing/Vendas → alerta de omissão
    - Margem EBITDA < 0% nos primeiros 18 meses → sinalizar como esperado (pré-operacional)
    - Margem EBITDA < 0% após mês 36 → risco de insolvência
    - CAC / LTV ratio não modelado → recomendar inclusão futura
  Responda SEMPRE no formato JSON estruturado definido abaixo.

  [USER]
  Unidade: Segunda Unidade (Abertura: 2028-03)
  DRE Resumo Anual:
  { "2028": { "revenue": 185000, "total_costs": 215000, "ebitda": -30000,
              "payroll": 157250, "rent": 19000, "occupancy_rate": 0.12 },
    "2029": { "revenue": 412000, "total_costs": 380000, "ebitda": 32000,
              "payroll": 206000, "rent": 20900, "occupancy_rate": 0.28 }, ... }

  Premissas configuradas:
  { "aluguel_mensal": 19000, "salario_gerente": 3500, ..., "marketing_budget": null }

Step 4 — Chama o LLM com Structured Outputs (resposta tipada):
  Modelo: gpt-4o ou gemini-1.5-pro
  response_format: { "type": "json_schema", "json_schema": AuditReport }

Step 5 — Retorna ao frontend o AuditReport estruturado
```

#### Schema da Resposta Estruturada (`AuditReport`)

```json
{
  "overall_health": "warning",
  "risk_score": 62,
  "alerts": [
    {
      "severity": "critical",
      "category": "payroll",
      "year": "2028",
      "message": "A folha de pagamento consome 85% da receita no Ano 1 (2028). O threshold de risco é 55%. Rever quadro de funcionários no período pré-escala.",
      "metric_affected": "payroll_to_revenue_ratio",
      "current_value": 0.850,
      "threshold": 0.550
    },
    {
      "severity": "warning",
      "category": "omission",
      "year": null,
      "message": "Nenhum custo de Marketing/Vendas foi configurado para suportar a curva de ocupação projetada (3% → 75% em 10 anos). Negócios B2B típicos gastam 8-15% da receita em aquisição de clientes.",
      "metric_affected": "marketing_budget",
      "current_value": 0.0,
      "threshold": null
    },
    {
      "severity": "info",
      "category": "ebitda",
      "year": "2028",
      "message": "EBITDA negativo em 2028 (-R$ 30.000) é esperado no período pré-operacional e de ramp-up. A breakeven mensal é projetada para o mês 19 (Out/2029).",
      "metric_affected": "ebitda",
      "current_value": -30000,
      "threshold": 0
    }
  ],
  "recommendations": [
    "Considere escalonar a contratação da equipa: iniciar com 60% do quadro e expandir conforme a ocupação supera 35%.",
    "Adicione uma rubrica de 'Custo de Aquisição de Clientes' (CUSTO_VARIAVEL) estimada em 5-10% da receita dos primeiros 24 meses.",
    "O payback projetado de 7.2 anos está acima da média do setor (5-6 anos). Revisar o plano de financiamento pode reduzir o custo de capital."
  ],
  "generated_at": "2026-03-20T14:30:00Z",
  "model_used": "gpt-4o-2024-08-06",
  "version_id": "uuid-...",
  "tokens_used": 2847
}
```

#### Arquitetura do Endpoint no FastAPI

```python
# backend/app/api/v1/endpoints/ai.py

POST /ai/sanity-check/{version_id}
  Autenticação: Bearer token (mesmo middleware existente)
  Rate limit: 10 chamadas/hora por utilizador (evitar custos excessivos)

Serviço: AIAuditService
  ├── .build_context(version_id, db) → AuditContext
  │     Lê: annual_summaries, assumption_values, unit metadata
  │     Formata: JSON leve (~3-5KB)
  │
  ├── .call_llm(context) → AuditReport
  │     Provider: configurável via ENV (OPENAI_API_KEY / GEMINI_API_KEY)
  │     Structured Output: schema Pydantic → json_schema
  │     Timeout: 30s com retry exponencial (máx 2 tentativas)
  │
  └── .persist_audit(report, db) → AuditLog
        Tabela: ai_audit_logs (já existe no modelo AuditLog)
        Campos: version_id, report_json, tokens_used, model, cost_usd
```

#### Segurança e Custo

| Preocupação | Solução |
|---|---|
| Injeção de dados maliciosos no prompt | Cada campo do contexto é sanitizado antes de serializar; nunca interpolado diretamente como string |
| Custo AWS/OpenAI descontrolado | Rate limiting por utilizador + estimativa de tokens antes de enviar (context ~1500 tokens, custo ~$0.005/chamada com gpt-4o) |
| Dados financeiros sensíveis no LLM | Contexto usa apenas valores agregados (annual_summaries), nunca dados de clientes nominais; GDPR-safe |
| Dependência de API externa | Toda chamada de LLM é assíncrona com timeout; fallback retorna `{"overall_health": "unavailable"}` — a app nunca quebra |

---

### 7.2 — Funcionalidade 2: Copiloto de Cenários (What-If NLP)

#### Objetivo

O utilizador escreve um comando em linguagem natural na UI. O backend usa **Function Calling** para que o LLM decomponha o pedido numa sequência de chamadas à API interna, executando automaticamente a operação desejada sem código adicional.

#### Fluxo Completo: "Crie um cenário pessimista atrasando a obra em 3 meses e subindo o aluguel em 15%"

```
Step 1 — Endpoint de entrada:
  POST /api/v1/ai/scenario-copilot
  Body: { "budget_version_id": "...", "command": "Crie um cenário pessimista
          atrasando a obra em 3 meses e subindo o aluguel em 15%" }

Step 2 — Backend envia ao LLM com Function Calling:
  Modelo: gpt-4o (Function Calling nativo)

  [SYSTEM]
  Você é um assistente de planejamento financeiro para o Atlas Finance.
  Você tem acesso às funções abaixo para manipular BudgetVersions.
  Interprete o pedido do utilizador e chame as funções na ordem correta.
  NUNCA invente valores. Se um parâmetro não estiver claro, use null e
  o sistema pedirá confirmação ao utilizador.

  Funções disponíveis:
  - clone_budget_version(source_id, new_name) → new_version_id
  - update_opening_date(version_id, offset_months) → updated_version
  - update_assumption_growth_rule(version_id, code, new_base_value, rate_override)
  - recalculate_version(version_id) → calculation_status

  [USER]
  "Crie um cenário pessimista atrasando a obra em 3 meses e subindo o aluguel em 15%"
  Versão atual: { id: "v-123", name: "Base 2028", unit: "Segunda Unidade",
                  opening_date: "2028-03", rent: 19000 }

Step 3 — LLM responde com Function Calls (não texto):
  [
    { "function": "clone_budget_version",
      "arguments": { "source_id": "v-123", "new_name": "Pessimista — Obra +3m, Aluguel +15%" } },

    { "function": "update_opening_date",
      "arguments": { "version_id": "NEW_ID", "offset_months": 3 } },

    { "function": "update_assumption_growth_rule",
      "arguments": { "version_id": "NEW_ID", "code": "aluguel_mensal",
                     "new_base_value": 21850, "rate_override": null } },

    { "function": "recalculate_version",
      "arguments": { "version_id": "NEW_ID" } }
  ]

Step 4 — Backend executa as funções como chamadas internas à própria API:
  a. Clona BudgetVersion → new_version_id
  b. Soma 3 meses à opening_date da nova versão
  c. Atualiza growth_rule do aluguel: base_value = 19000 × 1.15 = 21.850
  d. Chama _build_inputs_for_version + FinancialEngine.calculate
  e. Persiste os novos CalculatedResults

Step 5 — Retorna ao frontend:
  {
    "status": "completed",
    "new_version_id": "v-456",
    "new_version_name": "Pessimista — Obra +3m, Aluguel +15%",
    "actions_executed": ["clone", "update_opening_date", "update_assumption", "recalculate"],
    "summary": "Cenário criado. A nova abertura é Jun/2028. O aluguel sobe para R$ 21.850/mês. O payback passa de 7,2 para 9,1 anos.",
    "redirect_url": "/results/v-456"
  }
```

#### Mapa de Funções Disponíveis para o LLM

```python
# Cada função é um wrapper thin sobre endpoints já existentes

AVAILABLE_FUNCTIONS = {
  "clone_budget_version": {
    "description": "Clona uma BudgetVersion existente com um novo nome",
    "parameters": {
      "source_id": "UUID da versão a clonar",
      "new_name": "Nome da nova versão (ex: 'Pessimista', 'Otimista Q2')"
    },
    "calls_internally": "POST /budget-versions/clone/{source_id}"
  },
  "update_opening_date": {
    "description": "Atrasa ou adianta a data de abertura em N meses",
    "parameters": {
      "version_id": "UUID da versão",
      "offset_months": "Número inteiro — positivo = atraso, negativo = antecipação"
    },
    "calls_internally": "PATCH /budget-versions/{id} (effective_start_date)"
  },
  "update_assumption_growth_rule": {
    "description": "Atualiza o valor base ou taxa de crescimento de uma premissa",
    "parameters": {
      "version_id": "UUID da versão",
      "code": "Código da assumption (ex: 'aluguel_mensal', 'taxa_ocupacao')",
      "new_base_value": "Novo valor base absoluto (ou null para manter)",
      "rate_override": "Nova taxa de crescimento anual como decimal (ou null)"
    },
    "calls_internally": "PUT /assumptions/values (upsert do AssumptionValue)"
  },
  "create_assumption": {
    "description": "Cria uma nova rubrica de custo ou receita na versão",
    "parameters": {
      "version_id": "UUID da versão",
      "name": "Nome da rubrica",
      "category": "CUSTO_FIXO | CUSTO_VARIAVEL | RECEITA | CAPEX",
      "base_value": "Valor mensal base",
      "growth_rule": "JSON da regra de crescimento (opcional)"
    },
    "calls_internally": "POST /assumptions/quick-add"
  },
  "recalculate_version": {
    "description": "Dispara o recálculo completo dos 120 meses da DRE",
    "parameters": {
      "version_id": "UUID da versão"
    },
    "calls_internally": "POST /calculations/recalculate/{version_id}"
  }
}
```

#### Arquitetura do Serviço no FastAPI

```
ScenarioCopilotService
  ├── .parse_command(command, version_context) → [FunctionCall]
  │     Envia ao LLM com tool_choice="auto"
  │     Recebe lista ordenada de FunctionCall objects
  │
  ├── .validate_calls(calls) → [ValidatedCall]
  │     Verifica que cada função existe no AVAILABLE_FUNCTIONS
  │     Verifica limites de segurança:
  │       - Máx 5 funções por comando (evitar loops)
  │       - offset_months entre -24 e +48 (evitar datas impossíveis)
  │       - rate_override entre -0.50 e +2.00 (evitar crescimentos absurdos)
  │
  ├── .execute_calls(calls, db) → [ExecutionResult]
  │     Executa cada função sequencialmente
  │     Se qualquer função falhar → rollback das anteriores (transação DB)
  │
  └── .generate_summary(results) → str
        Pede ao LLM um resumo em 2-3 frases do que mudou (chamada leve)
```

#### Ponto de Atenção: Confirmação antes de Executar (UX Recomendada)

Para pedidos destrutivos ou com muitas alterações, o backend deve ter um modo `dry_run`:

```
POST /ai/scenario-copilot
Body: { ..., "dry_run": true }
Retorna: { "planned_actions": [...], "confirmation_required": true }

POST /ai/scenario-copilot
Body: { ..., "dry_run": false, "confirmed": true }
Retorna: { "status": "completed", ... }
```

Isso garante que o utilizador **nunca é surpreendido** por uma alteração não intencional.

---

### 7.3 — Funcionalidade 3: Inteligência Geoespacial (Precificação Dinâmica)

#### Objetivo

Sugerir valores ótimos para os planos Diamante/Ouro/Prata/Bronze com base no perfil socioeconômico e competitivo da região onde a unidade será aberta, usando dados reais de mercado como contexto para o LLM.

#### Fluxo de Dados (CEP/Bairro → Places API → LLM → Sugestão de Preços)

```
Step 1 — Endpoint de entrada:
  POST /api/v1/ai/geo-pricing
  Body: { "unit_id": "...", "location": { "cep": "04538-133",
          "bairro": "Itaim Bibi", "cidade": "São Paulo" } }

Step 2 — Backend chama Google Places API (ou alternativa: OpenStreetMap + Foursquare):
  a. Busca "personal trainer studio" num raio de 1km do CEP
  b. Busca "academia", "coworking", "pilates" no mesmo raio
  c. Coleta: { name, rating, price_level, user_ratings_total, types }
  d. Filtra os 5-10 mais relevantes

  Exemplo de resultado:
  [
    { "name": "Smart Fit Itaim", "type": "gym", "price_level": 1, "rating": 4.2 },
    { "name": "Studio Pilates Premium", "type": "studio", "price_level": 3, "rating": 4.8 },
    { "name": "Cross Training SP", "type": "gym", "price_level": 2, "rating": 4.5 }
  ]

Step 3 — Enriquece com dados socioeconômicos (via API do IBGE ou ViaCEP):
  { "cep": "04538-133", "bairro": "Itaim Bibi",
    "renda_media_domiciliar": "alto", "densidade_pop": "alta",
    "idhm": 0.89 }

Step 4 — Monta o contexto para o LLM:
  [SYSTEM]
  Você é um especialista em precificação de espaços fitness B2B no Brasil.
  Com base no perfil da região e nos concorrentes mapeados, sugira os
  preços ótimos dos planos de hora para Personal Trainers:
  - Diamante (200+ aulas/mês, clientes premium)
  - Ouro (110-200 aulas/mês, volume médio-alto)
  - Prata (41-70 aulas/mês, volume médio)
  - Bronze (4-40 aulas/mês, teste/início)

  Considere: elasticidade de preço por perfil socioeconômico,
  preços dos concorrentes na região, disposição a pagar de PTs
  que atuam em academia de alto padrão vs. independentes.
  Responda no formato JSON estruturado definido abaixo.

  [USER]
  Região: Itaim Bibi, São Paulo (CEP 04538-133)
  Perfil: Renda alta, IDHM 0.89, alta densidade
  Concorrentes identificados: [lista dos 5-10 acima]
  Preços atuais configurados: { Diamante: R$65/h, Ouro: R$60/h, Prata: R$55/h, Bronze: R$50/h }

Step 5 — LLM retorna GeoPricingReport estruturado:
  {
    "location_profile": {
      "segment": "premium",
      "competitive_density": "high",
      "price_elasticity": "low"
    },
    "suggested_prices": {
      "diamante": { "current": 65.0, "suggested": 80.0, "rationale": "Região premium com concorrentes a R$85-100/h" },
      "ouro":     { "current": 60.0, "suggested": 72.0, "rationale": "PTs consolidados no Itaim pagam R$65-80/h atualmente" },
      "prata":    { "current": 55.0, "suggested": 62.0, "rationale": "Alinhado à faixa de entrada do mercado local" },
      "bronze":   { "current": 50.0, "suggested": 50.0, "rationale": "Manter como âncora de aquisição — não alterar" }
    },
    "revenue_impact": {
      "annual_delta_at_70pct_occupancy": 47800.0,
      "payback_reduction_months": 4
    },
    "confidence": "high",
    "data_sources": ["Google Places", "IBGE ViaCEP"],
    "caveats": ["Dados de concorrentes reflectem posicionamento percebido, não preços reais. Validar com pesquisa de mercado direta."]
  }

Step 6 — Frontend exibe sugestão com botão [Aplicar Preços Sugeridos]:
  → Ao confirmar, faz bulk-upsert nos AssumptionValues do ServicePlan
  → Aciona recalculate para atualizar a DRE imediatamente
```

#### Considerações de Cache e Custo

| Item | Estratégia |
|---|---|
| Google Places API | Cache de 30 dias por CEP (Redis ou tabela `geo_cache` no Postgres) — a competição local não muda semanalmente |
| Chamada ao LLM | Cache por `(cep + preços_atuais)` hash com TTL de 7 dias |
| Custo estimado por análise | Places: ~$0.002 (50 resultados) + LLM: ~$0.008 (2K tokens) = ~$0.01 por análise |
| Quotas gratuitas (MVP) | Google Places tem $200/mês de crédito gratuito (~20.000 buscas) |

---

### 7.4 — Infraestrutura Partilhada da AI Layer

#### Configuração de Ambiente

```python
# backend/app/core/config.py — campos a adicionar

# AI Provider
AI_PROVIDER: str = "openai"          # "openai" | "gemini" | "mock"
OPENAI_API_KEY: str | None = None
GEMINI_API_KEY: str | None = None
AI_MODEL_AUDIT: str = "gpt-4o-2024-08-06"
AI_MODEL_COPILOT: str = "gpt-4o-2024-08-06"
AI_MODEL_PRICING: str = "gpt-4o-mini"      # pricing mais leve, custo menor

# Geospatial
GOOGLE_PLACES_API_KEY: str | None = None
GEO_CACHE_TTL_DAYS: int = 30

# AI Safety
AI_RATE_LIMIT_PER_USER_HOUR: int = 10
AI_MAX_CONTEXT_TOKENS: int = 8000
```

#### Estrutura de Pastas Proposta

```
backend/app/
  services/
    financial_engine/       ← já existe (determinístico, não toca)
    ai/                     ← NOVO
      __init__.py
      client.py             ← abstração sobre OpenAI/Gemini (troca de provider via config)
      audit_service.py      ← AuditService (Sanity Check)
      copilot_service.py    ← ScenarioCopilotService (NLP)
      geo_service.py        ← GeoPricingService
      prompts/
        audit_system.txt    ← system prompt do auditor (versionado no repo)
        copilot_system.txt  ← system prompt do copiloto
        pricing_system.txt  ← system prompt de precificação
      schemas/
        audit.py            ← Pydantic: AuditReport, AuditAlert
        copilot.py          ← Pydantic: FunctionCall, CopilotResponse
        geo_pricing.py      ← Pydantic: GeoPricingReport, SuggestedPrice
  api/v1/endpoints/
    ai.py                   ← NOVO — endpoints /ai/*
```

#### Tabela de Rastreabilidade dos Endpoints

| Endpoint | Funcionalidade | Auth | Rate Limit | Custo Est./Chama |
|---|---|---|---|---|
| `POST /ai/sanity-check/{version_id}` | Auditor de Risco | ✅ Bearer | 10/hora | ~$0.005 |
| `POST /ai/scenario-copilot` | Copiloto NLP | ✅ Bearer | 5/hora | ~$0.015 |
| `POST /ai/geo-pricing` | Geopreço Dinâmico | ✅ Bearer | 3/hora | ~$0.012 |
| `GET /ai/audit-history/{version_id}` | Histórico de auditorias | ✅ Bearer | — | — |

#### Isolamento da AI Layer da Financial Engine

```
REGRA ARQUITETURAL (imutável):
  ✅ A AI Layer PODE     → ler CalculatedResults e AssumptionValues
  ✅ A AI Layer PODE     → chamar a API interna (clone, upsert, recalculate)
  ✅ A AI Layer PODE     → sugerir valores e aguardar confirmação do utilizador
  ❌ A AI Layer NÃO PODE → chamar funções da Financial Engine diretamente
  ❌ A AI Layer NÃO PODE → escrever em CalculatedResults diretamente
  ❌ A AI Layer NÃO PODE → alterar premissas SEM confirmação explícita do utilizador
                           (exceto em dry_run mode)

Razão: A Financial Engine é determinística e testável. Misturar
       output de LLM com resultados numéricos impossibilitaria
       auditoria, debug e reprodução de resultados.
```

---

### 7.5 — Roadmap de Activação da AI Layer

| Fase | Pré-requisito | Funcionalidade |
|---|---|---|
| **Fase A (Pós Sprint Imediato)** | Engine com 120 meses + growth_rule funcionando | Auditor de Risco — a DRE precisa existir para ser auditada |
| **Fase B (Pós UI Dinâmica)** | Endpoint `/assumptions/quick-add` + clone de versão | Copiloto NLP — precisa das funções que vai chamar |
| **Fase C (Expansão Geográfica)** | Google Places API Key configurada | Geopreço Dinâmico — faz sentido quando houver unidades em diferentes cidades |

---

## Conclusão

O Atlas já possui **toda a infraestrutura de dados necessária** (campos `opening_date`, `projection_horizon_years`, `effective_start_date`, `other_fixed_costs`, etc.). A refatoração não é uma reconstrução — é uma **ligação** entre as peças que já existem mas ainda não conversam entre si:

1. `Unit.opening_date` → precisa alimentar `BudgetVersion.effective_start_date`
2. `BudgetVersion.effective_start_date + projection_horizon_years` → precisa alimentar os 120 períodos da engine
3. `AssumptionDefinition.growth_rule` → precisa ser criado e interpretado pela engine para eliminar os 120 linhas manuais
4. `other_fixed_costs / other_variable_costs` → precisam receber o somatório dinâmico das premissas desconhecidas

---

*Relatório de arquitetura gerado por análise do código-fonte atual vs. requisitos das planilhas Excel. v1.1 — AI Layer adicionada em 2026-03-20.*
