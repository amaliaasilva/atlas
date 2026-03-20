# SCHEMA VALIDATION REPORT
## Gap Analysis: Banco de Dados Atlas vs. Planilhas Excel

> **Versão:** 1.0  
> **Data:** 2026-03-20  
> **Analista:** GitHub Copilot (Arquiteto de BD Sênior / Engenheiro Financeiro)  
> **Fonte BD:** `/backend/app/models/` + `/backend/app/services/financial_engine/`  
> **Fonte Excel:** `/planilha/` (9 arquivos — Lab + Unidades 2–8 + Consolidado + Dashboard Base)

---

## 1. Resumo Executivo

O banco de dados atual possui uma arquitetura **parcialmente compatível** com a complexidade real do negócio modelado nas planilhas. A fundação está correta (Organization → Business → Unit → Scenario → BudgetVersion → AssumptionValue → CalculatedResult), mas existem **lacunas críticas** que impedem a persistência fiel de 30%+ das variáveis configuráveis do Excel, o suporte correto a algumas fórmulas-chave e o armazenamento de KPIs estratégicos explicitamente calculados nas planilhas.

---

## 2. O Que Está Correto ✅

### 2.1 Hierarquia de Entidades

| Entidade BD | Equivalente no Excel | Status |
|---|---|---|
| `organizations` | Holding/grupo (implícito) | ✅ Presente |
| `businesses` | Modelo de negócio Atlas (cowork_gym) | ✅ Presente |
| `units` | Unidade Laboratório, U2–U8 | ✅ Presente |
| `scenarios` | Cenário base/conservador/agressivo | ✅ Presente |
| `budget_versions` | Versão do orçamento (ex: "16.0") com datas de vigência | ✅ Presente |

### 2.2 Premissas Genéricas (AssumptionDefinition/Value)

O modelo EAV (Entity-Attribute-Value) de `assumption_definitions` + `assumption_values` é **arquiteturalmente correto** — permite armazenar qualquer variável configurável do Excel como uma linha na tabela, incluindo periodicidade, tipo de dado e referência de fonte. Isso cobre:

- Todas as premissas nomeadas nas abas (se forem cadastradas como definitions)

### 2.3 Estrutura de Custos (LineItemDefinition)

A tabela `line_item_definitions` tem as categorias corretas para cobrir a DRE do Excel:

| Categoria BD | Linhas do Excel (Aba Orçamento) | Status |
|---|---|---|
| `revenue` | Receita Total | ✅ |
| `fixed_cost` | Custos Fixos (1.x) | ✅ |
| `variable_cost` | Custos Variáveis (2.x) | ✅ |
| `tax` | Impostos sobre Vendas (3.x) | ✅ |
| `financing` | Financiamento e Empréstimos (4.x) | ✅ |
| `staffing` | Salários (1.1.x) | ✅ |
| `utility` | Energia, Água (1.2.x) | ✅ |
| `capex` | CAPEX / Custo Investimento | ✅ |

### 2.4 Motor Financeiro (Financial Engine)

O serviço `financial_engine` implementa:

- Cálculo PRICE (PMT) para financiamentos — compatível com a aba **Financiamento**
- Cálculo de Payback Simples — compatível com a projeção consolidada
- Cálculo de Burn Rate — compatível com o conceito de "Caixa Necessário"
- Cálculo de Break-Even em número de alunos — alinhado com os dados da aba **Unit economics**

### 2.5 Auditoria

A tabela `audit_logs` com campos `old_value`, `new_value` (JSON) e `performed_by` fornece a trilha básica de auditoria para mudanças de premissas — cobrindo o requisito de rastrear "quem mudou o quê".

### 2.6 Resultados Calculados

- `calculated_results` armazena resultados mensais por linha, com coluna `period_date` ("YYYY-MM") suportando o horizonte de 10 anos (ou qualquer horizonte).
- `consolidated_results` armazena métricas agregadas por business/scenario — cobre o arquivo "Consolidado".
- Campo `calculation_trace` (JSON) em `calculated_results` permite registrar a trilha de cálculo detalhada por período.

