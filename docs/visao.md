# Atlas Finance — Visão de Produto e Plano de Refatoração Frontend

> **Versão:** 2.0 — 31/03/2026  
> **Branch:** `main`  
> **Escopo:** Auditoria completa de todos os arquivos frontend + backend relevantes, planilhas e document by document. Este documento substitui o rascunho de 30/03/2026.  
> **Decisões do produto incorporadas:** ver §0. Resposta do produto.

---

## 0. Decisões do Produto (Q&A — 31/03/2026)

| # | Pergunta | Resposta |
|---|---|---|
| Q1 | DRE: padrão mensal ou anual? | **Anual por padrão.** Permite drill-down para mensal. Período customizável (data-início a data-fim, proporcional a dias úteis). |
| Q2 | Sensibilidade: client-side ou API? | **Sempre API (`/calculations/recalculate`).** Zero lógica no frontend. |
| Q3 | Datas de abertura das unidades no roadmap? | **Editáveis diretamente no frontend** (inline no roadmap ou formulário da unidade). |
| Q4 | Identidade visual? | **Manter clean/minimalista** mas o sidebar está feio e sem lógica. Reformular estrutura e estética. |
| Q5 | Consolidado: como funciona? | **Deve espelhar os orçamentos** (soma das budget_versions ativas por unidade/cenário). |

---

## Índice

