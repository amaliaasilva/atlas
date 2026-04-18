# Estudo: Fluxo de Lab e Versões de Orçamento

> **Data:** Abril 2026  
> **Status:** Documento de estudo — NÃO É UM PLANO DE IMPLEMENTAÇÃO.  
> **Objetivo:** Registrar o estado atual da lógica de versões, o que já está parcialmente implantado, os GAPs de UX e as opções de melhoria para configuração rápida de cenários agressivo/conservador e replicação entre unidades.

---

## 1. Contexto: O que é o "Lab"?

O **Laboratório** (`code: LAB`, abertura `2026-11-01`) é a **primeira unidade real** do negócio — a unidade piloto onde o modelo financeiro é validado antes de se abrir as demais. As outras 7 unidades (`UNIT02` → `UNIT08`) estão todas em status `planning`, com datas de abertura entre 2028 e 2031.

Na prática, o usuário configura detalhadamente o orçamento do Lab e quer **replicar** essas premissas para as unidades seguintes (ajustando apenas o que mudar). É a lógica de **template a partir do Lab**.

---

## 2. Estado Atual do Sistema

### 2.1 Hierarquia de Objetos

```
Business (Cowork Gym)
 └── Scenario  (base / conservative / aggressive / custom)
      └── BudgetVersion (1 por unidade dentro do cenário)
           └── AssumptionValues (premissas mensais/anuais)
```

O motor financeiro (`FinancialEngine`) recalcula uma versão por vez, produzindo `CalculatedResult` por período.

---

### 2.2 O que já está implementado

| Feature | Onde | Status |
|---|---|---|
| Clone de versão (copia todos os `AssumptionValues`) | `POST /budget-versions/{id}/clone` | ✅ Funciona |
| `occupancy_multiplier` no Scenario | `Scenario.occupancy_multiplier` (Float, padrão 1.0) | ✅ Salvo no banco |
| Aplicação do multiplicador no cálculo | `calculations.py → _build_inputs_for_version()` | ✅ Backend aplica |
| Widget de multiplicador no frontend | `BudgetVersionClient.tsx` (visível apenas para cenários não-base) | ✅ Exibido e editável |
| `growth_rule` nas premissas (curva/compound_growth) | `AssumptionDefinition.growth_rule` + `expander.py` | ✅ Geração automática mês a mês |
| Curva de ocupação padrão (10 anos) | Seed `taxa_ocupacao`: `[0.03, 0.12, 0.25, 0.40, 0.50, 0.60, 0.70, 0.75, 0.75, 0.75]` | ✅ Aplicada a todos os novos orçamentos |
| Correção do bug `_get()` com zeros | `calculations.py` | ✅ Corrigido (abr/2026) |
| Reajuste anual automático (aluguel, salários) | `growth_rule: {type: compound_growth, rate: 0.10}` | ✅ 10 cenários padrão |

---

### 2.3 Fluxo atual para criar orçamentos agressivo/conservador

**Passo a passo atual:**
1. Criar um cenário com `scenario_type = 'aggressive'` (ou conservative)
2. Criar uma versão de orçamento para a unidade desejada dentro desse cenário
3. Abrir o orçamento → `BudgetVersionClient.tsx` exibe automaticamente o widget de **Multiplicador de Ocupação**
4. Ajustar o percentual (ex: 115% = agressivo, 80% = conservador)
5. Salvar o multiplicador
6. Clicar em Recalcular

**O que o multiplicador FAZ:**
- No momento do `POST /calculations/recalculate/{version_id}`, o backend varre todos os `AssumptionValues` com `code = 'taxa_ocupacao'` da versão do **cenário base** da mesma unidade
- Multiplica cada valor por `scenario.occupancy_multiplier`
- Os valores modificados são usados **apenas durante o cálculo** (não são persistidos como overrides)
- Premissas com `source_type = 'manual'` não são sobrescritas (overrides manuais têm prioridade)

**O que o multiplicador NÃO FAZ:**
- Não altera custos (aluguel, salários, etc.)
- Não altera a velocidade de ramp-up operacional
- Não altera CAPEX
- Não altera premissas de preço

---

### 2.4 Fluxo atual para replicar entre unidades

**Passo a passo atual:**
1. Abrir o orçamento do Lab (versão configurada)
2. Na mesma tela (`/budget/[versionId]`), não há botão direto de "replicar para outra unidade"
3. O usuário precisa ir em `/budget`, criar uma nova versão para a UNIT02 no mesmo cenário, e depois clonar manualmente (endpoint `/clone` existe mas só é chamado da listagem)
4. Resultado: Nova versão com todos os `AssumptionValues` copiados, mas `unit_id` permanece igual ao da origem (BUG — veja §3.2)
5. O usuário precisaria editar o `unit_id` afterwards — que atualmente **não existe na UI**

---

## 3. GAPs Identificados

### 3.1 O multiplicador é insuficiente para cenários reais