---

## 3. Gaps de Dados (Lacunas de Colunas/Variáveis) ⚠️

### GAP-01 — Modelo de Receita Por Hora (não por aluno/vaga)

**Onde no Excel:** Abas `Cálcul. trabalhado` e `Ocupação e unit economics 2.0`

O modelo de negócio do Atlas é **venda de hora/espaço para Personal Trainers**, não de mensalidade de aluno. As variáveis de receita são:

| Variável Excel | Onde Guardar no BD Atual | Status |
|---|---|---|
| Vagas/hora (`vagas_por_hora = 10`) | Não existe coluna na model `Unit` nem campo em `RevenueInputs` | ❌ Falta |
| Horário de funcionamento: Abertura/Fechamento semana (`05h–22h`) | Não existe | ❌ Falta |
| Horário de funcionamento: Abertura/Fechamento sábado (`08h–15h`) | Não existe | ❌ Falta |
| Horas de funcionamento/dia semana (`17h`) | Não existe na `Unit` | ❌ Falta |
| Horas de funcionamento/dia sábado (`7h`) | Não existe | ❌ Falta |
| Dias úteis/ano por unidade (calculados considerando feriados) | Não existe | ❌ Falta |
| Sábados/ano por unidade | Não existe | ❌ Falta |
| Capacidade aulas/mês (derived: vagas × horas × dias) | Não existe como campo; apenas derivável | ⚠️ Derivado sem premissa armazenada |

**Impacto:** O `RevenueInputs` atual usa `max_students` + `avg_ticket_monthly`, mas o modelo real usa `vagas_por_hora × horas_dia × dias_mes × taxa_ocupacao`. A modelagem de receita no BD está baseada em conceito errado para este negócio.

---

### GAP-02 — Categorias de Personal Trainer e Tabela de Preços

**Onde no Excel:** Aba `Cálcul. trabalhado` (Classificação Personal Hora) e `Benefícios Personal`

| Variável Excel | Status BD |
|---|---|
| Categoria: Diamante / Ouro / Prata / Bronze | ❌ Não existe tabela de categorias de PT |
| R$ Hora por categoria (50 / 55 / 60 / 65) | ❌ Não existe |
| Meta % de distribuição por categoria (40% / 30% / 20% / 15%) | ❌ Não existe |
| Meta de aulas/mês por categoria (110-200+ / 71-110 / 41-70 / 4-40) | ❌ Não existe |
| Preço médio ponderado (R$ 57,50/hora) — calculado pelo mix | ❌ Não existe como premissa gravável |
| Taxa do cartão por ano (3,5% para todos os anos 2026–2034) | Apenas o campo `tax_rate_on_revenue` genérico; sem identificação como "taxa cartão" | ⚠️ Parcial |

**Impacto:** O `RevenueInputs.avg_ticket_monthly` é um único número. O modelo real requer uma **tabela de planos** com preço unitário e percentual de mix.

---

### GAP-03 — Fórmula de Utilities Mistas (Fixo + Variável por Ocupação)

**Onde no Excel:** Aba `Água e luz`

A lógica é: `Custo Total = Parcela_Fixa + (Parcela_Variável_Máxima × Taxa_Ocupação × Fator_Automação)`

| Variável Excel | Status BD |
|---|---|
| `custo_fixo_energia_base` (R$ 4.200) | `electricity_kwh × electricity_rate` — conceito errado (kWh × tarifa) | ⚠️ Conceito divergente |
| `parcela_variavel_maxima_energia` (R$ 3.000 a 100% ocup.) | ❌ Não existe |
| `reducao_automacao` (20%) — desconto por automação de ar-condicionado | ❌ Não existe |
| `custo_fixo_agua_base` (R$ 300) | Idem — `water_m3 × water_rate` é conceito diferente | ⚠️ Conceito divergente |
| `parcela_variavel_maxima_agua` (R$ 1.300 a 100% ocup.) | ❌ Não existe |