1. [Estado Real — Inventário Completo](#1-estado-real--inventário-completo)
2. [Auditoria por Arquivo](#2-auditoria-por-arquivo)
3. [GAPs de UX e Arquitetura de Informação](#3-gaps-de-ux-e-arquitetura-de-informação)
4. [Design System v2 — Fundação](#4-design-system-v2--fundação)
5. [Nova Arquitetura de Navegação](#5-nova-arquitetura-de-navegação)
6. [Plano de Refatoração por Página](#6-plano-de-refatoração-por-página)
7. [Novos Componentes a Criar](#7-novos-componentes-a-criar)
8. [Dependências de Backend](#8-dependências-de-backend)
9. [Sprints de Implementação](#9-sprints-de-implementação)

---

## 1. Estado Real — Inventário Completo

### 1.1 Páginas Existentes — Dashboard Executivo

Todas em `frontend/src/app/(auth)/dashboard/(executive)/`

| Arquivo | Linhas | Estado | Problemas detectados (auditoria 31/03) |
|---|---|---|---|
| `visao-geral/page.tsx` | ~341 | ⚠️ Funcional mas incompleto | Sem roadmap de expansão; sem visão acumulada por ano; DRE sumária não atualizada com novos dados do engine |
| `crescimento/page.tsx` | ~120 | ⚠️ Estrutura ok | Usa `aggregateByYear` correto; falta StackedBar por unidade; YoY mostra mas sem destaque visual |
| `ocupacao/page.tsx` | ~252 | ✅ Correto | `break_even_occupancy_pct` vindo do engine; `OccupancyGauge` e `BreakevenBullet` ativos |
| `capacidade/page.tsx` | ~120+ | ✅ Correto | P0.10 resolvido — usa `capacity_hours_month × avg_price_per_hour` do engine |
| `professores/page.tsx` | ~80 | ✅ Estrutura ok | `TeachersBreakevenTable` consumido; KPIs de `break_even_occupancy_pct` e `break_even_revenue` corretos |
| `projecoes/page.tsx` | ~424 | ⚠️ Funcional | Multi-cenário funciona; sem payback waterfall; sem toggle anual/mensal |
| `estrategico/page.tsx` | ~100+ | ⚠️ Incompleto | Tem `PortfolioTable`; falta `ScenarioColumns` (Pessimista|Moderado|Otimista) lado a lado; sem grid de 8 unidades |
| `unidades/page.tsx` | ~80 | ⚠️ Funcional | `UnitsBarChart` funciona; sem sparklines individuais; sem status de abertura |
| `dre/page.tsx` | ~80 | ⚠️ Incompleto | `DRETable` existe e funciona; sans toggle anual/mensal; sem barra de anos; sem seletor de granularidade |
| `capex/page.tsx` | ~100 | ⚠️ Incompleto | Waterfall funciona; **sem tabela de itens CAPEX individuais** (Equipamentos / Obras / Arquiteto / Automação / Branding / Capital de giro); sem curva de payback por unidade |
| `beneficios-personal/page.tsx` | ~80 | ✅ Exists | Split de receita funcional; `RevenueSplitPeriod` consumido |
| `planos/page.tsx` | ~100 | ✅ Funcional | Tabela de planos ok; modal geo-pricing com AI |
| `auditoria-calculo/page.tsx` | ~60 | ✅ Funcional | `AuditTracePanel` correto; exige seleção de unidade única |

### 1.2 Páginas de Gestão

| Arquivo | Estado | Problemas |
|---|---|---|
| `businesses/page.tsx` | ✅ | `CreateBusinessModal` funcional; tipo `cowork_gym` (mas seed usa `COWORKING_B2B` — **divergência não documentada**) |
| `scenarios/page.tsx` | ✅ | `CreateScenarioModal` funcional |
| `units/page.tsx` | ✅ | CRUD completo; campos `opening_date`, `slots_per_hour`, `hours_open_weekday`, `hours_open_saturday` presentes |
| `budget/[versionId]/` | ✅ | `BudgetVersionClient.tsx` (577 linhas) — premissas + contratos + recalcular |
| `compare/units/page.tsx` | ✅ | Multi-métrica, multi-unidade; usa recharts `LineChart` |
| `compare/scenarios/` | ✅ | Existe |
| `import/page.tsx` | ✅ | Upload Excel → `ImportJob` |
| `audit/page.tsx` | ✅ | Log de auditoria com filtros e paginação |
| `settings/page.tsx` | ✅ | Perfil + edição de planos de serviço; **único lugar onde preço/mix dos planos é editável** |
| `results/` | ❓ | Pasta existe mas não auditada — verificar conteúdo |

### 1.3 Componentes

| Componente | Estado | Observação crítica |
|---|---|---|
| `charts/OccupancyGauge.tsx` | ✅ | Semicírculo via PieChart; correto |
| `charts/WaterfallChart.tsx` | ✅ | Waterfall DRE simplificado; correto |
| `charts/BreakevenBullet.tsx` | ✅ | Bullet chart |
| `charts/CapexStackedBar.tsx` | ✅ | Existe |
| `charts/AnnualSummaryChart.tsx` | ✅ | Existe |
| `charts/AreaGrowthChart.tsx` | ✅ | `AreaGrowthChart` + `AnnualAreaChart` |
| `charts/LineCharts.tsx` | ✅ | `OccupancyLineChart`, `CostsLineChart`, `ScenarioLineChart` |
| `charts/UnitsBarChart.tsx` | ✅ | `BulletChartItem`, `ScenarioBarChart`, `UnitsBarChart` |
| `charts/RevenueChart.tsx` | ✅ | Existe |
| `dashboard/MetricCard.tsx` | ✅ | `MetricCard` + `ProgressCard` + `StatRow`; 6 accent colors |
| `dashboard/DashboardNav.tsx` | 🔴 | **14 tabs flat sem hierarquia** — maior problema de UX do sistema |
| `dashboard/GlobalFilters.tsx` | 🔴 | **Dropdowns de texto YYYY-MM** — péssimo UX; sem presets visuais de ano |
| `dashboard/EmptyState.tsx` | ✅ | `NoFiltersState`, `MetricCardSkeleton`, `ChartSkeleton` |
| `dashboard/AuditTracePanel.tsx` | ✅ | Existe |
| `layout/Sidebar.tsx` | 🔴 | **Sem estrutura de seções; itens misturados sem hierarquia; select de negócio é um `<select>` HTML bruto** |
| `layout/Topbar.tsx` | ⚠️ | Breadcrumb de contexto existe mas é somente leitura e invisível em mobile |
| `tables/DRETable.tsx` | ✅ | Scroll horizontal, freeze da 1ª coluna, agrupamento por categoria |
| `tables/PortfolioTable.tsx` | ✅ | CAPEX/Resultado/Payback/ROI por unidade |
| `tables/TeachersBreakevenTable.tsx` | ✅ | Tabela de professores necessários por cenário/ano |
| `ui/Badge.tsx`, `Button.tsx`, `Card.tsx`, `Input.tsx`, `Spinner.tsx` | ✅ | Presentes |

### 1.4 Store / Estado Global

**`store/auth.ts` — `useNavStore`:**
- `organizationId`, `businessId`, `unitId`, `scenarioId`, `versionId`
- **Problema:** `unitId` aqui é singular e usado no `Topbar` — conflita com `selectedUnitIds[]` do dashboard store

**`store/dashboard.ts` — `useDashboardFilters`:**
- `businessId, scenarioId, selectedUnitIds[], unitId (deprecated), year, periodStart, periodEnd, compareScenarioIds`
- Persistido via `zustand/persist` → `localStorage`
- **Problema:** Dois stores independentes com `businessId` e `scenarioId` — duplicação de estado, risco de dessincronização

### 1.5 Endpoints Backend — Cobertura Frontend

| Endpoint | Consumido em | Observação |
|---|---|---|
| `GET /dashboard/unit/{version_id}` | `visao-geral`, `ocupacao`, etc. | ✅ |
| `GET /dashboard/business/{id}/consolidated` | maioria das páginas | ✅ — retorna `annual_summaries` mas **frontend ignora** |
| `GET /dashboard/business/{id}/units-comparison` | `unidades/`, `compare/units/` | ✅ |
| `GET /dashboard/unit/{version_id}/dre` | `dre/` | ✅ |
| `GET /dashboard/unit/{version_id}/audit` | `auditoria-calculo/` | ✅ |
| `GET /dashboard/business/{id}/annual` | **NÃO consumido** | ⚠️ endpoint existe mas nenhuma página chama |
| `GET /dashboard/business/{id}/portfolio` | `capex/`, `estrategico/` | ✅ |
| `POST /calculations/recalculate/{version_id}` | `budget/[versionId]/` | ✅ |
| `POST /budget-versions/{id}/clone` | `budget/[versionId]/` | ✅ |
| `GET /ai/sanity-check/{version_id}` | `visao-geral/` | ✅ |
| `POST /ai/copilot` | `budget/[versionId]/` | ✅ (stub) |
| `GET /ai/geo-pricing/{unit_id}` | `planos/` | ✅ (stub) |
| `GET /reports/csv/{version_id}` | `dre/` | ✅ (nota: path real é `/reports/csv/`, não `/reports/export/csv/`) |
| `GET /audit` | `audit/` | ✅ |

---

## 2. Auditoria por Arquivo

### 2.1 `layout/Sidebar.tsx` 🔴 CRÍTICO

**Problemas encontrados:**

1. **Seletor de negócio é um `<select>` HTML sem estilo** — brutal para um sistema financeiro premium. Parece formulário de cadastro dos anos 90.
2. **Itens de navegação são uma lista plana de 9 links** sem agrupamento lógico:
   - "Dashboard", "Unidades", "Negócios", "Cenários", "Orçamento", "Comparações", "Importar Excel", "Auditoria", "Configurações"
   - Não há distinção entre ações operacionais, análise e configuração
3. **"Comparações" tem um sub-menu de 2 itens** mas é implementado via `children[]` com lógica complexa de `ChevronDown` que não funciona visualmente
4. **A sidebar não muda conforme o contexto** — se você está no Dashboard de uma unidade, a sidebar é idêntica à da lista de negócios
5. **Sem indicador de item ativo** robusto — apenas `border-l-2` que some no estado hover
6. **Gradiente navy/teal no fundo** está ok mas sem padding consistente, ícones e labels desalinhados
7. **Logout está no final** mas sem separação visual clara do resto da navegação
8. **Organizações:** sem seletor de organização visível — usuário com múltiplas organizações não tem como trocar

### 2.2 `dashboard/DashboardNav.tsx` 🔴 CRÍTICO

**Problemas encontrados:**

1. **14 tabs em scroll horizontal** — cognitivamente insuportável. O usuário não sabe onde cada coisa está.
2. **Sem hierarquia ou grupos** — "Auditoria" (trilha de cálculo técnico) está ao lado de "Crescimento" (estratégico). Contextos completamente diferentes.
3. **Labels muito longos** para tabs horizontais — "Benefícios", "Auditoria", "Consolidado" etc. geram overflow em telas menores
4. **"Consolidado" é gerado dinamicamente** com `businessId` na URL mas sem lógica robusta de fallback quando `businessId` é null
5. **Não reflete a estrutura mental das planilhas** — a planilha tem: Orçamento (DRE mensal) | Custo Investimento | Ocupação | Equipe | CAPEX | Financiamento — o frontend não espelha isso

### 2.3 `dashboard/GlobalFilters.tsx` 🔴 CRÍTICO

**Problemas encontrados:**

1. **Seletor de período** usa dois `<input type="text">` onde o usuário digita "YYYY-MM" manualmente — impossível de usar intuitivamente
2. **MultiSelectUnit** implementado do zero com estado local `open/close` — funcional mas ocupa muito espaço
3. **Sem presets visuais de período** — para um sistema com horizonte 2026–2034, os botões `2026 | 2027 | ... | 2034` seriam 10× mais rápidos
4. **Ordem dos filtros não é lógica** — aparece Cenário, Unidade, depois período. Deveria ser: Período | Cenário | Unidade (do mais geral ao mais específico)
5. **`showUnit` prop** controla se o seletor de unidade aparece mas isso cria inconsistência visual entre páginas
6. **Sem indicador claro** de "vocês estão vendo os dados do período X" — o usuário não sabe qual filtro está ativo sem olhar cada dropdown

### 2.4 `layout/Topbar.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **Breadcrumb é somente leitura** — mostra "Negócio > Cenário > Unidade" mas você não pode clicar para mudar
2. **Escondido em mobile** (`hidden md:flex`) — em telas menores o usuário perde o contexto completamente
3. **Título da página** em texto pequeno à esquerda é irrelevante quando há breadcrumb à direita
4. **Sem hierarquia visual** — breadcrumb e título têm o mesmo peso visual
5. **Bell de notificação** está presente mas sem funcionalidade real

### 2.5 `visao-geral/page.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **Sem roadmap de expansão** — sendo que a alma do negócio é "abrir 8 unidades em 8 anos", não há nenhuma representação visual disso na página principal
2. **DRE sumária** está correta mas exibe apenas o período filtrado — não mostra a progressão ano a ano
3. **Tabs FINANCEIRA/B2B/DRE** bem implementadas, mas a aba DRE na Visão Geral está duplicando funcionalidade do `/dashboard/dre` sem diferenciação clara
4. **`revenueTrend`** calculado corretamente (primeira vs segunda metade do período), mas exibido como simples badge sem contexto
5. **Botão "Auditar com IA"** exige `activeVersion` (unidade única selecionada) — fica invisível quando o usuário está na visão consolidada

### 2.6 `dre/page.tsx` + `DRETable.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **Sem toggle anual/mensal** — apenas visão mensal (todos os meses de uma vez)
2. **Sem barra de anos** para navegar entre 2026–2034
3. **Sem visão anual** que é o que a planilha "Consolidado 2027–2034" mostra como padrão
4. **Exige seleção de uma única unidade** — sem aviso proativo ao usuário o DRE fica em branco
5. **`DRETable`** tem scroll horizontal e freeze de 1ª coluna (✅ bom) mas **não tem sub-itens granulares** porque o backend não persiste (GAP-08)
6. **Botão exportar CSV** funcional (✅) mas fora do contexto visual da tabela

### 2.7 `capex/page.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **Sem tabela de itens CAPEX individuais** — a planilha "Custo investimento Lab" define claramente: Equipamentos R$472k | Obras R$250k | Arquiteto R$28k | Automação R$47k | Branding R$28k | Capital de giro R$342k. Nenhum desses números aparece
2. **`WaterfallChart` usa dados do `/consolidated`** (receita vs custos) não do `/portfolio` — semanticamente incorreto para uma página de CAPEX
3. **KPIs CAPEX total, ROI, Payback** corretos, mas sem breakdown por item
4. **Sem curva de payback** acumulada mês a mês (quando o investimento é recuperado)

### 2.8 `crescimento/page.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **`AnnualSummaryChart`** sendo usado mas o endpoint `/annual` **não é chamado** — usa `aggregateByYear` local
2. **Sem stacked bar por unidade** — mostra crescimento total da rede mas não qual unidade contribui quanto
3. **CAGR** calculado e exibido (✅) mas sem contexto de "bom/ruim" ou benchmark
4. **Unidades por status** (active/planning/pre_opening/closed) correto mas exibido de forma genérica

### 2.9 `estrategico/page.tsx` ⚠️ INCOMPLETO

**Problemas encontrados:**

1. **`PortfolioTable`** presente (✅) mas sem hierarquia visual — aparece junto com gráficos sem seção clara
2. **Multi-cenário** faz `Promise.all` de todos os cenários (✅) mas à medida que o negócio cresce para 8 unidades × 3 cenários isso gera N² chamadas
3. **Sem coluna side-by-side** Pessimista | Moderado | Otimista — dados existem mas não são apresentados em comparação visual clara
4. **`PortfolioTable`** tem CAPEX/Resultado/Payback/ROI por unidade mas sem filtro de ano ou período

### 2.10 `store/auth.ts` — `useNavStore` + `store/dashboard.ts` — `useDashboardFilters` ⚠️ DUPLICAÇÃO

**Problema crítico:**

Há **dois stores independentes** com `businessId` e `scenarioId`:

```typescript
// store/auth.ts
useNavStore: { organizationId, businessId, unitId, scenarioId, versionId }

// store/dashboard.ts
useDashboardFilters: { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd }
```

Quando o usuário muda de negócio no `Sidebar` (que usa `useNavStore`), o `useDashboardFilters` **não é atualizado automaticamente**. Isso causa estados dessincronizados onde o sidebar mostra "Negócio A" mas o dashboard está mostrando dados do "Negócio B".

**Evidência:** `GlobalFilters.tsx` lê do `useNavStore` para inicializar mas persiste no `useDashboardFilters`. A lógica de sincronização está espalhada em múltiplos `useEffect`.

### 2.11 `lib/api.ts` ⚠️ ENDPOINT AUSENTE

**`/dashboard/business/{id}/annual` não é chamado em lugar nenhum.** O endpoint existe no backend e `annualBackendToRows` existe em `lib/utils/dashboard.ts`, mas nenhuma página faz a chamada. As páginas de crescimento, projeções e estratégico usam `aggregateByYear` local como fallback.

### 2.12 `settings/page.tsx` — Edição de Planos DESLOCADA CONTEXTUALMENTE

A edição de `price_per_hour` e `target_mix_pct` dos planos deveria estar em `/dashboard/planos` (onde os planos são exibidos com toda a lógica de precificação) mas está em `/settings`. Isso cria confusão: o usuário olha os planos em um lugar e edita em outro.

---

## 3. GAPs de UX e Arquitetura de Informação

### GAP-UX-01 🔴 — Hierarquia Mental Não Representada

A planilha tem uma estrutura mental clara:
```
Negócio → Horizonte 2026–2034 → Unidade 1..8 → Análise (orçamento, capex, ocupação...)
```
O frontend não representa isso. O usuário seleciona "negócio" num `<select>` na sidebar, "cenário" num dropdown escondido, "unidade" num multiselect — tudo desconectado visualmente.

### GAP-UX-02 🔴 — Consolidado Sem Rastreabilidade

O `/dashboard/business/{id}/consolidated` agrega dados de todas as unidades mas o usuário não sabe:
- Quais unidades estão incluídas no cálculo
- Qual versão de cada unidade está sendo usada (published? draft?)
- Se alguma unidade não tem versão calculada (silenciosamente excluída)

### GAP-UX-03 🔴 — Período de Análise Sem UX

O horizonte de análise é 2026–2034. A seleção atual de período via texto "YYYY-MM" é inutilizável para um gestor não-técnico. Não existe preset "Ver 2027 inteiro" ou "Ver Ano 1 da unidade X".

### GAP-UX-04 🔴 — DRE Não Espelha a Planilha Orçamento

A aba "Orçamento" das planilhas é uma tabela com ~30 linhas × 120 colunas (meses). Cada linha tem um item específico (energia elétrica, pró-labore, encargos, etc.). O frontend mostra apenas 8 linhas agregadas porque o backend não persiste sub-itens (GAP-08 do sprints.md).

### GAP-UX-05 🟡 — Análise de Sensibilidade Ausente

A planilha tem aba `Cálcul. trabalhado` para simular "e se ocupação mudar X%?". No frontend não existe equivalente. Sendo o sistema uma plataforma What-If, esta é a feature mais importante ausente.

### GAP-UX-06 🟡 — Timeline de Abertura de Unidades Ausente

"Abrir 8 unidades em 8 anos" é o plano de negócio. Não existe nenhuma visualização que mostre isso. O usuário não consegue ver "unidade 1 abriu em ago/2026, unidade 2 planejada para jan/2027, etc." em uma tela só.

### GAP-UX-07 🟡 — Visão Anual é o Default Correto, Mas Não Existe

A planilha "Consolidado 2027–2034" exibe dados por ano. O frontend mostra dados mensais por padrão (ou período selecionado), sem toggle granularidade. O usuário precisa de:
- **Anual** — visão padrão, para análise estratégica
- **Mensal** — drill-down dentro de um ano
- **Período customizado** (data-início a data-fim com ponderação por dias úteis)

### GAP-UX-08 🟡 — Estado Global Duplicado (dois stores)

`useNavStore` e `useDashboardFilters` mantêm `businessId` e `scenarioId` em duplicata. Risco constante de dessincronização silenciosa.

---

## 4. Design System v2 — Fundação

### 4.1 Palette e Tokens

Manter a identidade navy/teal existente, mas torná-la sistemática:

```javascript
// tailwind.config.js — acréscimos ao existente
colors: {
  // Já existe — manter
  atlas: {
    navy: '#1E2A44',
    teal: '#22C7E6',
    sky: '#60A5FA',
    blue: '#3B82F6',
  },
  // Adicionar: semantic status (usado em badges, bordas, backgrounds)
  status: {
    ok:      { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
    warn:    { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
    alert:   { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
    neutral: { DEFAULT: '#6B7280', light: '#F3F4F6', dark: '#374151' },
  },
  // Surface hierarchy (substitui 'gray-50', 'gray-100' ad hoc espalhados)
  surface: {
    base:    '#FFFFFF',  // cards, modais
    subtle:  '#F9FAFB',  // fundo de página
    inset:   '#F3F4F6',  // inputs, tabelas header
    border:  '#E5E7EB',
    muted:   '#D1D5DB',
  },
}
```

### 4.2 Typography Scale

```javascript
fontFamily: {
  sans: ['Manrope', 'ui-sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace'],  // NOVO — para valores financeiros tabular
},
fontSize: {
  'display': ['3rem', { lineHeight: '1.1', fontWeight: '800' }],    // KPIs hero
  'heading': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],  // h1 de página
  'subhead': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }], // seção
  'body':    ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
  'label':   ['0.6875rem', { lineHeight: '1', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
  'mono-lg': ['1rem', { fontFamily: 'JetBrains Mono', fontWeight: '600' }],
  'mono-sm': ['0.75rem', { fontFamily: 'JetBrains Mono', fontWeight: '400' }],
}
```

### 4.3 Espaçamento e Grid

- Padding de página: `p-6` (manter)
- Gap entre cards: `gap-4` (manter)
- Max-width de conteúdo: `max-w-screen-2xl mx-auto` (manter)
- Raio de cards: `rounded-2xl` (manter, não misturar com `rounded-xl`)
- Bordas de cards: `border border-surface-border shadow-sm` (unificar — hoje mistura `border-gray-100`, `border-gray-200`, `border-slate-200`)

### 4.4 Tokens de Componente (CSS variables globais)

Adicionar em `globals.css`:

```css
:root {
  --card-radius: 1rem;       /* rounded-2xl */
  --card-padding: 1.5rem;    /* p-6 */
  --card-border: 1px solid #E5E7EB;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --nav-height: 48px;
  --sidebar-width: 240px;
  --filter-bar-height: 52px;
}
```

---

## 5. Nova Arquitetura de Navegação

### 5.1 Sidebar — Reestruturação Completa

**Estrutura proposta** (substituindo lista plana atual):

```
┌─ ATLAS FINANCE ──────────────────────────────────────────────────┐
│  [Atlas Finance] v2.0                                Logo         │
│  ─────────────────────────────────────────────────────────────   │
│  ◉ Lab B2B Coworking                                      [▾]    │  ← seletor de negócio como pill/badge clicável, não <select>
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  ANÁLISE                                                  label   │
│    ⬡ Visão Geral                                                 │
│    ⬡ Consolidado                                                 │
│    ⬡ Crescimento da Rede                                         │
│    ⬡ Estratégico                                                 │
│  ─────────────────────────────────────────────────────────────   │
│  UNIDADES                                                label    │
│    ⬡ Gerenciar Unidades                                          │  ← /units
│    ⬡ Comparar Unidades                                           │  ← /compare/units
│  ─────────────────────────────────────────────────────────────   │
│  ORÇAMENTO                                               label    │
│    ⬡ Versões de Orçamento                                        │  ← /budget (lista versões)
│    ⬡ Cenários                                                    │  ← /scenarios
│    ⬡ Importar Excel                                              │  ← /import
│  ─────────────────────────────────────────────────────────────   │
│  SISTEMA                                                 label    │
│    ⬡ Negócios                                                    │  ← /businesses
│    ⬡ Log de Auditoria                                            │  ← /audit
│    ⬡ Configurações                                               │  ← /settings
│  ─────────────────────────────────────────────────────────────   │
│                              [Sair]                               │
└──────────────────────────────────────────────────────────────────┘
```

**Detalhes de implementação:**
- Seletor de negócio: substituir `<select>` por `<button>` com dropdown customizado (mesmo padrão do `MultiSelectUnit`)
- Labels de seção: `text-label text-atlas-navy/40 uppercase tracking-widest px-3 py-2`
- Item ativo: `bg-atlas-navy/8 text-atlas-navy border-l-2 border-atlas-teal font-semibold`
- Ícones: todos `h-4 w-4`, alinhados com `gap-3`
- Largura: aumentar de `w-56` (224px) para `w-60` (240px) para acomodar labels

### 5.2 DashboardNav — 4 Grupos

Substituir 14 tabs flat por **grupos com tabs**:

```
┌─ FINANCEIRO ──────────────────────── OPERACIONAL ──── CRESCIMENTO ── FERRAMENTAS ─┐
│  Visão Geral | DRE | CAPEX | Projeções  │  Ocupação | Capacidade │  Expansão | ...  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Implementação sugerida:**

Opção A — Tabs de grupo + sub-tabs (2 linhas):
```
Linha 1: [FINANCEIRO ▾] [OPERACIONAL ▾] [CRESCIMENTO ▾] [FERRAMENTAS ▾]
Linha 2 (contextual): [Visão Geral] [DRE] [CAPEX] [Projeções]
```

Opção B — Tabs agrupadas na mesma linha com separadores visuais:
```
Visão Geral | DRE | CAPEX | Projeções  ╎  Ocupação | Capacidade | Professores  ╎  Expansão | Estratégico
```

**Mapeamento de tabs para grupos:**

| Grupo | Tabs |
|---|---|
| FINANCEIRO | Visão Geral, DRE, CAPEX, Projeções |
| OPERACIONAL | Ocupação, Capacidade, Professores, Planos |
| CRESCIMENTO | Expansão da Rede, Consolidado, Estratégico |
| FERRAMENTAS | Sensibilidade (nova), Benefícios, Auditoria de Cálculo |

### 5.3 GlobalFilters — Reescrita

**Novo layout:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [Cenário: Base Moderado ▾]  [Unidades: Todas (8) ▾]                            │
│  ──────────────────────────────────────────────────────────────────────────────  │
│  [Todo período]  [2026]  [2027]  [2028]  [2029]  [2030]  [2031]  [2032]  [2033]  [2034]  │
│                    ↑ botão com indicador "N meses" ao hover                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Regras:**
- Presets de ano: botões `<button>` com `year === selectedYear ? ativo : inativo`
- "Todo período" = `year: null, periodStart: null, periodEnd: null`
- Seleção de período customizado (`data-início` / `data-fim`): link "Personalizar →" que abre um date-range picker inline
- Granularidade de período: o filtro define o **zoom** (anual, mensal, personalizado) — as páginas respondem a isso

### 5.4 Contexto Breadcrumb — Topbar Revisada

O `Topbar` atual tem o breadcrumb correto conceitualmente mas está errado em:
- É somente leitura → deve ter botões clicáveis para mudar context
- Esconde em mobile → deve ser sempre visível

**Novo layout do Topbar:**
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Lab B2B Coworking  ›  Cenário Base (Moderado)  ›  Todas as unidades             │
│   ↑ pill clicável       ↑ pill clicável               ↑ pill clicável            │
│                                               [Recalcular ▶]  [🔔]  [avatar]    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Plano de Refatoração por Página

### 6.1 Visão Geral — Reescrever como Cockpit

**Layout definitivo:**

```
─── HERO KPIs ──────────────────────────────────────────────────────────
│  [Receita Total]  [Lucro Líquido]  [Margem]  [EBITDA]  [Break-even]  │
│  números display (3rem, Manrope 800) com trend indicator              │
─────────────────────────────────────────────────────────────────────────

─── ROADMAP DE EXPANSÃO (novo componente UnitRoadmap) ──────────────────
│  2026 ─●──────────────────────────────────────────────────────── 2034 │
│        U1      U2      U3      U4      U5      U6      U7      U8     │
│      ago/26  jan/27  jan/28  jan/29  jan/30  jan/31  jan/32  jan/33  │
│      [ativa] [prev.] [plan.] [plan.] [plan.] [plan.] [plan.] [plan.] │
│       72%     —       —       —       —       —       —       —      │
│  Clique em cada unidade → filtra dashboards para aquela unidade       │
─────────────────────────────────────────────────────────────────────────

─── GRID ANUAL (stacked bar + tabela) ─────────────────────────────────
│  [StackedContributionChart: 2026→2034 por unidade]  │  [Resumo DRE]  │
─────────────────────────────────────────────────────────────────────────

─── ANÁLISE ATUAL (tabs FINANCEIRO / B2B / DRE sumária) ──────────────
│  (manter estrutura atual, mas com botão "Ver DRE completo →")        │
─────────────────────────────────────────────────────────────────────────
```

### 6.2 DRE — Espelhar a Planilha "Orçamento"

**Comportamento:**

```
SELETOR DE UNIDADE (obrigatório — exibir proativamente, não em branco)

BARRA DE GRANULARIDADE:   [Anual ●] | [Mensal] | [Período customizado]

BARRA DE ANO (quando Mensal):   [2026 ●] [2027] [2028] ... [2034]

TABELA (modo anual — padrão):
  Linha                  2026    2027    2028  ...  2034   TOTAL
  ────────────────────────────────────────────────────────────
  RECEITA BRUTA          xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← bg atlas-navy text-white
    → Horas vendidas       xx      xx      xx  ...    xx     xx   ← indent level 1
    → × Preço médio/h   R$xx    R$xx    R$xx  ...  R$xx   R$xx   ← indent level 1
  CUSTOS VARIÁVEIS       xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← bg amber-50
    → Taxa cartão (3,5%) xx      xx      xx   ...   xx     xx
    → Comissão vendas    xx      xx      xx   ...   xx     xx
    → Kit higiene        xx      xx      xx   ...   xx     xx
  MARGEM DE CONTRIBUIÇÃO xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← bg teal-50 text-teal-800 bold
  CUSTOS FIXOS           xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← bg rose-50
    → Pró-labore         xx      xx      xx   ...   xx     xx
    → Salários CLT       xx      xx      xx   ...   xx     xx
    → Encargos (80%)     xx      xx      xx   ...   xx     xx
    → Aluguel            xx      xx      xx   ...   xx     xx
    → Energia elétrica   xx      xx      xx   ...   xx     xx
    → Água               xx      xx      xx   ...   xx     xx
    → Outros fixos       xx      xx      xx   ...   xx     xx
  EBITDA                 xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← bg blue-50 text-blue-800 bold
  IMPOSTOS (6%)          xxxx    xxxx    xxxx  ...  xxxx   xxxx
  FINANCIAMENTO          xxxx    xxxx    xxxx  ...  xxxx   xxxx
  RESULTADO LÍQUIDO      xxxx    xxxx    xxxx  ...  xxxx   xxxx   ← verde se >0, vermelho se <0, bold
  ────────────────────────────────────────────────────────────
  Ocupação %            xxx%    xxx%    xxx%  ...  xxx%   xxx%
  Margem líquida %      xxx%    xxx%    xxx%  ...  xxx%   xxx%

MODO MENSAL (toggle = Mensal + ano selecionado):
  Mesma tabela mas colunas = Jan|Fev|Mar|...|Dez|Total
  Nota de rodapé quando sub-itens não disponíveis (GAP-08)

MODO PERÍODO CUSTOMIZADO:
  Date-range picker → filtra meses proporcionalmente (dias úteis)
```

**Dependências de backend:**
- Sub-itens granulares: depende de GAP-08 ser resolvido
- Visão anual: usa `aggregateByYear` aplicado ao DRE — precisa de endpoint ou cálculo no frontend a partir dos dados existentes
- **Enquanto GAP-08 não estiver resolvido:** exibir sub-itens com `—` e nota de rodapé `"Detalhamento por item disponível após Sprint 1 do backend"`

### 6.3 CAPEX — Espelhar "Custo Investimento Lab"

**Layout:**

```
─── SELETOR DE UNIDADE ─────────────────────────────────────────────────
│  [Unidade: Lab ▾]  ou  [Visão Consolidada: todas as unidades]         │
─────────────────────────────────────────────────────────────────────────

─── TABELA DE INVESTIMENTOS (nova — CapexBreakdownTable) ───────────────
│  Item                │ Valor Total │ Financiado │ Capital Próprio │ %  │
│  Equipamentos        │ R$472.410   │ R$320.000  │ R$152.410       │40% │
│  Obras e reforma     │ R$250.000   │ R$175.000  │ R$75.000        │21% │
│  Arquiteto           │ R$28.530    │    —        │ R$28.530        │ 2% │
│  Automação A/C       │ R$47.550    │    —        │ R$47.550        │ 4% │
│  Branding            │ R$28.530    │    —        │ R$28.530        │ 2% │
│  Capital de giro     │ R$342.005   │    —        │ R$342.005       │29% │
│  Pré-operacional     │ R$xxx       │    —        │ R$xxx           │ x% │
│  ─── TOTAL ───────── │ R$1.169k    │ R$495k      │ R$674k          │100%│
│  [mini donut chart: capitalização própria vs financiado]              │
─────────────────────────────────────────────────────────────────────────

─── CURVA DE PAYBACK (linha acumulada) ─────────────────────────────────
│  Eixo X: meses da vida da unidade (0→120)                              │
│  Eixo Y: valor acumulado líquido                                       │
│  Linha cruzando zero = ponto de payback                                │
│  [linha vertical vermelha pontilhada = "estamos aqui"]                 │
─────────────────────────────────────────────────────────────────────────

─── KPIs: ROI | TIR | Payback médio | CAPEX total da rede ─────────────

─── PORTFOLIO TABLE (já existe) ────────────────────────────────────────
```

**Dependências de backend:**
- `CapexInputs` (arquiteto, automação, branding) dependem de GAP-05 estar resolvido no backend
- A tabela de breakdown precisa de um novo campo no response de `/portfolio` ou endpoint dedicado

### 6.4 Crescimento — Expansão da Rede

**Layout:**

```
─── EXPANSÃO ANUAL — STACKED BAR ───────────────────────────────────────
│  Ano  │████ U1 ████████████████████████████████████████████████████│ │
│  2026 │████ Lab (R$xxx)                                            │ │
│  2027 │████ Lab │████ U2 ████████████████████████████████████     │ │
│  2028 │████████│████████│████ U3 ███████████████████████          │ │
│  ...                                                               │ │
│  Tooltip: hover mostra nome da unidade + receita do ano            │ │
─────────────────────────────────────────────────────────────────────────

─── TABELA ANUAL ────────────────────────────────────────────────────────
│  Ano  │ Unidades │ Receita   │ Δ Receita │ Lucro    │ Margem │ CAGR  │
│  2026 │    1     │ R$xxx     │    —      │ R$xxx    │  xx%   │  —    │
│  2027 │    2     │ R$xxx     │ +xx%      │ R$xxx    │  xx%   │  xx%  │
│  ...  │          │           │           │          │        │       │
│  2034 │    8     │ R$xxx     │ +xx%      │ R$xxx    │  xx%   │  xx%  │
│  ─────┼──────────┼───────────┼───────────┼──────────┼────────┼───────│
│  TOTAL│          │ R$xxx     │           │ R$xxx    │  xx%   │ CAGR  │
─────────────────────────────────────────────────────────────────────────

─── INDICADORES ─────────────────────────────────────────────────────────
│  [CAGR receita]  [Ano de primeiro lucro]  [Lucro máximo no horizonte] │
─────────────────────────────────────────────────────────────────────────
```

### 6.5 Estratégico — Portfolio Cockpit

**Layout:**

```
─── COMPARATIVO DE CENÁRIOS ─────────────────────────────────────────────
│   Pessimista                Moderado (ativo)       Otimista             │
│   Receita: R$xxx            Receita: R$xxx          Receita: R$xxx      │
│   Lucro:   R$xxx            Lucro:   R$xxx          Lucro:   R$xxx      │
│   ROI:     xx%              ROI:     xx%            ROI:     xx%        │
│   Payback: xx meses         Payback: xx meses       Payback: xx meses   │
│   [badge vermelho]          [badge âmbar ●ativo]    [badge verde]       │
─────────────────────────────────────────────────────────────────────────

─── GRID DE UNIDADES (UnitStatusCard × N) ──────────────────────────────
│  [U1 Lab        ] [U2 Expansão 1  ] [U3 Planejada  ] [U4 Planejada  ] │
│  Status: Ativa    Status: Pre-open  Status: Planej.   Status: Planej.  │
│  Ocupação: 72%    Abertura: jan/27  Abertura: jan/28  Abertura: jan/29 │
│  Lucro: R$xx/mês  —                —                 —                │
│  [sparkline]      —                —                 —                │
│  [Editar data ✏]  [Editar data ✏]  [Editar data ✏]  [Editar data ✏]  │ ← Q3: editável inline
─────────────────────────────────────────────────────────────────────────

─── ANÁLISE DE SENSIBILIDADE ────────────────────────────────────────────
│  (ver seção 6.7)                                                        │
─────────────────────────────────────────────────────────────────────────

─── PORTFOLIO TABLE (já existe, manter) ────────────────────────────────
```

### 6.6 Nova Página: `/dashboard/sensibilidade`

```
─── SIMULADOR WHAT-IF ───────────────────────────────────────────────────
│  Unidade de referência: [Lab ▾]    Cenário base: [Base Moderado ▾]     │
─────────────────────────────────────────────────────────────────────────
│  PARÂMETROS                           RESULTADO (em tempo real)         │
│                                                                         │
│  Taxa de Ocupação                     Receita/mês: R$xxx               │
│  [──────●──────────────] 35%          Custos/mês:  R$xxx               │
│  BE: 28% | Máx: 100%                  EBITDA/mês:  R$xxx               │
│                                       Resultado:   R$xxx ← verde/verm. │
│  Preço médio/hora                     Break-even:  XX meses            │
│  [────────●────────────] R$57,50      Margem:      xx%                 │
│  Mín: R$40 | Máx: R$90                                                  │
│                                       [STATUS: ⚠ Abaixo do BE          │
│  Aluguel mensal                        Déficit: R$xxx/mês]              │
│  [──────●──────────────] R$12.000                                       │
│  Mín: R$8k | Máx: R$25k                                                 │
│                                                                         │
│  Slots por hora                                                          │
│  [─────────────●──────] 10                                              │
│  Mín: 6 | Máx: 15                                                       │
─────────────────────────────────────────────────────────────────────────
│  [Comparar com cenário atual]  [Salvar como novo cenário →]            │
─────────────────────────────────────────────────────────────────────────
│  GRÁFICO: Resultado líquido × Taxa de ocupação (curva)                 │
│  Ponto atual marcado ●  |  Break-even marcado ─┼─                      │
─────────────────────────────────────────────────────────────────────────
```

**Implementação:**
- Sliders são state local no React
- Ao mover slider: `débounce 300ms → POST /calculations/recalculate/{version_id}` com premissas modificadas
- **Nunca calcular no frontend** (Q2)
- Response do recalculate: os mesmos campos de `time_series` do dashboard unit

### 6.7 Roadmap de Abertura (integrado na Visão Geral e Estratégico)

O componente `UnitRoadmap` é integrado na Visão Geral como seção, e na página Estratégico como header:

```tsx
// Comportamento de edição inline (Q3):
// - Click em ícone ✏ → abre popover com <input type="date"> inline
// - Salva via PATCH /units/{id} { opening_date: "YYYY-MM-DD" }
// - Dispara queryClient.invalidateQueries(['units', businessId])
// - Atualiza roadmap sem reload
```

---

## 7. Novos Componentes a Criar

| Componente | Arquivo | Prioridade | Dependências |
|---|---|---|---|
| `YearPresetBar` | `dashboard/YearPresetBar.tsx` | 🔴 P0 | zero |
| `SidebarSection` | `layout/SidebarSection.tsx` | 🔴 P0 | zero |
| `BusinessSelector` | `layout/BusinessSelector.tsx` | 🔴 P0 | businessesApi |
| `UnitRoadmap` | `charts/UnitRoadmap.tsx` | 🔴 P1 | unitsApi |
| `StackedContributionChart` | `charts/StackedContributionChart.tsx` | 🔴 P1 | consolidated annual data |
| `DREGrid` | `tables/DREGrid.tsx` | 🔴 P1 | `DRETable` existente + toggle mode |
| `CapexBreakdownTable` | `tables/CapexBreakdownTable.tsx` | 🟡 P2 | portfolio API + GAP-05 backend |
| `PaybackCurveChart` | `charts/PaybackCurveChart.tsx` | 🟡 P2 | time_series (net_result cumsum) |
| `UnitStatusCard` | `dashboard/UnitStatusCard.tsx` | 🟡 P2 | unit + version + time_series |
| `ScenarioColumns` | `dashboard/ScenarioColumns.tsx` | 🟡 P2 | multi-scenario data |
| `SensitivitySlider` | `dashboard/SensitivitySlider.tsx` | 🟡 P2 | `/calculations/recalculate` |
| `ContextBreadcrumb` | `layout/ContextBreadcrumb.tsx` | 🟡 P2 | navStore (refactor) |

---

## 8. Dependências de Backend

| Feature Frontend | Dependência Backend | Status |
|---|---|---|
| DRE com sub-itens granulares | GAP-08: persistir `fc_pro_labore`, `fc_electricity`, `vc_card_fee` etc. | 🔴 Pendente |
| CAPEX breakdown table | GAP-05: adicionar `architect_cost`, `automation_cost`, `branding_cost` ao modelo | 🔴 Pendente |
| Correção energia elétrica (afeta todas as páginas) | GAP-01: corrigir `fixed_costs.py` | 🔴 Pendente |
| Análise de sensibilidade com sliders | `/calculations/recalculate` (já existe) | ✅ Disponível |
| Visão anual | `GET /dashboard/business/{id}/annual` (já existe, não é chamado) | ✅ Disponível |
| Roadmap editável | `PATCH /units/{id}` (já existe) | ✅ Disponível |
| Curva de payback | `time_series.net_result` + cumulativo no frontend | ✅ Calculável |
| Stacked bar por unidade | `units-comparison` ou `portfolio` (já existem) | ✅ Disponível |

---

## 9. Sprints de Implementação

### Sprint FE-A — Fundação (0 deps de backend) — ~3 dias

- [ ] **FE-A-01:** Tailwind tokens (palette status, surface, font-mono) + globals.css
- [ ] **FE-A-02:** `YearPresetBar` componente + integrar em `GlobalFilters`
- [ ] **FE-A-03:** `GlobalFilters` — remover inputs de texto, adicionar presets de ano
- [ ] **FE-A-04:** `Sidebar` — hierarquia em seções, `BusinessSelector` customizado
- [ ] **FE-A-05:** `DashboardNav` — 4 grupos com sub-tabs
- [ ] **FE-A-06:** `Topbar` — breadcrumbs clicáveis, sempre visível
- [ ] **FE-A-07:** Unificar store — resolver duplicação `useNavStore` × `useDashboardFilters`

### Sprint FE-B — Páginas de Alto Impacto — ~5 dias

- [ ] **FE-B-01:** `UnitRoadmap` componente + integrar em `visao-geral`
- [ ] **FE-B-02:** `StackedContributionChart` + integrar em `crescimento`
- [ ] **FE-B-03:** `DREGrid` (wrapper de `DRETable` com toggle anual/mensal + barra de anos)
- [ ] **FE-B-04:** `crescimento/page.tsx` — tabela anual com Δ YoY + CAGR
- [ ] **FE-B-05:** `capex/page.tsx` — `CapexBreakdownTable` + `PaybackCurveChart`
- [ ] **FE-B-06:** `estrategico/page.tsx` — `ScenarioColumns` + `UnitStatusCard` grid
- [ ] **FE-B-07:** `visao-geral/page.tsx` — hero KPIs display + roadmap + stacked bar

### Sprint FE-C — Novas Features — ~4 dias

- [ ] **FE-C-01:** `/dashboard/sensibilidade` — nova página completa
- [ ] **FE-C-02:** `UnitStatusCard` com sparklines + edição inline de `opening_date`
- [ ] **FE-C-03:** Integrar `/dashboard/business/{id}/annual` (endpoint existente não consumido)
- [ ] **FE-C-04:** `projecoes/page.tsx` — toggle anual + waterfall payback
- [ ] **FE-C-05:** Sincronizar editabilidade de `service_plans` entre `/planos` e `/settings`

### Sprint FE-D — Polimento — ~2 dias

- [ ] **FE-D-01:** Padronizar bordas/sombras de cards (unificar `border-gray-*` vs `border-slate-*`)
- [ ] **FE-D-02:** Adicionar `font-mono` nos valores financeiros (tabular-nums já existe, completar)
- [ ] **FE-D-03:** Loading skeletons padronizados em todas as páginas
- [ ] **FE-D-04:** Empty states informativos (não apenas "selecione uma unidade" em vermelho)
- [ ] **FE-D-05:** Testes de tipo `npm run type-check` sem erros

---

## §10 — Bugs Confirmados no Código — Auditoria Linha por Linha

> Seção adicionada após leitura integral dos arquivos em 01/04/2026.
> Cada bug tem referência exata ao arquivo e trecho de código que o prova.

### B1 — DRETable: `result` sempre indigo, mesmo quando negativo

**Arquivo:** `frontend/src/components/tables/DRETable.tsx`

**Evidência:**
```typescript
// CATEGORY_COLOR mapeado com cor fixa para "result"
result: 'text-indigo-700 bg-indigo-50 font-semibold',
```

**Problema:** quando `net_result < 0`, a linha "Resultado" aparecer em indigo
(positivo) é cognitivamente enganoso. O usuário vê azul e pensa que está bem.

**Correção esperada:** tornar condicional — `net_result < 0 ? 'text-rose-700 bg-rose-50 ...' : 'text-indigo-700 bg-indigo-50 ...'`

---

### B2 — DRETable: cabeçalhos de coluna mostram `2026-01` em vez de `Jan/2026`

**Arquivo:** `frontend/src/components/tables/DRETable.tsx`

**Evidência:**
```typescript
// columns derivadas dos periods do DRE — sem formatação
{periods.map((period) => (
  <th key={period}>{period}</th>  // period = "2026-01"
))}
```

**Problema:** ISO 8601 bruto como cabeçalho de coluna — ruim para leitura.

**Correção esperada:** `formatPeriod(period)` → `"Jan/2026"`.

---

### B3 — DRETable: `pct_of_revenue` invisível (tooltip nativo do browser)

**Arquivo:** `frontend/src/components/tables/DRETable.tsx`

**Evidência:**
```typescript
<span title={`${(pct * 100).toFixed(1)}% da receita`}>
  {formatCurrency(value)}
</span>
```

**Problema:** o dado de % da receita está nos dados mas é exposto apenas no atributo `title` do `<span>` — tooltip nativo do browser que 95% dos usuários nunca vê, não aparece em touch, e não tem estilo.

**Correção esperada:** coluna dedicada `% Receita` no hover da linha ou exibição inline.

---

### B4 — DRETable: sem coluna "Total" acumulada

**Arquivo:** `frontend/src/components/tables/DRETable.tsx`

**Problema:** cada linha tem N colunas de períodos mas não há coluna agregada de soma. Para análises de "qual categoria pesou mais ao longo do ano inteiro", o usuário precisa somar manualmente ou exportar CSV.

**Correção esperada:** coluna fixa à direita `Total` com `sum(row.values)` para linhas somáveis (ou `last(row.values)` para saldos).

---

### B5 — DashboardNav: "Consolidado" redireciona silenciosamente para Visão Geral

**Arquivo:** `frontend/src/components/dashboard/DashboardNav.tsx`

**Evidência:**
```typescript
{
  label: 'Consolidado',
  icon: BuildingOffice2Icon,
  href: businessId
    ? `/dashboard/consolidated/${businessId}`
    : '/dashboard/visao-geral',   // ← redireciona sem aviso
}
```

**Problema:** se o usuário ainda não selecionou um negócio, clicar em "Consolidado"
carrega Visão Geral sem nenhuma explicação. O tab parece estar funcionando mas mostra dados diferentes sem avisar.

**Correção esperada:** quando `!businessId`, desabilitar o tab com tooltip "Selecione um negócio primeiro" ou mostrar um modal/drawer de seleção.

---

### B6 — GlobalFilters: botões de atalho de ano ficam ocultos até primeiro filtro

**Arquivo:** `frontend/src/components/dashboard/GlobalFilters.tsx`

**Evidência:**
```typescript
{(filters.scenarioId ||
  filters.selectedUnitIds.length > 0 ||
  filters.year ||
  filters.periodStart) && (
  <div className="flex gap-1">
    {projectionYears.slice(0, 6).map((year) => (
      <button key={year} onClick={() => filters.setYear(year)}>
        {year}
      </button>
    ))}
  </div>
)}
```

**Problema:** os atalhos de ano (ex: 2026, 2027, 2028…) — que são a forma mais rápida de filtrar por período — ficam completamente invisíveis até o usuário já ter aplicado algum filtro. Ou seja, o caminho mais fácil só aparece depois que o usuário já fez algo difícil.

**Correção esperada:** sempre visível; pode ser escurecido/desabilitado quando não há cenário selecionado.

---

### B7 — GlobalFilters: `.slice(0, 6)` oculta anos além do 6º

**Arquivo:** `frontend/src/components/dashboard/GlobalFilters.tsx`

**Evidência:**
```typescript
projectionYears.slice(0, 6).map((year) => ...)
```

**Problema:** com horizonte 2026–2034 (9 anos), os botões só mostram 2026–2031. Os anos 2032, 2033, 2034 nunca aparecem como atalho.

**Correção esperada:** remover o slice ou usar scroll horizontal nos botões de ano.

---

### B8 — MultiSelectUnit: dropdown `position: absolute` sem pai `position: relative`

**Arquivo:** `frontend/src/components/dashboard/GlobalFilters.tsx` (inline component)

**Problema:** o dropdown de seleção múltipla de unidades usa `position: absolute` mas o container pai não tem `position: relative`. Em algumas páginas o dropdown pode vazar para fora do header/topbar ou ser cortado pelo overflow do layout.

**Correção esperada:** adicionar `position: relative` ao wrapper do `MultiSelectUnit`.

---

### B9 — Store: sincronização `navStore → dashboardFilters` só funciona quando GlobalFilters está montado

**Arquivos:** `frontend/src/store/auth.ts` + `frontend/src/components/dashboard/GlobalFilters.tsx`

**Evidência:**
```typescript
// Em GlobalFilters.tsx — só roda quando o componente está montado
useEffect(() => {
  if (nav.businessId !== filters.businessId) {
    filters.setBusinessId(nav.businessId)
    filters.setScenarioId(null)
    filters.setSelectedUnitIds([])
  }
}, [nav.businessId])
```

**E em store/auth.ts:**
```typescript
setBusiness: (id) =>
  set({ businessId: id, unitId: null, scenarioId: null, versionId: null }),
// NÃO faz: useDashboardFilters.getState().setBusinessId(id)
```

**Problema:** se o usuário muda de negócio na sidebar estando em `/units` ou `/businesses` (rotas sem GlobalFilters), o `useDashboardFilters.businessId` permanece com o negócio antigo. Quando volta para o dashboard, os filtros mostram dados do negócio anterior até que o `useEffect` do GlobalFilters seja acionado — o que pode causar um flicker de dados incorretos ou, pior, queries com `businessId` defasado.

**Correção esperada:** mover a lógica de sync para `useNavStore.setBusiness()` ou criar um hook listener global (ex: `useSyncStores()` em `layout.tsx`).

---

### B10 — Topbar: 3 queries independentes apenas para o breadcrumb

**Arquivo:** `frontend/src/components/layout/Topbar.tsx`

**Evidência:**
```typescript
const { data: businesses } = useQuery({
  queryKey: ['businesses-topbar', orgId],
  queryFn: () => businessesApi.list(orgId!),
})
const { data: scenarios } = useQuery({
  queryKey: ['scenarios-topbar', businessId],
  queryFn: () => scenariosApi.list(businessId!),
})
const { data: units } = useQuery({
  queryKey: ['units-topbar', businessId],
  queryFn: () => unitsApi.list(businessId!),
})
```

**Problema:** três requisições HTTP independentes a cada render do Topbar, cujos dados já estão disponíveis em caches com outras query keys (ex: `['businesses', orgId]`, `['units', businessId]`). O Topbar é somente-leitura — só exibe o nome do negócio/unidade selecionado. Poderia usar o `useNavStore` diretamente (ele persiste os IDs) sem queries.

**Impacto:** 3 requests extras sempre que o layout monta, 3 loading states adicionais, possível flash de "carregando...".

---

### B11 — Páginas ignoram `annual_summaries` já retornado pelo backend

**Arquivos afetados:** `crescimento/page.tsx`, `estrategico/page.tsx`, `projecoes/page.tsx`

**Evidência no backend** (`dashboard.py`):
```python
return {
    "business_id": business_id,
    "scenario_id": scenario_id,
    "unit_ids": [u.id for u in units_list],
    "kpis": kpis,
    "time_series": time_series,
    "annual_summaries": _build_annual_from_time_series(time_series, SUMMABLE),
}
```

**Evidência no frontend** (`crescimento/page.tsx`):
```typescript
// Ignora annual_summaries, recomputa tudo no cliente
const annualData = useMemo(
  () => aggregateByYear(seriesData),
  [seriesData]
)
```

**Problema:** o backend já agrega por ano corretamente no servidor. O frontend recalcula localmente com `aggregateByYear()` — duplicação de lógica, risco de divergência, e processamento desnecessário no browser.

---

### B12 — `avg_price_per_hour` declarado no tipo mas não persistido pelo backend

**Arquivo:** `frontend/src/types/api.ts`

**Evidência:**
```typescript
export interface TimeSeries {
  period: string
  capacity_hours_month: number
  active_hours_month: number
  // ... outros campos ...
  avg_price_per_hour?: number  // ← declarado opcional
}
```

**No backend** (`dashboard.py`) — `KPI_CODES` NÃO inclui `avg_price_per_hour`. O cálculo é inline:
```python
# Em _build_derived_metrics()
avg_price = ts.get("revenue_total", 0) / ts.get("active_hours_month", 1)
```

**Problema:** `avg_price_per_hour` pode não chegar nos dados retornados pela API dependendo da versão do backend. O frontend de `estrategico/page.tsx` usa um fallback:
```typescript
const avg = active > 0 ? rev / active : fallbackAvgPrice
```
Isso silencia o problema mas cria inconsistência entre o que o servidor calcula e o que o frontend usa.

---

### B13 — `visao-geral`: KPIs somam horizonte inteiro de 8 anos sem aviso

**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/visao-geral/page.tsx`

**Evidência:**
```typescript
const filteredTs = useMemo(() => {
  if (!periodStart && !periodEnd && !year) return timeSeries  // ← TODOS os períodos
  // ...
}, [timeSeries, periodStart, periodEnd, year])

// Depois:
const totalRevenue = filteredTs.reduce((s, p) => s + getRevenue(p), 0)
```

**Problema:** sem nenhum filtro ativo, `filteredTs` pode conter até 96 meses (horizonte de 8 anos). O card "Receita Total" mostrará R$3.6M+ sem qualquer indicação de que é o acumulado do horizonte inteiro. Um novo usuário interpretará como receita mensal ou anual.

**Severity:** 🔴 Confusão crítica de contexto. Um número sem contexto de período é pior que nenhum número.

**Correção esperada:** 
1. Sempre mostrar o label do período no card (ex: "2026–2034 (horizonte completo)")
2. OU definir um período padrão ao montar a página (ex: `currentYear`)
3. OU exibir média mensal por padrão quando nenhum filtro está ativo

---

### B14 — `capex/page.tsx`: WaterfallChart mostra DRE, não CAPEX

**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/capex/page.tsx`

**Evidência:**
```typescript
// Dados enviados ao WaterfallChart
const waterfallData = {
  revenue: consolidated.kpis.revenue_total,
  fixedCosts: consolidated.kpis.total_fixed_costs,
  variableCosts: consolidated.kpis.total_variable_costs,
  taxes: consolidated.kpis.total_taxes,
  financing: consolidated.kpis.financing_cost,
  netResult: consolidated.kpis.net_result,
}
```

**Problema:** esta é uma cascata de DRE (Receita → Custos → Resultado). A página se chama "CAPEX" mas não mostra CAPEX (investimento inicial, reforma, equipamentos, reserva de capital de giro). O WaterfallChart correto para CAPEX seria:
`Investimento Total → Reforma → Equipamentos → Capital de Giro → Franchise Fee → Saldo`

**Impacto:** O usuário em busca de informação de investimento (CAPEX) vê os resultados financeiros recorrentes — informação duplicada de `visao-geral`, título errado.

---

### B15 — Sidebar: sub-menu só abre quando já estamos na rota pai

**Arquivo:** `frontend/src/components/layout/Sidebar.tsx`

**Evidência:**
```typescript
{item.children && active && (  // ← "active" = estamos nessa rota agora
  <div className="ml-4 mt-1 space-y-1">
    {item.children.map(child => (...))}
  </div>
)}
```

**Onde `active`:**
```typescript
const active = pathname.startsWith(item.href)
```

**Problema:** o sub-menu de "Comparações" (com filhos "Por Unidade" e "Cenários") só aparece quando o usuário JÁ está em `/dashboard/compare/*`. Hovering ou clicando no item pai sem estar na rota nunca expande o sub-menu. O usuário precisa "adivinhar" que existe um sub-menu.

**Correção esperada:** expandir o sub-menu ao hover ou ao clicar no item pai (com toggle), independente da rota atual. Manter o estado de expansão no Zustand ou `useState`.

---

### B16 — `dre/page.tsx`: locked em exatamente 1 unidade, sem guia de seleção

**Arquivo:** `frontend/src/app/(auth)/dashboard/(executive)/dre/page.tsx`

**Evidência:**
```typescript
const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null

if (!unitId) {
  return (
    <div className="rounded-lg bg-amber-50 p-4 text-amber-800">
      Selecione exatamente uma unidade nos filtros acima para visualizar a DRE.
    </div>
  )
}
```

**Problema:** o aviso é correto mas não acionável — não há botão ou drawer para selecionar a unidade inline. O usuário precisa saber que o filtro de unidade está no `GlobalFilters` do topo da página. Em mobile (hidden md:flex no Topbar), não vê o filtro.

**Adicionalmente:** não há versão "anual" da DRE e não há DRE consolidada (múltiplas unidades).

---

## §11 — Regras de Negócio Não Definidas — Perguntas Abertas

> Estas questões bloqueiam ou condicionam decisões de implementação.
> Sprints FE-B e FE-C não devem começar sem respostas confirmadas para as perguntas marcadas 🔴.

---

### Q-A — 🔴 Granularidade "Dias Úteis" — Como calcular?

**Contexto:** Q1 (respondida) diz "período proporcional a dias úteis" para a visão por período personalizado.

**Dúvidas não resolvidas:**
1. Qual calendário de dias úteis? Nacional (ANBIMA), estadual, ou configurável por unidade/cidade?
2. Se o user seleciona 15/jan/2027 a 28/fev/2027, a receita é:
   - `(dias_úteis_no_intervalo / dias_úteis_do_mês) × receita_do_mês`? Para cada mês parcialmente coberto?
   - Ou interpolação linear por dia corrido?
3. O backend precisa de um endpoint de calendário, ou a interpolação é feita no frontend?

---

### Q-B — 🔴 Janelas Temporais Diferentes entre Unidades no Consolidado

**Contexto:** Unidade Lab pode ter versão com 2026–2034. Nova unidade pode ter versão com 2027–2034.

**Dúvidas:**
1. No ano 2026, a unidade nova "aparece" com valores zero ou simplesmente não é incluída?
2. O `annual_summaries` do backend já lida com isso? (soma apenas o que existe)
3. Na tabela de crescimento, uma unidade com dado faltante em 2026 atrapalha o YoY de 2027?

---

### Q-C — 🟡 DRE Consolidada — Como Agregar Categorias?

**Contexto:** a DRE atual (`/dre` page) funciona para exatamente 1 unidade. A Q5 confirma que o consolidado deve existir.

**Dúvidas:**
1. Cada unidade tem suas próprias linhas de DRE (ex: pró-labore, aluguel, professores). No consolidado, somam-se todas?
2. Linhas que existem em uma unidade mas não em outra — aparecem com zero ou ficam ocultas?
3. O backend precisa de novo endpoint `/dre/consolidated` ou o frontend agrega localmente?
4. Pró-labore de 3 unidades = suma = pró-labore consolidado? Ou cada unidade tem seção separada?

---

### Q-D — 🟡 Análise de Sensibilidade — Quais Parâmetros São Variáveis?

**Contexto:** Sprint FE-C-01 propõe página de sensibilidade com sliders.

**Dúvidas:**
1. Quais parâmetros o usuário pode "mexer" na análise de sensibilidade?
   - Taxa de ocupação (`ocupacao_rate`) → sim, óbvio
   - Preço médio por hora (`avg_price_per_hour`) → provavelmente sim
   - Aluguel (`aluguel`) → sim?
   - Slots por hora (`slots_per_hour`) → sim?
   - Taxa de cartão (`taxa_cartao = 3,5%`) → pode variar?
   - Encargos trabalhistas (`encargos = 80%`) → pode variar?
   - Franchise fee % → pode variar na sensibilidade?
2. Qual é o intervalo dos sliders (min, max, step)?
3. A sensibilidade é em tempo real (recalcula no browser) ou gera novo cenário no backend?

---

### Q-E — 🟡 Roadmap — Unidades Sem `opening_date`

**Contexto:** Sprint FE-B-01 propõe `UnitRoadmap` componente.

**Dúvidas:**
1. Uma unidade `status = 'planned'` sem `opening_date` — como aparece no timeline?
   - "Sem data definida" em faixa cinza no final?
   - Estimativa baseada em `sort_order`?
   - Escondida no roadmap?
2. A edição inline de `opening_date` no roadmap deve salvar via `PUT /units/{id}`?
3. Quem pode editar (apenas admin, ou qualquer usuário da org)?

---

### Q-F — 🟡 Multi-Organização — Intencional Ter 1 Org/Usuário?

**Contexto:** `useNavStore` tem `organizationId` e o backend suporta orgs, mas a sidebar não tem seletor de organização.

**Dúvidas:**
1. Um usuário pode pertencer a múltiplas organizações?
2. Se sim — como ele trocará de organização? (item de menu no topo da sidebar? no dropdown do avatar?)
3. Se não — o `organizationId` é fixo para o usuário e não precisa de UI de troca?

---

### Q-G — 🟡 CAGR com Menos de 1 Ano de Dados

**Contexto:** a tabela de crescimento mostra CAGR. Com dados apenas de 2026 (primeiro ano), não há base YoY.

**Dúvidas:**
1. O que mostrar no campo CAGR para o 1º ano? `—`, `n/d`, `∞`?
2. O CAGR should be calculado a partir do 2º ano retrospectivo ou do 2º ano projetado futuro?
3. Para a célula "Crescimento YoY 2027 vs 2026" quando 2026 é início de operação: mostrar crescimento real ou ocultar?

---

### Q-H — 🟡 Professores — Constraint de Capacidade ou Custo Variável?

**Contexto:** página `/professores` com `TeachersBreakevenTable`. O modelo tem `teachers_needed_*` calculado.

**Dúvidas:**
1. Se o número de professores disponíveis é insuficiente para atender a demanda projetada, o modelo deve:
   - Limitar a receita (capacidade física = ceiling)?
   - Mostrar aviso mas não recalcular?
2. Professor full-time = custo fixo. Professor horista = custo variável. O modelo separa isso?
3. A tabela de `TeachersBreakeven` é apenas informativa ou vai gerar alertas em `estrategico/`?

---

### Q-I — 🔴 `avg_price_per_hour` — Linha no DRE ou KPI acima da tabela?

**Contexto:** o DRE proposto em §6.2 tem `→ × Preço médio/h` como linha da DRE. O backend não persiste esse valor em `KPI_CODES`.

**Decisão necessária:**
1. `avg_price_per_hour` deve ser uma linha de DRE ou apenas um KPI card acima da tabela?
2. Se é linha de DRE: precisa de novo código em `KPI_CODES` e novo `CalculatedResult` persistido
3. Se é KPI: pode ser computado no frontend como `revenue_total / active_hours_month`
4. Qual impacto no cálculo: o preço médio varia mês a mês (mix de planos)? Deve ser mostrado por período ou apenas como média do horizonte?

---

### Q-J — 🟡 DRE Anual com Unidades de Datas Diferentes — Colunas Zeradas ou Ocultas?

**Contexto:** DRE anual com colunas 2026, 2027, 2028… Se a unidade X inicia em 2027, a coluna 2026 existe?

**Decisão:**
1. Mostrar coluna 2026 com zeros (evidencia que a unidade não existia)?
2. Ocultar coluna 2026 para unidades que ainda não existiam (tabela dinâmica)?
3. No modo consolidado, mostrar a soma das unidades que existiam naquele período (coluna 2026 = apenas Lab)?

---

### Q-K — 🟡 Export CSV da DRE Consolidada/Anual

**Contexto:** `GET /reports/csv/{version_id}` exporta por versão de unidade. Não existe endpoint para DRE consolidada ou anual.

**Decisão:**
1. Para exportar DRE consolidada: criar `GET /reports/csv/consolidated/{business_id}?scenario_id=...`?
2. Para exportar DRE anual: incluir parâmetro `?granularity=annual` no endpoint existente?
3. Ou o export é sempre mensal e o usuário faz o agrupamento em Excel?

---

### Q-L — 🟡 Migração do `unitId` Depreciado

**Contexto:** `useDashboardFilters` tem campo `unitId: string | null  // @deprecated use selectedUnitIds`.

**Evidências de uso ainda presente:**
- `dre/page.tsx` pode usar `setUnitId`
- `visao-geral/page.tsx` usa `unitId` em alguns queries

**Decisão:**
1. É safe migrar todos os usos de `setUnitId(id)` para `setSelectedUnitIds([id])`?
2. Alguma página tem lógica que distingue "single unitId" de "selectedUnitIds com 1 elemento"?
3. Quando migrar? Sprint FE-A (junto com bugfixes) ou Sprint FE-B (junto com refatoração das páginas)?

---

## §12 — Correções e Atualizações à Auditoria Anterior (§1–§8)

### Correção §1.5 — Endpoint `/consolidated` retorna `annual_summaries`

**Antes (incorreto):**
> "GET /dashboard/business/{id}/annual — NÃO consumido ⚠️ endpoint existe mas nenhuma página chama. `annual_summaries` ausente do response"

**Após leitura do backend (`dashboard.py`):**
```python
return {
    "business_id": business_id,
    "scenario_id": scenario_id,
    "unit_ids": [u.id for u in units_list],
    "kpis": kpis,
    "time_series": time_series,
    "annual_summaries": _build_annual_from_time_series(time_series, SUMMABLE),
}
```

**Correto:** `/consolidated` **JÁ inclui** `annual_summaries`. O TypeScript também já declara o campo como `annual_summaries?: AnnualSummaryBackend[]` em `types/api.ts`.

**O problema real:** as páginas `crescimento`, `estrategico` e `projecoes` recebem `annual_summaries` no response mas o ignoram, recomputando o mesmo dado localmente via `aggregateByYear()`. Ver Bug B11.

**O endpoint `GET /business/{id}/annual` é diferente** (retorna estrutura diferente) e genuinamente não é chamado por nenhuma página.

---

### Adições à §2.3 — `GlobalFilters.tsx`

**Evidências adicionais do código:**
- `FilterSelect` é um componente de `<select>` estilizado, não texto livre — opções de período derivadas do `consolidated.time_series` → `monthYearOptions`
- Seleção de período só habilita quando `filters.scenarioId && monthYearOptions.length > 0` — usuário precisa selecionar cenário ANTES de poder filtrar período. Fluxo não óbvio.
- `staleTime: 5 * 60 * 1000` no query de `consolidatedPeriods` — usa cache de 5 min. Se o usuário recalcular o cenário, o filtro de período pode mostrar períodos desatualizados por até 5 min.

---

### Adições à §2.4 — `DashboardNav.tsx`

**Estrutura completa dos 14 tabs (verificada em código):**
1. Visão Geral (`/dashboard/visao-geral`)
2. Crescimento (`/dashboard/crescimento`)
3. Unidades (`/dashboard/unidades`) — short: "Units"
4. Capacidade (`/dashboard/capacidade`)
5. Ocupação (`/dashboard/ocupacao`)
6. Professores (`/dashboard/professores`)
7. Projeções (`/dashboard/projecoes`)
8. Estratégico (`/dashboard/estrategico`)
9. DRE (`/dashboard/dre`) — short: "DRE"
10. CAPEX (`/dashboard/capex`) — short: "CAPEX"
11. Benefícios (`/dashboard/beneficios-personal`) — short: "Ben."
12. Planos (`/dashboard/planos`)
13. Auditoria (`/dashboard/auditoria-calculo`) — short: "Audit"
14. Consolidado (dynamic href — ver Bug B5)

Com `gap-0.5` (2px) e padding `px-4 py-3`, em tela 1440px os 14 tabs somam ~1350px — cabe sem scroll mas sem margem. Em 1280px ou com sidebar, haverá scroll.

---

### Adições à §2.7 — `store/dashboard.ts`

**Campos que faltam no store mas são necessários para os sprints:**
```typescript
// Proposta de campos adicionais
granularity: 'monthly' | 'annual' | 'period'   // para DREGrid toggle
activeYearPreset: number | null                  // para destacar botão ativo nos presets
comparisonMode: boolean                          // para compare pages
```

**Campo `@deprecated` ainda em uso:**
```typescript
unitId: string | null  // @deprecated use selectedUnitIds
// Ainda referenciado em queries de visao-geral e dre
```

---

### Adições à §2.1 — `Sidebar.tsx`

**Evidências do código (problema visual):**
```typescript
// Business selector dentro da sidebar
<select
  value={businessId ?? ''}
  className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-[11px] text-gray-100"
>
```
- `bg-gray-900` dentro de sidebar com `background: linear-gradient(180deg, #1E2A44 0%, #111827 100%)` — o select fica sobre fundo quase preto. As letras em `text-gray-100` são legíveis mas o `text-[11px]` é muito pequeno (11px).
- Sem ícone de seta customizado — usa a seta nativa do browser (inconsistente entre sistemas operacionais).
- Ao selecionar um negócio, nenhum feedback visual imediato (sem spinner ou highlight). A mudança de contexto ocorre silenciosamente.
- **Brand token inconsistência:** item ativo usa `bg-brand-600` e texto `text-white`. Item filho ativo usa `text-brand-300`. O tailwind.config confirma `brand` = alias para `indigo`. Mas `brand-300` pode não estar definido, causando fallback para cinza padrão.

---

## §13 — Adições ao Sprint Plan

> Novos items identificados na auditoria de código. Adicionar às sprints respectivas.

### Sprint FE-A — Bugfixes Críticos (adicionar aos existentes FE-A-01 a FE-A-07)

- [ ] **FE-A-08:** `DRETable` — tornar cor de `result` condicional (rose quando negativo) [Bug B1]
- [ ] **FE-A-09:** `DRETable` — formatar cabeçalhos de coluna como `Jan/2026` [Bug B2]
- [ ] **FE-A-10:** `DRETable` — mostrar `pct_of_revenue` inline (não apenas como tooltip) [Bug B3]
- [ ] **FE-A-11:** `GlobalFilters` — remover condicional dos botões de atalho de ano (sempre visíveis) [Bug B6]
- [ ] **FE-A-12:** `GlobalFilters` — remover `.slice(0, 6)` dos presets de ano [Bug B7]
- [ ] **FE-A-13:** `DashboardNav` — desabilitar tab "Consolidado" quando `!businessId` com tooltip [Bug B5]
- [ ] **FE-A-14:** `Sidebar` — expandir sub-menus ao clicar no item pai (não apenas quando na rota) [Bug B15]
- [ ] **FE-A-15:** `visao-geral` — label de período no KPI hero (ex: "2026–2034 · Horizonte completo") [Bug B13]
- [ ] **FE-A-16:** Migrar `unitId @deprecated` → `selectedUnitIds` em todas as páginas [Bug Q-L]

### Sprint FE-B — Páginas de Alto Impacto (adicionar aos existentes FE-B-01 a FE-B-07)

- [ ] **FE-B-08:** Usar `annual_summaries` do response `/consolidated` em vez de `aggregateByYear()` local [Bug B11]
- [ ] **FE-B-09:** `capex/page.tsx` — substituir WaterfallChart de DRE por breakdown de CAPEX real [Bug B14]
- [ ] **FE-B-10:** `dre/page.tsx` — adicionar modo anual (toggle mensal/anual com barra de anos) [Bug B16]
- [ ] **FE-B-11:** Mover lógica de sync `navStore → dashboardFilters` para `layout.tsx` (não em GlobalFilters) [Bug B9]
- [ ] **FE-B-12:** `Topbar` — remover 3 queries independentes; usar dados das stores + caches existentes [Bug B10]

### Sprint FE-C — Novas Features (adicionar aos existentes FE-C-01 a FE-C-05)

- [ ] **FE-C-06:** `dre/page.tsx` — versão consolidada (múltiplas unidades) com endpoint novo ou agregação no frontend [Depende de Q-C]
- [ ] **FE-C-07:** `DRETable` — adicionar coluna "Total" (soma de todos os períodos) [Bug B4]
- [ ] **FE-C-08:** Export CSV para DRE consolidada/anual [Depende de Q-K]

---

## §14 — Decisões Oficiais de Produto — Segunda Rodada (31/03/2026)

> Decisões de negócio e modelagem recebidas em 31/03/2026. Tratadas como oficiais para orientar a implementação incremental.
> Não alterar a arquitetura existente — estender o sistema atual com o mínimo de novas estruturas.

---

### D-01 — Camada de Calendário por Unidade/Localidade

**Decisão:**
- A visualização principal permanece **mensal**.
- O cálculo de dias úteis **não deve usar 22 dias/mês como regra estrutural permanente**.
- O Atlas passa a suportar uma **camada de calendário diário por unidade/localidade**.
- Essa camada deve considerar: fins de semana, feriados nacionais, estaduais, municipais e exceções manuais (overrides).
- Por mês, por unidade, o sistema deve derivar:
  - `dias_corridos` — total de dias do mês
  - `fins_de_semana` — sábados + domingos
  - `feriados` — sobreposição feriados × dias úteis
  - `dias_uteis` — `dias_corridos − fins_de_semana − feriados`
  - `dias_uteis_efetivos` — `dias_uteis − overrides_manuais` (fechamentos excepcionais)
- Se não houver integração com fonte externa de feriados: usar **seed inicial** (feriados nacionais BR 2026–2034) com possibilidade de override manual por unidade.
- O valor `22 dias úteis` permanece apenas como **fallback transitório** enquanto o calendário real não for cadastrado para uma unidade — **nunca como regra estrutural**.

**Impacto no modelo de dados (mínimo):**
```
calendar_exception(
  id, unit_id, date, type: 'holiday_national|holiday_state|holiday_municipal|manual_close|manual_open',
  description, created_by, created_at
)

monthly_calendar_summary(
  id, unit_id, year_month,
  calendar_days, weekend_days, holiday_days,
  working_days, effective_working_days,
  calculated_at
)
```

**Seed mínima necessária:**
- Feriados nacionais BR 2026–2034 (Carnaval, Semana Santa, Tiradentes, Trabalho, Corpus Christi, Independência, N.S.Aparecida, Finados, Proclamação, Natal, Ano Novo)
- Cadastro manual para feriados estaduais/municipais da cidade de cada unidade

---

### D-02 — Impacto do Calendário no Negócio

**Decisão:** A camada de calendário (D-01) deve alimentar:

| Variável afetada | Mudança |
|---|---|
| `capacity_hours_month` | `effective_working_days × hours_per_day` em vez de `22 × hours_per_day` |
| `available_hours_month` | Derivado do calendário efetivo da unidade |
| `utilization_rate` | `active_hours / available_hours` (denominador muda) |
| `break_even_occupancy_pct` | Recalculado com capacidade real do calendário |
| `teachers_needed_*` | Derivado da carga de aulas × calendário efetivo |
| Projeções anuais e mensais | Agregação respeitando variação sazonal de dias úteis |

**Consequência direta:** meses com mais feriados (ex: janeiro, novembro) terão capacidade genuinamente menor, gerando sazonalidade natural nas projeções — o que é economicamente correto e antes era mascarado pelo 22 fixo.

---

### D-03 — DRE Consolidada

**Decisão:**
- A DRE consolidada agrega por **código canônico de linha** (`line_item_code`), não por label textual.
- A consolidação ocorre por `(period, line_item_code)` a partir dos `CalculatedResult` individuais de cada unidade.
- Cada unidade reflete sua própria realidade de calendário, ocupação, receita e custo **antes** de ser agregada.
- Margens (%) e percentuais são **recalculados após a agregação** — não são médias das margens individuais.
- CAPEX permanece **separado** da DRE operacional (não aparecer como linha de DRE).
- Linhas sem mapeamento canônico → categoria transitória `"não_classificado"` (visível no consolidado, não silenciosa).

**Abordagem de implementação:**
```
GET /dashboard/business/{id}/dre/consolidated
  ?scenario_id=...&granularity=annual|monthly&year=...&period_start=...&period_end=...

Response: {
  periods: string[],
  lines: [
    { code: "revenue_gross", label: "Receita Bruta", category: "revenue",
      values: { "2026": 0, "2027": 0, ... },
      pct_of_revenue: { "2026": 1.0, "2027": 1.0, ... }
    },
    ...
    { code: "unclassified", label: "Não Classificado", category: "warning",
      values: {...} }
  ],
  unit_count: N,
  units_included: [{ unit_id, unit_name, version_id, version_type }]
}
```

---

### D-04 — KPI `avg_price_per_hour` — Três Variantes

**Decisão: `avg_price_per_hour` NÃO é linha da DRE. É KPI derivado.**

O sistema deve suportar distinção entre **três variantes**:

| Variante | Fórmula | Nome no frontend |
|---|---|---|
| `avg_price_per_hour_sold` | `revenue_total / hours_sold` | Preço médio / hora vendida |
| `avg_price_per_hour_occupied` | `revenue_total / active_hours_month` | Receita / hora ocupada |
| `avg_price_per_hour_available` | `revenue_total / available_hours_month` | Receita / hora disponível (ajustada calendário) |

**Regras:**
- O frontend deve **sempre explicitar qual denominador** está sendo usado (label visível, não tooltip).
- O backend deve persistir as três variantes como `KPI_CODES` consistentes — não computar inline.
- Quando `hours_sold = 0` ou `available_hours = 0`, exibir `—` (não zero, não `∞`).

**Adição aos `KPI_CODES` do backend:**
```python
"avg_price_per_hour_sold",
"avg_price_per_hour_occupied",
"avg_price_per_hour_available",
```

---

### D-05 — KPIs da Visão Geral — Período Padrão Explícito

**Decisão:**
- KPIs da Visão Geral devem **sempre respeitar o período filtrado**.
- **Nunca somar múltiplos anos silenciosamente** (resolve Bug B13).
- Se nenhum filtro de período está ativo: usar **último ano completo disponível** como padrão.
- O período ativo deve ser **explícito e visível** — ex: "Exibindo: 2026 (padrão)" ou "Exibindo: Jan–Dez 2027".
- O `GlobalFilters` deve **inicializar com o ano padrão** ao montar (não com `null`).

**Implementação:**
```typescript
// Em GlobalFilters.tsx — ao montar, se year === null
useEffect(() => {
  if (!filters.year && !filters.periodStart) {
    const defaultYear = getLastCompleteYear(projectionYears)  // ex: 2026
    filters.setYear(defaultYear)
  }
}, [])
```

---

### D-06 — Separação Visual Real / Projetado / Breakeven

**Decisão:** o sistema deve manter separação visual e semântica consistente entre:

| Tipo | Cor/estilo | Badge | Uso |
|---|---|---|---|
| **Valor real** (histórico) | `text-slate-900 bg-slate-50` | `badge-real` | Dados realizados |
| **Valor projetado** (orçamento) | `text-blue-900 bg-blue-50` | `badge-proj` | Projeções do Atlas |
| **Valor de breakeven** | `text-amber-900 bg-amber-50` | `badge-be` | Ponto de equilíbrio |

**Aplicação em toda a UI:**
- KPIs cards: indicar tipo no label (`text-[10px] text-gray-400 uppercase`)
- DRE: linha de break-even deve existir como linha destacada
- Gráficos: legendas com ícone de tipo
- `StatusPill` em `estrategico/`: já implementado parcialmente — estender com o token D-06

---

### D-07 — Novo Painel de Calendário e Capacidade

**Decisão:** o Atlas deve prever um bloco ou painel que mostre, por unidade e por mês:
- Dias úteis
- Feriados (com nome)
- Horas disponíveis
- Capacidade máxima ajustada pelo calendário
- Impacto do calendário na operação (ex: "novembro: −3 dias úteis vs média → capacidade −14%")

**Localização no app:**
- Como sub-seção da página `capacidade/page.tsx` (aba adicional "Calendário")
- OU como nova página `/dashboard/calendario`
- Possibilidade de acesso pelo roadmap de unidades (click em um mês → mostra calendário daquele mês)

**Componente proposto:** `CalendarCapacityBlock`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CALENDÁRIO — Lab B2B Coworking — 2026                                   │
│                                                                           │
│  Jan  │ Fev  │ Mar  │ Abr  │ Mai  │ Jun  │ Jul  │ Ago  │ Set  │ Out  │ Nov  │ Dez │
│  21d  │ 20d  │ 21d  │ 22d  │ 20d  │ 21d  │ 23d  │ 22d  │ 22d  │ 23d  │ 19d  │ 20d │
│  ↑     ↑     │      │  ↑   │      │      │      │      │      │      │   ↑  │     │
│  Ano Novo  Carnaval  Tirad. Trab.                                   N.S.Ap.     │
│                                                                           │
│  Feriados em [Novembro]: N.S.Aparecida (12/11), Finados (02/11) = −2 dias│
│  Capacidade Nov: 19 dias × 10h = 190h disponíveis (vs 220h média)       │
│  Impacto: −13.6% de capacidade                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### D-08 — Implementação Incremental — Restrições

**Decisão:** implementar sem recriar a arquitetura. Diretrizes:

1. **Não reescrever o `financial_engine`** — adicionar camada de calendário como insumo externo
2. **Tabelas novas mínimas:** apenas `calendar_exception` + `monthly_calendar_summary` (ver D-01)
3. **Preferir seed + override** a integrações externas neste momento
4. **Fallback explícito:** se `monthly_calendar_summary` não existir para uma unidade/mês → usar `22` com aviso visual `⚠ usando estimativa (22 dias úteis)`
5. **Engine não muda lógica** — apenas substitui a constante `22` por `monthly_calendar_summary.effective_working_days` onde existir
6. **Endpoints sem endpoints novos** (exceto DRE consolidada e calendário) — reutilizar `/consolidated` com os dados já retornados

---

## §15 — Auditoria de Implementabilidade — visao.md pós-decisões (31/03/2026)

> Esta seção audita o estado atual do documento e dos planos de sprint à luz das decisões D-01 a D-08.
> Classifica cada item em: ✅ Validado | ⚠️ Precisa atualizar | 🔴 Reformular | ✅✅ Resolvido por decisão.

---

### 15.1 — Questões Abertas de §11 — Status Atualizado

| Questão | Status | Resolução |
|---|---|---|
| **Q-A** Calendário/dias úteis | ✅✅ **RESOLVIDA** | D-01: seed + override por unidade, 22 dias como fallback transitório |
| **Q-C** DRE consolidada | ✅✅ **RESOLVIDA** | D-03: por código canônico, margens recalculadas pós-agregação, CAPEX separado |
| **Q-I** `avg_price_per_hour` linha ou KPI | ✅✅ **RESOLVIDA** | D-04: KPI derivado com 3 variantes; frontend explicita denominador |
| **B13** KPIs somam 8 anos silenciosamente | ✅✅ **RESOLVIDA** | D-05: padrão = último ano completo, explícito e visível |
| **Q-B** Janelas temporais diferentes | ⚠️ **PARCIAL** | D-03 diz "cada unidade reflete sua realidade antes de agregar" → unidade sem dados em 2026 simplesmente não contribui para 2026. Confirmar comportamento de colunas no frontend (Q-J relacionada) |
| **Q-D** Sensibilidade — parâmetros variáveis | ❌ **AINDA ABERTA** | Não abordada nas decisões |
| **Q-E** Roadmap sem `opening_date` | ❌ **AINDA ABERTA** | Não abordada |
| **Q-F** Multi-organização | ❌ **AINDA ABERTA** | Não abordada |
| **Q-G** CAGR com <1 ano | ❌ **AINDA ABERTA** | Não abordada |
| **Q-H** Professores — constraint ou custo | ❌ **AINDA ABERTA** | Não abordada (mas D-02 confirma que `teachers_needed` é afetado pelo calendário) |
| **Q-J** DRE anual: colunas zeradas ou ocultas | ⚠️ **PARCIAL** | D-03 implica que coluna existe (agregas o que existe) — zeros para unidade ausente vs omitir ainda não decidido explicitamente |
| **Q-K** Export CSV consolidado | ❌ **AINDA ABERTA** | Não abordada |
| **Q-L** migração `unitId @deprecated` | ❌ **AINDA ABERTA** | Não abordada |

---

### 15.2 — Impacto nas Dependências de Backend (§8) — Atualizado

| Dependência | Status anterior | Status pós-decisões |
|---|---|---|
| DRE com sub-itens granulares (GAP-08) | 🔴 Pendente | 🔴 Pendente — não alterado pelas decisões |
| CAPEX breakdown table (GAP-05) | 🔴 Pendente | 🔴 Pendente — mas D-03 confirma CAPEX fora da DRE |
| Correção energia elétrica (GAP-01) | 🔴 Pendente | 🔴 Pendente |
| DRE Consolidada | ❌ Não havia | 🔴 **NOVA** — D-03 exige `GET /dre/consolidated` |
| `avg_price_per_hour` 3 variantes | ❌ Não havia | 🔴 **NOVA** — D-04 exige 3 novos `KPI_CODES` |
| Camada de calendário | ❌ Não havia | 🔴 **NOVA** — D-01 exige `calendar_exception` + `monthly_calendar_summary` |
| `capacity_hours_month` de calendário real | ❌ Não havia | 🔴 **NOVA** — D-02 exige substituir constante `22` |
| Seed de feriados nacionais 2026–2034 | ❌ Não havia | 🔴 **NOVA** — D-01 |
| Análise de sensibilidade via API | ✅ Disponível | ✅ Validado — Q2 confirma sempre via `/calculations/recalculate` |
| `GET /business/{id}/annual` | ⚠️ Existe, não consumido | ⚠️ Não alterado — ainda precisa ser conectado (FE-B-09 do §9) |

**Nova tabela BE — Backend Dependencies Completa:**

| ID | Feature | Endpoint/Modelo | Prioridade |
|---|---|---|---|
| BE-A-01 | Tabela `calendar_exception` | Model + migration | 🔴 Bloqueia D-01 |
| BE-A-02 | Tabela `monthly_calendar_summary` | Model + migration | 🔴 Bloqueia D-01 |
| BE-A-03 | Seed feriados nacionais BR 2026–2034 | `seeds/calendar_seed.py` | 🔴 Bloqueia D-01 |
| BE-A-04 | `capacity_hours_month` de calendário real | `financial_engine` patch | 🔴 Bloqueia D-02 |
| BE-A-05 | 3 variantes `avg_price_per_hour` em `KPI_CODES` | `kpi_codes.py` + engine | 🟡 D-04 |
| BE-B-01 | `GET /dashboard/business/{id}/dre/consolidated` | Novo endpoint | 🔴 D-03 |
| BE-B-02 | `GET /calendar/{unit_id}?year=...` para painel D-07 | Novo endpoint | 🟡 D-07 |
| BE-B-03 | `POST /calendar/exceptions` CRUD | Novo endpoint | 🟡 D-01 override manual |
| BE-C-01 | GAP-08: sub-itens DRE granulares | Engine + persistência | 🟡 Pendente anterior |
| BE-C-02 | GAP-05: CAPEX breakdown (arquiteto, branding, etc.) | Model + engine | 🟡 Pendente anterior |
| BE-C-03 | GAP-01: correção energia elétrica | Engine fix | 🔴 Pendente anterior |

---

### 15.3 — Impacto nas Páginas Planejadas (§6) — Revisão

#### §6.1 Visão Geral
**Status:** ⚠️ Plano válido, adicionar detalhe de D-05 e D-06

- **D-05 altera:** KPIs hero devem mostrar o período ativo explicitamente. O `GlobalFilters` deve inicializar com `year = últimoAnoCompleto()`, não com `null`.
- **D-06 adiciona:** KPIs precisam de badge do tipo (Projetado/Real/Breakeven). Para o Atlas em estágio atual (sem dados reais) todos são "Projetado".
- **Sem mudança estrutural** no layout proposto.

#### §6.2 DRE
**Status:** ⚠️ Plano precisa de 2 adições

- **D-03 adiciona:** modo "Consolidado" na barra de seletor de unidade — não apenas "unidade única" mas também "todas as unidades" (chama `/dre/consolidated`).
- **D-03 adiciona:** no modo consolidado, exibir footer `"Inclui N unidades: U1, U2..."` + indicação de linhas em "Não Classificado" se existirem.
- **D-04 confirma:** `avg_price_per_hour` NÃO aparece como linha na DRE — remover do layout proposto em §6.2. Aparece apenas acima da tabela como KPI card com label do denominador.
- **D-06 adiciona:** linha de breakeven como linha separada na DRE (receita de break-even em destaque âmbar).

#### §6.3 CAPEX
**Status:** ✅ Plano não alterado

- **D-03 confirma:** CAPEX separado da DRE operacional. O plano de §6.3 já está correto.

#### §6.4 Crescimento
**Status:** ⚠️ Adicionar impacto do calendário

- **D-01 + D-02 afetam:** as projeções anuais de receita agora variam por calendário efetivo da unidade. A tabela anual de §6.4 deve exibir um indicador de sazonalidade quando um ano tiver mais ou menos dias úteis que a média.
- **Sem mudança estrutural** no layout proposto.

#### §6.5 Estratégico
**Status:** ✅ Plano válido

- **D-06 adiciona:** o `StatusPill` existente deve usar os tokens visuais de D-06 (cores canonizadas para ok/warn/alert, mais Real/Projetado/Breakeven).

#### §6.6 Sensibilidade
**Status:** ✅ Plano válido, mas D-01 adiciona restrição

- **D-01 muda:** os sliders de "capacidade" devem refletir o calendário efetivo da unidade. Ex: o slider de "horas disponíveis" não deve ir de `0` a `horas_fixas_max`, mas de `0` a `horas_disponiveis_pelo_calendario_do_periodo`.
- **Q-D ainda aberta:** quais parâmetros são variáveis no slider ainda não foi decidido.

#### §6.7 Roadmap
**Status:** ✅ Plano válido

- Não alterado pelas decisões desta rodada.

#### NOVO §6.8 — Painel de Calendário e Capacidade (D-07)

**Página proposta:** `/dashboard/calendario`  
OU aba "Calendário" dentro de `capacidade/page.tsx`

**Decisão de localização:** recomendado como **aba adicional em `capacidade/page.tsx`** (implementação incremental — D-08), não como nova página autônoma neste momento.

**Componente:** `CalendarCapacityBlock` (ver §7 — adicionar à lista)

**Conteúdo:**
```
Seletor: [Unidade: Lab ▾]   [Ano: 2026 ▾]
─── GRID MENSAL ────────────────────────────────────────────────────────
│  Mês   │ Dias Corr. │ Fds │ Feriados │ Dias Úteis │ D.Úteis Ef. │ Horas Disp. │
│  Jan   │     31     │  9  │    1     │     21     │     21      │    210h     │
│  Fev   │     28     │  8  │    2     │     18     │     18      │    180h     │  ← Carnaval
│  ...                                                                           │
│  Total │    365     │ 104 │    12    │    249     │    249      │   2.490h    │
─── ALERTA ─────────────────────────────────────────────────────────────
│  ⚠️  Nov/2026: −3 dias vs média (N.S.Aparecida + Finados) → −30h cap. │
│  ⚠️  Fev/2026: −4 dias vs média (Carnaval) → −40h cap.                │
─────────────────────────────────────────────────────────────────────────
│  [Adicionar feriado manual]  [Editar exceção]  [Exportar calendário]  │
─────────────────────────────────────────────────────────────────────────
```

**Fallback quando calendário não cadastrado:**
```
⚠️  Usando estimativa: 22 dias úteis/mês
    [Cadastrar calendário real para maior precisão →]
```

---

### 15.4 — Novos Componentes (adições a §7)

| Componente | Arquivo | Prioridade | Decisão |
|---|---|---|---|
| `CalendarCapacityBlock` | `dashboard/CalendarCapacityBlock.tsx` | 🟡 P2 | D-07 |
| `CalendarMonthGrid` | `charts/CalendarMonthGrid.tsx` | 🟡 P2 | D-07 |
| `HolidayOverrideForm` | `forms/HolidayOverrideForm.tsx` | 🟡 P3 | D-01 override manual |
| `AvgPriceKPICard` | `kpi/AvgPriceKPICard.tsx` | 🟡 P2 | D-04 — mostra 3 variantes |
| `PeriodContextBadge` | `ui/PeriodContextBadge.tsx` | 🔴 P0 | D-05 — sempre visível nos KPI heroes |
| `DataTypeBadge` | `ui/DataTypeBadge.tsx` | 🟡 P1 | D-06 — Real/Projetado/Breakeven |

---

### 15.5 — Novos Tasks de Sprint (adições a §13)

#### Sprint BE-A — Backend Calendário — ~3 dias (novo sprint)

- [ ] **BE-A-01:** Migration: tabela `calendar_exception` (unit_id, date, type, description)
- [ ] **BE-A-02:** Migration: tabela `monthly_calendar_summary` (unit_id, year_month, working_days, ...)
- [ ] **BE-A-03:** Seed: feriados nacionais BR 2026–2034 em `seeds/calendar_seed.py`
- [ ] **BE-A-04:** Service: `CalendarService.get_monthly_summary(unit_id, year_month)` com fallback 22 dias
- [ ] **BE-A-05:** Patch `financial_engine`: substituir constante `22` por `CalendarService.get_working_days(unit_id, period)`
- [ ] **BE-A-06:** Endpoint `GET /calendar/{unit_id}?year=YYYY` para o painel D-07
- [ ] **BE-A-07:** Endpoint `POST/DELETE /calendar/exceptions` para overrides manuais

#### Sprint BE-B — Backend DRE Consolidada + KPIs — ~2 dias (novo sprint)

- [ ] **BE-B-01:** Endpoint `GET /dashboard/business/{id}/dre/consolidated` (D-03) — agrega por `line_item_code`
- [ ] **BE-B-02:** Adicionar `avg_price_per_hour_sold`, `_occupied`, `_available` a `KPI_CODES` (D-04)
- [ ] **BE-B-03:** Persistir 3 variantes `avg_price_per_hour_*` no `financial_engine`

#### Sprint FE-A — Bugfixes (adicionar)

- [ ] **FE-A-17:** `GlobalFilters` — inicializar `year` com `getLastCompleteYear()` na montagem (D-05) [Bug B13 + D-05]
- [ ] **FE-A-18:** `visao-geral` — `PeriodContextBadge` nos KPI heroes (D-05)
- [ ] **FE-A-19:** Eliminar uso do valor `22` como constante hardcoded em qualquer computação de frontend

#### Sprint FE-B — Páginas de Alto Impacto (adicionar)

- [ ] **FE-B-13:** `AvgPriceKPICard` — 3 variantes com denominador explícito (D-04)
- [ ] **FE-B-14:** `dre/page.tsx` — adicionar modo "Consolidado" com label de unidades incluídas (D-03, depende BE-B-01)
- [ ] **FE-B-15:** `DataTypeBadge` em todos os KPI cards e gráficos (D-06)

#### Sprint FE-C — Novas Features (adicionar)

- [ ] **FE-C-09:** `CalendarCapacityBlock` — grid mensal com dias úteis, feriados, horas disponíveis (D-07, depende BE-A-06)
- [ ] **FE-C-10:** Integrar `CalendarCapacityBlock` como aba na página `capacidade/` (D-07)
- [ ] **FE-C-11:** `HolidayOverrideForm` — CRUD de exceções manuais de calendário (D-01, depende BE-A-07)
- [ ] **FE-C-12:** Fallback visual `⚠️ usando estimativa 22 dias úteis` quando calendário não cadastrado (D-08)
- [ ] **FE-C-13:** `sensibilidade/page.tsx` — sliders de capacidade respeitam horas do calendário efetivo (D-01)

---

### 15.6 — Validação do Sprint Plan Consolidado

Com as adições acima, o plano de sprints completo é:

```
BE-A  (3 dias) — Camada de Calendário (D-01, D-02)
BE-B  (2 dias) — DRE Consolidada + avg_price 3 variantes (D-03, D-04)

FE-A  (3 dias) — Bugfixes críticos + D-05/D-06 fundação visual
FE-B  (5 dias) — Páginas de alto impacto
FE-C  (4 dias) — Novas features (sensibilidade, calendário, DRE consolidada FE)
FE-D  (2 dias) — Polimento

BE-C  (aberto) — GAP-01, GAP-05, GAP-08 — pendentes anteriores
```

**Sequência de dependências crítica:**
```
BE-A-05 → ↓ engine usa calendário real
BE-A-06 → FE-C-09 CalendarCapacityBlock
BE-B-01 → FE-B-14 DRE modo consolidado
BE-B-02/03 → FE-B-13 AvgPriceKPICard

FE-A-17 → FE-A-18 (period badge depende do ano padrão estar setado)
FE-A-07 → FE-B (unificação de stores deve preceder refatoração de páginas)
```

---

### 15.7 — Decisões e Violações de D-08 (Implementação Incremental)

> Verificação preventiva: nenhum item do plano viola a diretriz "não recriar arquitetura".

| Item | Incrementa ou recria? | Observação |
|---|---|---|
| BE-A: 2 novas tabelas | ✅ Incrementa | Tabelas mínimas, não tocam engine |
| BE-A-05: patch engine | ✅ Incrementa | Substitui constante `22` por service call com fallback |
| BE-B-01: endpoint DRE consolidada | ✅ Incrementa | Novo endpoint, não altera existentes |
| FE-A-04: sidebar reestruturação | ⚠️ **Verificar** | Reescrever `Sidebar.tsx` é substituição total — mas o componente não tem filhos compartilhados. Aceito como "reescrita de componente folha" |
| FE-A-07: unificação de stores | ⚠️ **Verificar** | Unificar `useNavStore` + `useDashboardFilters` pode quebrar páginas que dependem dos dois. Preferir abordagem de sync via hook sem remover stores. Ver Bug B9. |
| `CalendarCapacityBlock` novo componente | ✅ Incrementa | Novo componente na aba de Capacidade |
| GAP-08 (sub-itens granulares) | ⚠️ **Avaliar impacto** | Persiste sub-itens de DRE — requer mudança no `LineItemDefinition`. Não é reescrita, mas é adição significativa ao engine |

---

### 15.8 — Perguntas Ainda Abertas Pós-Decisões

> Questões de §11 que seguem sem resolução após esta rodada de decisões:

| # | Questão | Impacto no sprint |
|---|---|---|
| **Q-B** | Unidades com janelas temporais diferentes no consolidado — zeros ou ausência? | Bloqueia FE-B-14 (DRE consolidada FE) |
| **Q-D** | Sensibilidade — quais parâmetros são variáveis? | Bloqueia FE-C-01 (página sensibilidade) |
| **Q-E** | Roadmap: unidades sem `opening_date` — como exibir? | Bloqueia FE-B-01 (UnitRoadmap) |
| **Q-F** | Multi-organização — 1 ou N por usuário? | Bloqueia FE-A-04 (sidebar) |
| **Q-G** | CAGR ano 1 — exibir `—` ou outro valor? | Bloqueia FE-B-04 (tabela crescimento) |
| **Q-H** | Professores: constraint de capacidade ou custo variável? | Bloqueia BE-A-04 (engine calendário) |
| **Q-J** | DRE anual: colunas zeradas ou ocultas para unidades ausentes? | Bloqueia FE-B-14 |
| **Q-K** | Export CSV consolidado/anual — novo endpoint ou client-side? | Bloqueia FE-C-08 |
| **Q-L** | `unitId @deprecated` — migração segura? | Bloqueia FE-A-16 |

---

*Última atualização: 31/03/2026 — Decisões D-01 a D-08 incorporadas + Auditoria de implementabilidade completa*

---

## §16 — Auditoria Backend Completa (31/03/2026)

> Leitura integral de todos os arquivos do `financial_engine` + modelos + endpoints críticos.
> Classifica achados em: ✅ Correto | ⚠️ Parcial/Atenção | 🔴 Bug/Gap

---

### 16.1 — `financial_engine/revenue.py` ✅ Correto

**Fórmula central verificada:**
```python
capacity_hours = (working_days_month × hours_per_day_weekday
                + saturdays_month   × hours_per_day_saturday) × slots_per_hour
active_hours   = capacity_hours × occupancy_rate
gross_revenue  = active_hours  × avg_price_per_hour
```

**Achados:**
- ✅ Modelo Coworking B2B correto — prioridade: `service_plans` > `avg_price_per_hour` > fallback legado
- ✅ `calculate_avg_price_per_hour()` usa média ponderada pelo `mix_pct` de planos (correto)
- ⚠️ **`working_days_month: int = 22` hardcoded em `RevenueInputs`** — campo default no dataclass. Isso é o ponto exato onde D-01 deve ser integrado: substituir o valor padrão pelo `CalendarService.get_effective_days(unit_id, period)` 
- ⚠️ **`saturdays_month: int = 4` hardcoded** — também deve vir do calendário real (alguns meses têm 5 sábados)
- ⚠️ `avg_price_per_hour` retornado no dict do revenue mas é apenas 1 variante (por hora ocupada). D-04 exige 3 variantes — implementar no engine após BE-A sprint

---

### 16.2 — `financial_engine/fixed_costs.py` ✅ Correto (GAPs resolvidos)

**Achados:**
- ✅ GAP-03 resolvido: `pro_labore` NÃO incide `social_charges_rate` (80%) — correto
- ✅ GAP-04 resolvido: `social_charges_rate = 0.80` — encargos sobre CLT corretos
- ✅ GAP-01 resolvido: `utility_costs` usa modelo misto `fixed + variable × occupancy × (1 - automation)` — correto
- ✅ Fallback legado presente (kWh × tarifa) para compatibilidade com seeds antigas
- ⚠️ **Depreciação automática de CAPEX** implementada no `engine.py` mas apenas para `equipment_value` — ausente para `renovation_works` (que também tem `renovation_useful_life_months = 120` no modelo)

**Fórmula de depreciação de obras (ausente):**
```python
# Presente no engine.py para equipamentos:
inp.fixed_costs.depreciation_equipment = capex.equipment_value / capex.equipment_useful_life_months
# Ausente para obras:
# inp.fixed_costs.depreciation_renovation = capex.renovation_works / capex.renovation_useful_life_months
```

---

### 16.3 — `financial_engine/variable_costs.py` ✅ Correto

**Achados:**
- ✅ `hygiene_kit_per_student × active_students` — correto (varia com ocupação)
- ✅ `card_fee_rate × gross_revenue` — correto (3.5% sobre receita)
- ✅ `sales_commission_rate × gross_revenue` — correto
- ⚠️ **`active_students` usado como proxy de horas** — no modelo coworking B2B, `active_students = ceil(active_hours)`. Portanto `hygiene_kit_per_student` na prática é `hygiene_kit_per_hour_sold`. Semanticamente impreciso mas numericamente aceitável se o usuário calibrar o valor por hora.

---

### 16.4 — `financial_engine/kpi.py` ✅ Correto

**Fórmulas verificadas:**
```python
break_even_revenue      = total_fixed_costs / (1 - var_pct - tax_rate)
break_even_occupancy    = break_even_revenue / (capacity_hours × avg_price)
contribution_margin_pct = (revenue - var_costs - taxes) / revenue
ebitda                  = operating_result + equipment_costs   # proxy
```

**Achados:**
- ✅ Breakeven correto matematicamente
- ✅ `cap(1.0)` no `break_even_occupancy_pct` evita valores > 100%
- ⚠️ **`calculate_ebitda()`** usa `operating_result + equipment_costs` como proxy — isso é EBIT + depreciação de equipamentos, mas a depreciação de obras não é somada. Com D-01 (obras tendo depreciação automática), o EBITDA ficará mais preciso.
- ⚠️ **`calculate_teachers_needed()`** usa `weeks_per_month = 4.33` fixo — com D-01, deve usar `effective_working_days / 5` para semanas reais daquele mês

---

### 16.5 — `financial_engine/engine.py` ✅ Correto (com atenções)

**Achados:**
- ✅ `month_fraction` (`frac`) aplicado corretamente no mês de abertura parcial (pro-rata)
- ✅ Pré-operacional: apenas `rent + condo_fee + iptu` — correto
- ✅ Múltiplos contratos de financiamento via `get_multi_contract_payment` — correto
- ⚠️ **`frac` aplicado em `total_variable_costs` mas os custos fixos NÃO escalam com `frac`** — custos fixos são independentes de ocupação no mês parcial. Correto ou intencional? Aluguel e folha de um mês de abertura em meados do mês podem ser proporcionais. Verificar se é o comportamento desejado (está explícito em comentário no código como `frac = month_fraction`).
- ⚠️ **Depreciação de obras ausente** (confirmado — ver 16.2)
- ✅ `avg_price_per_hour` NÃO é ajustado por `frac` — correto (preço/hora não escala com dias)

---

### 16.6 — `financial_engine/consolidator.py` ⚠️ Parcial

**Achados:**
- ✅ Agrega por `(period_date, metric_code)` com `defaultdict(float)` — somagem correta
- ✅ `CONSOLIDATED_METRICS` inclui todos os somáveis relevantes
- ✅ `DERIVED_METRICS` separados (não somados, recalculados no dashboard) — correto
- 🔴 **Consolidação usa apenas versões `status = 'published'`** — versões `draft` ou `planning` são ignoradas silenciosamente. Se uma unidade tem apenas versão `draft`, ela não aparece no consolidado sem aviso.
- 🔴 **Sem `line_item_code` canônico para DRE consolidada** — D-03 exige novo endpoint `/dre/consolidated` que agrega por `code` da `LineItemDefinition`. O `consolidator.py` atual agrega KPIs de dashboard, não linhas de DRE.
- ⚠️ **Limpa e recria todo o consolidado** a cada execução (`DELETE + INSERT`) — correto mas ineficiente se executado com frequência. Sem transação explícita visível neste arquivo (depende do caller).

---

### 16.7 — `financial_engine/expander.py` ✅ Correto

**Achados:**
- ✅ `expand_compound_growth()`: `base × (1 + rate)^(year - base_year)` — correto
- ✅ `expand_curve()`: respeita `opening_year` para unidades futuras (Ano 0 da curva = ano de abertura) — correto e bem pensado
- ✅ `expand_annual_step()`: fallback `last_known` — correto
- ⚠️ **Sem validação de `sum(mix_pct) == 1.0`** para `ServicePlanMix` — se o usuário configurar mix desbalanceado (ex: Bronze 40% + Prata 40% = 80%), a receita será subestimada silenciosamente. Recomenda normalizar ou validar no schema.

---

### 16.8 — Modelos ORM — `unit.py`, `assumption.py`, `line_item.py`

**`unit.py` ✅ Correto:**
- ✅ `opening_date: Date | None` presente (suporte a roadmap editável — Q-E)
- ✅ `slots_per_hour`, `hours_open_weekday`, `hours_open_saturday` presentes
- ✅ `city`, `state`, `area_m2` presentes (suporte a calendário municipal — D-01)
- ⚠️ **Sem campo `timezone`** — relevante para unidades em estados com horário diferente; feriados municipais dependem da cidade/estado
- ⚠️ **Sem campo `working_days_config`** ou FK para `monthly_calendar_summary` — a integração com D-01 requer FK ou serviço de lookup

**`line_item.py` ✅ Bem modelado:**
- ✅ `LineItemCategory` inclui: revenue, fixed_cost, variable_cost, financial_cost, capex, tax, staffing, utility, benefit, occupancy, financing, result — completo
- ✅ `indent_level` presente — suporta hierarquia visual na DRE (sub-itens)
- ✅ `is_kpi`, `is_subtotal`, `is_visible` — controles de exibição presentes
- ⚠️ Sem campos `is_summable` e `is_derived` explícitos — o `consolidator.py` usa listas hardcoded (`CONSOLIDATED_METRICS`, `DERIVED_METRICS`). Seria mais robusto ter esse controle no modelo.

**`assumption.py` ✅:**
- ✅ `growth_rule` (JSON) presente para expansão via `expander.py`
- ✅ `applies_to` (business/unit/scenario/version) — hierarquia correta
- ✅ `source_type` (manual/imported/derived) — rastreabilidade boa

---

### 16.9 — Sidebar: Validação do Doc vs Código (§2.1 + §5.1 + §15.7)

**Status atual do `Sidebar.tsx` (código lido integralmente):**

| Item documentado no §5.1 | Implementado? |
|---|---|
| Seletor de negócio como `<button>` customizado (não `<select>`) | 🔴 NÃO — ainda é `<select>` |
| Labels de seção (ANÁLISE, UNIDADES, ORÇAMENTO, SISTEMA) | 🔴 NÃO — lista plana de 9 itens |
| Sub-menus expandem ao hover/click (não apenas quando na rota) | 🔴 NÃO — apenas quando `active` |
| Largura `w-60` (240px) | 🔴 NÃO — ainda `w-56` (224px) |
| Item ativo: `border-l-2 border-atlas-teal` | 🔴 NÃO — `bg-brand-600 text-white` (ok estéticamente mas diferente do plano) |
| Font `text-[11px]` no select | ✅ SIM — confirmado problemático |
| Gradiente navy `#1E2A44 → #111827` | ✅ SIM — correto |
| Avatar do usuário com `bg-brand-600` | ✅ SIM |

**Conclusão:** O `Sidebar.tsx` documentado em §5.1 está **completamente a implementar** — o código atual é o estado anterior, não o plano. A implementação FE-A-04 precisa reescrever o componente do zero com a nova estrutura.

---

### 16.10 — Sumário de Gaps Remanescentes do Backend

| Gap | Descrição | Bloqueado por |
|---|---|---|
| **GAP-CALENDAR** | `working_days_month = 22` hardcoded em `RevenueInputs` | D-01 (BE-A-01 a BE-A-05) |
| **GAP-DEPR-OBRAS** | Depreciação de `renovation_works` ausente no engine | Simples — corrigir em `engine.py` |
| **GAP-DRE-CONSOL** | `/dre/consolidated` não existe | D-03 (BE-B-01) |
| **GAP-AVG-PRICE-3** | Apenas 1 variante de `avg_price_per_hour` | D-04 (BE-B-02/03) |
| **GAP-MIX-VALID** | Sem validação de `sum(mix_pct) == 1.0` | Simples — adicionar no schema |
| **GAP-DRAFT-WARN** | Consolidado silenciosamente exclui versões `draft` | Adicionar aviso no response |
| **GAP-TEACHERS-CAL** | `weeks_per_month = 4.33` fixo em `calculate_teachers_needed()` | D-01 integração |