O `occupancy_multiplier` resolve apenas a **taxa de ocupação**. Um cenário verdadeiramente conservador ou agressivo normalmente envolve:

| Variável | Cenário base | Conservador | Agressivo |
|---|---|---|---|
| `taxa_ocupacao` (curva) | padrão | ×0.80 | ×1.15 |
| `aluguel_mensal` | R$ 19.000 | R$ 21.000 (pior local) | R$ 17.000 (negociado) |
| `outras_receitas` | R$ 0 | R$ 0 | R$ 5.000 (área extra) |
| `custo_energia_fixo` | R$ 4.200 | R$ 5.000 | R$ 3.800 |
| Velocidade da curva de ocupação | padrão | mais lenta | mais rápida |

Hoje **nenhuma dessas demais variáveis** é automaticamente ajustada ao trocar de cenário. A solução atual exige que o usuário edite manualmente cada premissa na tela de orçamento.

### 3.2 Clone não muda `unit_id`

O endpoint `POST /budget-versions/{id}/clone` copia todos os dados incluindo `unit_id`. Se o objetivo é criar um orçamento para a UNIT02 a partir do Lab, o resultado do clone ainda aponta para `unit_id = LAB`. Não há parâmetro para mudar a unidade no clone.

```python
# budget_versions.py — endpoint clone (atual)
new_version = BudgetVersion(
    unit_id=source.unit_id,   # ← sempre copia o mesmo unit_id
    scenario_id=source.scenario_id,
    ...
)
```

### 3.3 Não há criação em lote de versões para todas as unidades

Para criar cenário base com 8 unidades:
- Criar versão 1 (Lab) → configurar manualmente todas as premissas
- Criar versão 2 (UNIT02) → idem
- ...até versão 8 (UNIT08)

Não existe fluxo de "criar para todas as unidades baseando-se nesta versão como template".

### 3.4 Sem preset de curva de ocupação por tipo de cenário

A `growth_rule` da `taxa_ocupacao` é definida **na `AssumptionDefinition`** (ligada ao `Business`), não na versão. Isso significa que **todas as versões de todas as unidades em todos os cenários compartilham a mesma curva de ocupação padrão** como ponto de partida.

Para mudar a curva de um cenário conservador, o usuário precisa editar mês a mês manualmente na tabela de premissas, ou usar uma `growth_rule` com `type: curve` e values diferente.

**O editor de curva de ocupação existe no frontend** (modo edição inline da `growth_rule`), mas é pouco visível e não está integrado ao conceito de cenário.

### 3.5 Replicação de anos futuros

O usuário menciona "replicar para outros anos". O sistema já resolve isso automaticamente via `growth_rule`:
- `compound_growth` → cresce X% ao ano automaticamente
- `curve` → vetor de 10 valores, um por ano

Porém, **o usuário provavelmente não sabe que isso já acontece**. O gap aqui é de UX/onboarding, não de funcionalidade.

---

## 4. Opções de Melhoria (sem prioridade definida)

### Opção A — Expandir o Multiplicador de Cenário (Escopo Médio)

**Ideia:** Em vez de apenas multiplicar `taxa_ocupacao`, permitir configurar um **bundle de ajustes percentuais** por tipo de cenário no nível do `Scenario`.

- Modelo: adicionar campo `assumption_overrides: JSON` ao `Scenario`, com estrutura:

```json
{
  "taxa_ocupacao_multiplier": 0.80,
  "costs_multiplier": 1.10,
  "revenue_other_pct_delta": -0.20
}
```

- No `_build_inputs_for_version`, além da ocupação, aplicar os outros multiplicadores
- **Vantagem:** Simples de configurar, muito intuitivo (um slider por variável-chave)
- **Desvantagem:** Ainda é uma aproximação; não captura nuances por unidade

### Opção B — Clone Cross-Unidade e Cross-Cenário (Escopo Pequeno)

**Ideia:** Estender o endpoint de clone para aceitar parâmetros opcionais `new_unit_id` e `new_scenario_id`.

```http
POST /budget-versions/{id}/clone
Body: {
  "new_name": "Orçamento Base — UNIT02",
  "new_unit_id": "uuid-unit02",
  "new_scenario_id": null  // manter mesmo cenário se null
}
```

- No backend, atualizar `unit_id` e `scenario_id` do novo objeto se fornecidos
- Ajustar automaticamente as datas `effective_start_date` / `effective_end_date` com base na `opening_date` da nova unidade
- **Vantagem:** Resolve o caso de uso "replicar Lab para UNIT02" imediatamente
- **Desvantagem:** O usuário ainda precisa clicar unidade por unidade

### Opção C — "Criar Versões para Todas as Unidades" (Escopo Médio)

**Ideia:** Endpoint batch que, dado um `source_version_id` e um `scenario_id`, cria uma versão para cada unidade ativa do business.