**Impacto:** O `FixedCostInputs` modela utilities como `kWh × tarifa`, mas o Excel usa uma fórmula bi-partido (fixo + variável proporcional à ocupação). O cálculo atual produziria valores incorretos para este negócio.

---

### GAP-04 — Folha de Pagamento por Cargo com Progressão

**Onde no Excel:** Aba `Equipe` (tabela por ano 2027–2034)

| Variável Excel | Status BD |
|---|---|
| Salário base por cargo (Recepção, Atendimento Comercial, Gerente, Limpeza, Marketing, Educador Físico) | ✅ Campos individuais em `FixedCostInputs` |
| % Produtividade por cargo (e.g., Gerente: 2% sobre receita) | ❌ Não existe. `social_charges_rate` é só encargos, não produtividade |
| Valor R$ de Produtividade calculado por ano | ❌ Não existe |
| Encargos + Benefícios como % sobre salário (`0.8` = 80% encargos sobre salário) | ⚠️ `social_charges_rate = 0.08` (FGTS 8%) — mas Excel usa 80%, que provavelmente inclui outros encargos. Definição diferente |
| Número de funcionários por cargo | Existe como campo único `num_employees` — não por cargo | ⚠️ Parcial |
| Pró-labore separado do restante da equipe (não incide encargos) | `pro_labore` existe mas é somado com o restante antes de calcular encargos | ⚠️ Bug de cálculo |

**Impacto:** A taxa de 80% do Excel (`R$ Encargos = Salário × 0.8`) provavelmente representa encargos totais (INSS empregado + empregador + FGTS + benefícios). O BD usa 8% (só FGTS). Isso implica subestimação severa dos custos de folha.

---

### GAP-05 — Benefícios por Categoria de Personal Trainer

**Onde no Excel:** Aba `Benefícios Personal`

A tabela mostra quais benefícios cada categoria recebe (Internet, Bebedouro, Banho, Acesso Facial, Kit Higiene, Sala Reunião, etc.) e implica um custo diferenciado por categoria.

| Variável | Status BD |
|---|---|
| Tabela de benefícios por categoria (Diamante/Ouro/Prata/Bronze) | ❌ Não existe. Só `benefits_per_employee` (valor único) |
| Custo de acesso facial / sistema de segurança por unidade | `security_systems` existe em `FixedCostInputs` | ✅ Parcial |
| Horas/dia e dias/mês de uso por plano (para custo de infraestrutura) | ❌ Não existe |

---

### GAP-06 — Estrutura de Financiamento Múltiplo (CAPEX Parcelado)

**Onde no Excel:** Aba `Financiamento`

O Excel modela **financiamentos independentes** para cada componente do CAPEX:

| Componente | VP | Taxa | Prazo | Status BD |
|---|---|---|---|---|
| Máquinas (pesos livres) | R$ 287.951 | 0% | 12 meses | `FinancingInputs` tem apenas UM financiamento | ❌ |
| Máquinas (equipamentos pesados) | R$ 42.736 | 0% | 12 meses | ❌ Idem |
| Imóvel (FINAME/Obra) | R$ 1.750.000 | 1,2% a.m. | 60 meses | ❌ Idem |
| Projeto Arquiteto | R$ 14.000 | 0% | 3 meses | ❌ |
| Branding | R$ 28.530 | 0% | — (pagamento único) | ❌ |

**Impacto:** `FinancingInputs` tem um único `financed_amount` + `monthly_interest_rate` + `term_months`. O modelo real exige **múltiplas linhas de financiamento por unidade**, cada uma com taxa e prazo próprios. O campo `grace_period_months` existe e é positivo — mas a multiplicidade está ausente.

---

### GAP-07 — Offset de Ativação das Unidades (Cronograma)

**Onde no Excel:** Aba `Cronograma de ativ.` e aba `Resultado consolidado` (datas de abertura por unidade)

| Conceito | Status BD |
|---|---|
| Data de inauguração da unidade (ex: Lab = Nov/2026, U2 = Mar/2028) | `Unit.opening_year` armazena **só o ano**, sem mês | ⚠️ Incompleto |
| Fases do cronograma pré-abertura (Fase I a VI) com duração em dias e offset | ❌ Não existe tabela de cronograma/milestone |
| Data de início do financiamento (que pode diferir da abertura) | ❌ Não existe. `FinancingInputs` não tem `start_date` |
| "Burning period" pré-receita (quando os custos já incidem antes da inauguração) | ❌ Não existe indicador de quando custos começam antes da receita |

**Impacto:** A projeção consolidada das 8 unidades depende criticamente do offset correto para cada unidade. Sem `opening_month`, o sistema não consegue posicionar a curva de receita de cada unidade corretamente no tempo.

---

### GAP-08 — Dados de CAPEX Detalhados

**Onde no Excel:** Aba `Custo investimento Lab`

| Item de CAPEX | Status BD |
|---|---|
| Equipamentos (R$ 472.410) | `CapexInputs.equipment_value` ✅ |
| Projeto arquiteto (R$ 28.000) | `CapexInputs.pre_operational_expenses` — misturado | ⚠️ |
| Reforma / Obra (R$ 250.000) | `CapexInputs.renovation_works` ✅ |
| Automação ArCond. (R$ 20.000) | ❌ Não existe campo específico |
| Branding (R$ 28.530) | `CapexInputs.other_capex` — misturado | ⚠️ Sem granularidade |
| Caixa necessário (validação 12 meses: R$ 342.004) | `CapexInputs.working_capital` ✅ — existe, mas não há fórmula para calculá-lo automaticamente a partir do Burn Rate |
| Orçamento de Máquinas (aba separada com lista de equipamentos) | ❌ Não existe tabela de equipamentos individuais |

---

### GAP-09 — KPIs Estratégicos Ausentes na `consolidated_results`

**Onde no Excel:** Abas `Unit economics anual`, `Unit economics (fixos)`, `Dashboard base`

A tabela `consolidated_results` armazena `metric_code` + `value` — é genérica o suficiente para guardar esses KPIs, **mas eles precisam ser calculados e persistidos explicitamente**. Hoje não há evidência de que os seguintes KPIs sejam gravados:

| KPI Excel | Onde Deveria Ficar | Status |
|---|---|---|
| Ponto de Equilíbrio em R$ por ano por unidade | `consolidated_results` (metric_code = 'break_even_revenue') | ⚠️ KPI exists in engine mas sem garantia de persistência |
| Ponto de Equilíbrio em % de ocupação | idem (`break_even_occupancy_pct`) | ❌ Não calculado no engine |
| Aulas vendidas necessárias para breakeven | idem (`break_even_classes`) | ❌ Não calculado |
| Professores necessários para breakeven | idem (`break_even_trainers`) | ❌ Não calculado |
| Margem de contribuição (%) por ano | idem (`contribution_margin_pct`) | ❌ Não persistido |
| Resultado Líquido após Custo de Capital (CAPEX Total consolidado) | `consolidated_results` business-level | ❌ Não existe |
| Payback por unidade (mês em que fluxo acumulado zera) | `consolidated_results` ou campo em `budget_versions` | ⚠️ Calculado no engine, não persistido |
| Ocupação projetada por ano (premissa central do negócio) | `assumption_values` — só se cadastrada como definition | ⚠️ Depende de seed |
| Receita/mês a full capacity | `consolidated_results` ou `calculated_results` | ❌ Não calculado como KPI separado |

---

### GAP-10 — Taxa de Imposto Detalhada (Regime Simples/Presumido)

**Onde no Excel:** Aba `Orçamento` (linha 3 — Impostos sobre Vendas)