```http
POST /budget-versions/batch-from-template
Body: {
  "source_version_id": "uuid-lab-base",
  "scenario_id": "uuid-scenario-base",
  "name_template": "Orçamento Base — {unit_name}"
}
```

- Itera pelas unidades ativas
- Para cada unidade, clona a versão source, ajustando `unit_id` e datas
- Retorna lista de versões criadas
- **Vantagem:** Resolve completamente o problema de replicação
- **Desvantagem:** Precisa de cuidado com unidades que já têm versão no cenário (evitar duplicatas)

### Opção D — Presets de Curva de Ocupação por Tipo de Cenário (Escopo Pequeno)

**Ideia:** Na tela de cenários ou no próprio modal de criação, oferecer presets de curva de ocupação:

| Preset | Curva (10 anos) |
|---|---|
| Moderado (padrão) | `[0.03, 0.12, 0.25, 0.40, 0.50, 0.60, 0.70, 0.75, 0.75, 0.75]` |
| Conservador | `[0.02, 0.08, 0.18, 0.30, 0.40, 0.50, 0.60, 0.65, 0.65, 0.65]` |
| Agressivo | `[0.05, 0.18, 0.35, 0.55, 0.65, 0.75, 0.80, 0.85, 0.85, 0.85]` |

- Na criação de versão, selecionar o preset que sobrescreve os valores mensais de `taxa_ocupacao` diretamente na nova versão (como `AssumptionValues` com `period_date` explícito)
- **Vantagem:** Extremamente rápido de configurar, visualmente claro
- **Desvantagem:** O usuário ainda precisa ver o impacto nos resultados antes de decidir

### Opção E — Visão de "Versões em Paralelo" por Unidade (Escopo Grande)

**Ideia:** Uma tela side-by-side para a mesma unidade em 3 cenários (base/conservador/agressivo), onde qualquer mudança numa premissa "chave" (selecionada pelo usuário) se propaga automaticamente para todos os cenários com o offset configurado.

- Requer redesign significativo de UX
- Escopo de Sprint 4+

---

## 5. Recomendação de Caminho

Combinando impacto vs. esforço, o caminho mais racional em ordem de prioridade seria:

```
1. Opção B (clone cross-unidade/cenário)     → 2-3 dias de dev
   ↳ Resolve o caso "replicar Lab para UNIT02..08"
   
2. Opção D (presets de curva de ocupação)    → 1 dia de dev
   ↳ Resolve configuração rápida de conservador/agressivo na taxa de ocupação
   
3. Opção A (expandir multiplicador de cenário) → 3-4 dias de dev
   ↳ Adiciona ajuste de custos além da ocupação, sem mudar a estrutura de dados

4. Opção C (batch-from-template)             → 2-3 dias de dev
   ↳ Automatiza criação massiva após B estar funcionando
```

---

## 6. O que o Sistema JÁ Resolve (que o usuário pode não perceber)

| Necessidade | Mecanismo atual | Como usar |
|---|---|---|
| "Não quero digitar aluguel mês a mês por 10 anos" | `growth_rule: {type: compound_growth, rate: 0.10}` no `aluguel_mensal` | Já está configurado por padrão no seed — funciona automaticamente |
| "Quero que os salários cresçam anualmente" | `growth_rule: compound_growth` em todos os `salario_*` | Já está configurado por padrão |
| "Quero que a ocupação siga uma curva realista" | `growth_rule: {type: curve, values: [...]}` na `taxa_ocupacao` | Curva padrão `[3%, 12%, 25%, 40%, ...]` já aplicada |
| "Quero testar um cenário 15% mais otimista em ocupação" | `occupancy_multiplier` no cenário | Widget já existe em `/budget/[versionId]` para cenários não-base |
| "Quero criar uma cópia do orçamento para testar" | `POST /budget-versions/{id}/clone` | Disponível — mas sem botão na UI principal |

---

## 7. Questões em Aberto para Decisão

1. **O multiplicador deve ser visível na tela de Cenários** (em `/scenarios`) além de dentro do orçamento? Hoje só aparece dentro de `BudgetVersionClient`.

2. **Os presets de curva de ocupação** devem ser definidos no nível do `Scenario` ou podem ser configurados por versão individualmente?

3. **Para replicação entre unidades:** as datas de início/fim devem ser ajustadas automaticamente para a `opening_date` de cada unidade, ou o usuário decide manualmente?

4. **Quando clona cross-cenário** (ex: base → agressivo), os valores de `taxa_ocupacao` manuais existentes devem ser mantidos (e o `occupancy_multiplier` é ignorado) ou devem ser zerados para que o multiplicador funcione?

5. **O `occupancy_multiplier` se aplica ao Lab** (cenário agressivo)? Hoje existe uma guarda explícita: se não houver versão do cenário base para a mesma unidade, o multiplicador não funciona. Para o Lab, isso funcionará desde que exista uma versão base LAB publicada.

---

*Documento gerado para estudo — não altera nenhum arquivo de código.*