| Variável | Status BD |
|---|---|
| `percentual_sobre_venda = 6%` (Lucro Presumido) | `TaxInputs.tax_rate_on_revenue = 0.06` ✅ |
| Regime tributário (Simples / Presumido / Real) | ❌ Não existe campo de regime tributário em `Business` ou `BudgetVersion` |
| Alíquota variável por faixa de receita (se Simples Nacional) | ❌ Não existe lógica de progressividade |

---

### GAP-11 — Tabela de Feriados e Calendário de Dias Úteis

**Onde no Excel:** Aba `Cálcul. trabalhado` (tabelas de feriados 2026 e 2027, cálculo de dias úteis por ano)

| Variável | Status BD |
|---|---|
| Lista de feriados nacionais/estaduais por ano | ❌ Não existe tabela de calendário/feriados |
| Dias úteis, sábados, domingos por ano (2026–2034) | ❌ Calculados no Excel, não armazenáveis no BD atual |

**Impacto:** O cálculo de receita anual do Excel leva em conta o exato número de dias úteis e sábados de cada ano, o que muda a receita projetada. Sem esse dado, o sistema usa uma aproximação constante.

---

## 4. Gaps de Relacionamento e Arquitetura 🏗️

### ARCH-01 — AssumptionValue não tem ligação com `period_date` para premissas anuais

`AssumptionValue.period_date` armazena "YYYY-MM" (mensal), mas muitas premissas do Excel têm **granularidade anual** (ex: taxa de ocupação por ano, salário por ano na aba Equipe). Não existe um campo `period_year` de granularidade anual — o sistema forçaria gravar "YYYY-01" para representar um ano, o que é ambíguo.

**Gap:** Falta um enum/campo `granularity` em `AssumptionValue` (ou `AssumptionDefinition`) para distinguir premissas mensais de anuais de únicas.

---

### ARCH-02 — Sem tabela de Financiamentos Múltiplos por BudgetVersion

Atualmente só é possível modelar **um único financiamento** via `FinancingInputs`. O Excel tem 4–5 contratos de financiamento simultâneos por unidade (máquinas, obra, arquiteto, etc.), cada um com taxa, prazo e entrada diferentes.

**Gap:** Falta a entidade `financing_contracts` com relacionamento N:1 para `budget_versions`.

---

### ARCH-03 — `Unit.opening_year` (Integer) vs. Data de Abertura Completa

O campo `opening_year: int` ignora o mês de abertura, que é **fundamental para o offset** entre unidades. A diferença entre U3 (out/2028) e U4 (mar/2029) é de 5 meses de fluxo de caixa negativo adicional no consolidado.

**Gap:** O campo deveria ser `opening_date: Date` (ou no mínimo `opening_month: String(7)` no formato "YYYY-MM").

---

### ARCH-04 — Sem Suporte a Progressão de Premissas ao Longo dos Anos

O Excel modela premissas que variam ano a ano com lógica própria:
- Aluguel: cresce 10% ao ano
- Salários: crescem com % de reajuste definido por cargo
- Ocupação: cresce por curva predefinida (3%→12%→25%→40%→50%→60%→70%→75%)

`AssumptionValue` pode armazenar um valor por período, mas não armazena a **regra de progressão** (fórmula ou taxa de crescimento). Se um usuário quiser mudar "reajuste de aluguel de 10% para 8%", precisaria recalcular e regravar todos os 96 meses (8 anos × 12 meses).

**Gap:** Falta um campo `growth_rule` (tipo JSON) em `AssumptionDefinition` para armazenar regras como `{"type": "compound_growth", "rate": 0.10, "base_year": 2027}`.

---

### ARCH-05 — `CalculatedResult` não distingue DRE Anual do Mensal

A tabela `calculated_results` tem apenas `period_date` ("YYYY-MM"). Para gerar a visão anual do Dashboard (como na aba `Base financeira` do Dashboard Base), o sistema precisa agregar 12 períodos. Não existe nenhum armazenamento de **resultado anual pré-calculado** separado do mensal.

**Gap:** A tabela `consolidated_results` poderia suprir isso se os resultados anuais fossem persistidos com `period_date = "YYYY"` (4 dígitos), mas atualmente não há convenção clara nem validação do formato.

---

### ARCH-06 — Sem Entidade para Tabela de Planos/Categorias de Personal Trainer

O negócio do Atlas tem uma **tabela de produtos** (Planos Bronze/Prata/Ouro/Diamante) com preço, meta de ocupação e benefícios incluídos. Não existe nenhuma entidade para isso no BD.

**Gap:** Falta a entidade `service_plans` (ou `pricing_tiers`) com:
- `name`, `code`, `price_per_hour`, `target_mix_pct`, `min_classes_month`, `max_classes_month`
- Relacionamento com `business`

---

### ARCH-07 — Trilha de Auditoria Não Vinculada à Premissa Específica

`AuditLog` registra `entity_type` + `entity_id` como strings genéricas. Se um usuário muda o valor de uma `AssumptionValue`, o log registra o ID da assumption, mas **não vincula automaticamente ao `BudgetVersion` afetado**. Para responder "quais versões foram impactadas por essa mudança de premissa?", não é possível fazer essa consulta nativamente.

**Gap:** Falta `budget_version_id` em `AuditLog` como FK opcional, para que seja possível rastrear impact de mudanças de premissa por versão.

---

### ARCH-08 — Sem Controle de Horizon de Projeção

O horizonte de projeção (atualmente 8 anos / 2026–2034) está implícito nos dados, mas não existe um campo `projection_horizon_years` nem `start_year`/`end_year` em `BudgetVersion` ou `Scenario`. Se o horizonte mudar de 8 para 10 anos, não há como saber qual period_range calculado é esperado.

---

## 5. Tabela Consolidada de Gaps

| ID | Tipo | Criticidade | Descrição Resumida |
|---|---|---|---|
| GAP-01 | Dados | 🔴 CRÍTICO | Modelo de receita por hora/vaga ausente |
| GAP-02 | Dados | 🔴 CRÍTICO | Tabela de categorias PT (Bronze/Prata/Ouro/Diamante) ausente |
| GAP-03 | Dados | 🔴 CRÍTICO | Fórmula de utilities mistas (fixo + variável por ocupação) não modelada |
| GAP-04 | Dados | 🔴 CRÍTICO | Produtividade por cargo e % encargos incorreto (8% vs 80%) |
| GAP-05 | Dados | 🟡 MODERADO | Benefícios diferenciados por categoria de PT ausentes |
| GAP-06 | Dados | 🔴 CRÍTICO | Apenas 1 financiamento por unidade; Excel tem 4–5 contratos |
| GAP-07 | Dados | 🔴 CRÍTICO | `opening_year` (int) sem mês — offset das unidades impossível |
| GAP-08 | Dados | 🟡 MODERADO | CAPEX sem granularidade (Automação, Branding, Arquiteto misturados) |
| GAP-09 | Dados | 🟡 MODERADO | KPIs estratégicos não persistidos (breakeven %, aulas, PTs) |
| GAP-10 | Dados | 🟢 BAIXO | Regime tributário não salvo em Business/BudgetVersion |
| GAP-11 | Dados | 🟢 BAIXO | Calendário de feriados/dias úteis não armazenado |
| ARCH-01 | Arquitetura | 🟡 MODERADO | `AssumptionValue` sem campo de granularidade (mensal vs. anual) |
| ARCH-02 | Arquitetura | 🔴 CRÍTICO | Sem tabela de financiamentos múltiplos por BudgetVersion |
| ARCH-03 | Arquitetura | 🔴 CRÍTICO | `Unit.opening_year` deve ser `Unit.opening_date` |
| ARCH-04 | Arquitetura | 🟡 MODERADO | Sem `growth_rule` — regras de progressão de premissas não armazenáveis |
| ARCH-05 | Arquitetura | 🟡 MODERADO | Sem convenção para resultados anuais pré-calculados |
| ARCH-06 | Arquitetura | 🔴 CRÍTICO | Sem entidade `service_plans` para modelar planos Bronze/Prata/Ouro/Diamante |
| ARCH-07 | Arquitetura | 🟡 MODERADO | `AuditLog` sem FK para `budget_version_id` |
| ARCH-08 | Arquitetura | 🟢 BAIXO | Sem controle explícito de horizonte de projeção |

---

## 6. Mapeamento: Variáveis do Excel → Status no BD

### Aba `Cálcul. trabalhado`

| Variável Excel | Campo BD | Status |
|---|---|---|
| Inauguraçao (data) | `Unit.opening_year` | ⚠️ Só ano |
| Aluno por Hora (vagas/hora = 10) | ❌ Ausente | ❌ |
| Tx de Ocupação (%) por ano | `AssumptionValue` (se cadastrado) | ⚠️ Depende de seed |
| Abertura/Fechamento (horário) | ❌ Ausente | ❌ |
| Hora total funcionamento/dia (17h semana, 7h sábado) | ❌ Ausente | ❌ |
| Dias trabalhados/ano | ❌ Ausente | ❌ |
| R$ Hora/prof por categoria | ❌ Ausente (GAP-02) | ❌ |
| Taxa do cartão por ano (3,5%) | `TaxInputs.tax_rate_on_revenue` (genérico) | ⚠️ |

### Aba `Ocupação e unit economics 2.0`

| Variável Excel | Campo BD | Status |
|---|---|---|
| Custos fixos mensais por ano (8 anos) | `calculated_results` via `line_item_definitions` | ✅ Se calculado corretamente |
| Vagas/hora, Horas/dia, Dias/semana, Horas/sábado | ❌ Ausentes em `Unit` | ❌ |
| Capacidade aulas/mês (3.845) | Derivável, mas sem armazenamento da premissa base | ⚠️ |
| Ocupação e receita por ano | `calculated_results` | ✅ |
| Preços Bronze/Prata/Ouro/Diamante | ❌ Sem entidade (GAP-06) | ❌ |
| Mix de vendas por categoria (25%/25%/25%/25%) | ❌ Sem entidade | ❌ |
| Preço médio ponderado/aula (R$ 57,50) | `RevenueInputs.avg_ticket_monthly` (impreciso) | ⚠️ |
| Ponto de equilíbrio por ano (R$) | `kpi.py` calcula, mas não persiste explicitamente | ⚠️ |
| % Custos variáveis sobre receita | `calculated_results` | ✅ |
| % Margem de contribuição | ❌ Não persistida explicitamente | ❌ |

### Aba `Equipe`

| Variável Excel | Campo BD | Status |
|---|---|---|
| Salário por cargo (7 cargos) | Campos individuais em `FixedCostInputs` | ✅ |
| N° funcionários por cargo | `num_employees` único | ⚠️ Granularidade insuficiente |
| % Produtividade por cargo | ❌ Ausente | ❌ |
| % Encargos (80% sobre salário) | `social_charges_rate = 0.08` — valor errado | ❌ |
| Pró-labore separado sem encargos | `pro_labore` existe mas é incluído no cálculo de encargos | ⚠️ Bug |

### Aba `Água e luz`

| Variável Excel | Campo BD | Status |
|---|---|---|
| Custo fixo energia base (R$ 4.200) | `electricity_kwh × electricity_rate` — conceito diferente | ⚠️ |
| Parcela variável máxima energia (R$ 3.000) | ❌ Ausente | ❌ |
| Fator de redução por automação (20%) | ❌ Ausente | ❌ |
| Custo fixo água base (R$ 300) | `water_m3 × water_rate` — conceito diferente | ⚠️ |
| Parcela variável máxima água (R$ 1.300) | ❌ Ausente | ❌ |

### Aba `Financiamento`

| Variável Excel | Campo BD | Status |
|---|---|---|
| VP Máquinas (R$ 287.951 / 0% / 12 meses) | `FinancingInputs` — só 1 contrato total | ❌ |
| VP Pesos Livres (R$ 42.736 / 0% / 12 meses) | ❌ | ❌ |
| VP Imóvel (R$ 1.750.000 / 1,2% a.m. / 60 meses) | ❌ | ❌ |
| VP Arquiteto (R$ 14.000 / 0% / 3 meses) | ❌ | ❌ |
| Entrada por componente (%) | `CapexInputs` — sem entrada por componente | ❌ |

### Aba `Benefícios Personal`

| Variável Excel | Campo BD | Status |
|---|---|---|
| Benefícios incluídos por categoria (S/N por item) | ❌ Ausente | ❌ |
| Custo de cada benefício (implícito nos custos fixos) | Parcialmente em `security_systems`, `hygiene_cleaning` | ⚠️ |

### Arquivo `Consolidado`

| Variável Excel | Campo BD | Status |
|---|---|---|
| DRE mensal consolidado (8 unidades × 96 meses) | `consolidated_results` (generic metric_code) | ⚠️ Estrutura OK, conteúdo depende de persistência |
| Data de abertura por unidade (mês/ano) | `Unit.opening_year` (só ano) | ⚠️ |
| Investimento total por unidade | `CapexInputs` calculável | ✅ |
| Custo de capital até 2034 por unidade (Capex Total) | ❌ Não existe tabela de amortização consolidada | ❌ |
| Resultado líquido consolidado | `consolidated_results` com metric_code | ⚠️ |
| Resultado após custo de capital | ❌ Não calculado | ❌ |

---

## 7. Diagrama de Entidades Faltantes

```
[Business]
    │
    ├── [service_plans] ← GAP/ARCH-06 (NOVO)
    │       id, name, code, price_per_hour, target_mix_pct
    │       min_classes_month, max_classes_month
    │
    └── [Unit]
            │
            ├── opening_date: Date ← ARCH-03 (ALTERAR)
            ├── hours_open_weekday: int ← GAP-01 (NOVO)
            ├── hours_open_saturday: int ← GAP-01 (NOVO)
            ├── slots_per_hour: int ← GAP-01 (NOVO)
            │
            └── [BudgetVersion]
                    │
                    ├── projection_horizon_years: int ← ARCH-08 (NOVO)
                    │
                    ├── [financing_contracts] ← ARCH-02 (NOVO)
                    │       id, name, financed_amount, monthly_rate
                    │       term_months, grace_period_months
                    │       down_payment_pct, start_date
                    │
                    └── [AssumptionDefinition]
                                │
                                └── growth_rule: JSON ← ARCH-04 (NOVO)
                                    (tipo de crescimento, taxa, ano base)
```

---

## 8. Conclusão

### Pontos Fortes da Arquitetura Atual
- A hierarquia `Organization → Business → Unit → Scenario → BudgetVersion` é sólida e escalável.
- O modelo EAV de `AssumptionDefinition/Value` é flexível o suficiente para acomodar premissas genéricas.
- O `financial_engine` tem a estrutura correta para PRICE, Payback e Burn Rate.
- A tabela `audit_logs` cobre auditoria básica de mudanças.
- `calculated_results` com `calculation_trace` (JSON) é o MVP correto para trilha de cálculo.

### Riscos Críticos se Não Corrigidos
1. **O cálculo de receita está errado para este negócio** — o Excel vende *horas de espaço*, não *vagas de aluno*. Sem `vagas_por_hora`, `horas_dia` e as categorias de PT, qualquer projeção de receita será imprecisa.
2. **Os 5 contratos de financiamento com taxas diferentes** não podem ser modelados hoje — o custo financeiro de cada unidade ficará incorreto.
3. **O offset de mês de abertura** por unidade tornará o consolidado de 8 unidades inútil sem `opening_date`.
4. **A fórmula de energia/água** produzirá valores errados por não respeitar o modelo misto (fixo + variável por ocupação).
5. **Os encargos da folha** estão 10x subvalorizados (8% vs ~80% real).

---

*Relatório gerado por auditoria automatizada do schema vs. planilhas Excel reais do negócio.*
