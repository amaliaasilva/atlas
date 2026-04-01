# Atlas Finance — Plano de Cobertura CRUD: Edição e Exclusão de Entidades

> **Auditoria:** 01/04/2026 · Branch `main`  
> **Escopo:** Backend (endpoints) × Frontend (api.ts) × UI (pages) × Consistência de dados  
> **Status da auditoria:** completo — todas as 9 entidades mapeadas em 3 camadas

---

## Sumário Executivo

O sistema possui criação e leitura (GET/POST) completas para todas as entidades. O que falta é **edição com UI** e **exclusão** em quase todos os recursos principais. Além das lacunas, foram encontradas **5 inconsistências lógicas** que precisam ser corrigidas junto com a cobertura CRUD.

---

## 1. Mapa de Cobertura Atual (estado real em 01/04/2026)

### 1.1 Backend — Endpoints por entidade

| Entidade | GET list | GET by ID | POST (criar) | PATCH (editar) | DELETE (excluir) |
|----------|----------|-----------|--------------|----------------|------------------|
| Organization | ✅ | ✅ | ✅ | ✅ | ❌ (sem endpoint) |
| Business | ✅ | ✅ | ✅ | ✅ | ❌ (sem endpoint) |
| Unit | ✅ | ✅ | ✅ | ✅ | ❌ (sem endpoint) |
| Scenario | ✅ | ✅ | ✅ | ✅ | ❌ (sem endpoint) |
| BudgetVersion | ✅ | ✅ | ✅ | ✅ | ❌ (tem `/archive` mas não DELETE) |
| FinancingContract | ✅ | ✅ | ✅ | ✅ | ✅ (hard delete) |
| ServicePlan | ✅ | ✅ | ✅ | ✅ | ✅ (hard delete) |
| User | ✅ | ✅ (`/me`) | ✅ | ✅ | ❌ (sem endpoint) |
| AssumptionCategory | ✅ | ❌ | ✅ | ❌ | ❌ |
| AssumptionDefinition | ✅ | ❌ | ✅ | ✅ | ❌ |

### 1.2 Frontend — Métodos em `api.ts`

| Objeto API | list | get | create | update | delete |
|------------|------|-----|--------|--------|--------|
| `organizationsApi` | ✅ | ✅ | ✅ | ⚠️ usa `PUT` (BE só tem `PATCH`) | ❌ |
| `businessesApi` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `unitsApi` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `scenariosApi` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `versionsApi` | ✅ | ✅ | ✅ | ❌ (tem publish/archive/clone) | ❌ |
| `servicePlansApi` | ✅ | ❌ | ✅ | ✅ | ✅ |
| `financingContractsApi` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `assumptionsApi` | ✅ | ❌ | ❌ (só quick-add) | ✅ (def.) | ❌ |
| `usersApi` | ✅ | ❌ | ✅ | ❌ | ❌ |

### 1.3 UI — Ações por tela

| Tela (`/app/(auth)/`) | Criar | Editar | Excluir | Arquivar |
|-----------------------|-------|--------|---------|----------|
| `businesses/` | ✅ Modal | ❌ | ❌ | ❌ |
| `scenarios/` | ✅ Modal | ❌ | ❌ | ❌ |
| `units/` | ✅ Modal | ✅ Modal (completo) | ❌ | ❌ |
| `budget/` (lista) | ✅ Modal | ❌ (só opening_date inline) | ❌ | ❌ |
| `budget/[versionId]/` | — | ✅ Premissas/contratos | ❌ rascunho | ✅ `/archive` |
| `settings/` | ❌ plano | ✅ Modal inline (ServicePlan) | ❌ | ❌ |

---

## 2. Inconsistências Lógicas Encontradas

Estas são **bugs ou incoerências** que precisam ser corrigidas independentemente da cobertura de CRUD.

### INC-01 · `organizationsApi.update` usa `PUT` mas backend só tem `PATCH`
**Arquivo:** `frontend/src/lib/api.ts` linha 36  
**Problema:** O método chama `api.put(...)` mas o endpoint é `PATCH /organizations/{id}`. Uma chamada real retornaria `405 Method Not Allowed`.  
**Impacto:** A única tela que edita organizações (settings futuro) quebraria.  
**Correção:** Trocar para `api.patch`.

### INC-02 · `ServicePlan.delete` é hard delete, `Scenario/Business/Organization` usam `is_active`
**Arquivos:** `service_plans.py` linha 110, `financing_contracts.py` linha 99  
**Problema:** `FinancingContract` e `ServicePlan` usam `db.delete(p)` (remoção física do banco). Todas as outras entidades usam soft-delete via `is_active = False`. Isso cria duas estratégias de exclusão no mesmo sistema.  
**Impacto:** Planos de serviço deletados não aparecem no audit log, perdem-se históricos de preço/mix.  
**Correção:** Padronizar — ServicePlan e FinancingContract devem setar `is_active = False` + registrar em `AuditLog`.  
**Exceção razoável:** FinancingContract é um detalhe de versão de orçamento; hard delete pode ser aceitável, mas deve ao menos registrar AuditLog antes de deletar.

### INC-03 · `BudgetVersion.archive` não seta `is_active = False`
**Arquivo:** `budget_versions.py` linhas 136–145  
**Problema:** O endpoint `/archive` apenas seta `status = "archived"`. Porém, `list_budget_versions` filtra por `is_active == True`. Isso significa que versões arquivadas **continuam aparecendo** nas listagens se `is_active` já era `True`.  
**Impacto:** Versões arquivadas aparecem no `/budget` ao lado de rascunhos e publicadas.  
**Correção:** Decisão arquitetural necessária:  
  - Opção A: `archive` seta `is_active = False` (desaparece das listas).  
  - Opção B: `list_budget_versions` filtra `status != "archived"` em vez de `is_active`.  
  - **Recomendação:** Opção B é mais segura (archive é um estado de transição, não deleção).

### INC-04 · `Scenario.budget_versions` tem FK `ondelete="RESTRICT"` mas não há DELETE endpoint ainda
**Arquivo:** `backend/app/models/budget_version.py` linha 32  
**Problema:** A FK `scenario_id` está definida com `ondelete="RESTRICT"`. Se um endpoint `DELETE /scenarios/{id}` for criado sem tratamento adequado, a exclusão vai lançar `IntegrityError` se houver versões de orçamento associadas.  
**Impacto:** Crash silencioso ou 500 sem mensagem clara para o usuário.  
**Correção:** Ao implementar DELETE de cenário, verificar existência de `BudgetVersion` associadas e retornar `409 Conflict` com mensagem explicativa, ou oferecer exclusão em cascata com confirmação extra.

### INC-05 · `Unit` não tem campo `is_active` mas lista não filtra por ele
**Arquivo:** `backend/app/api/v1/endpoints/units.py` linha 18, `backend/app/models/unit.py`  
**Problema:** Todas as outras entidades têm `is_active` e o endpoint de listagem filtra por `is_active == True`. A `Unit` não tem esse campo — usa `status` como substituto (há `UnitStatus.closed`). Porém `list_units` não filtra por status closed automaticamente.  
**Impacto:** Unidades `closed` aparecem nas listagens de criação de versão.  
**Correção:** A lógica do frontend já filtra `u.status !== 'closed'` em `budget/page.tsx` e `budget/CreateVersionModal`. O backend também deveria refletir isso ou documentar explicitamente que o filtro é responsabilidade do chamador.

### INC-06 · `versionsApi` não tem método `.update()` para campos básicos
**Arquivo:** `frontend/src/lib/api.ts`  
**Problema:** O backend tem `PATCH /budget-versions/{id}` funcional, mas o `versionsApi` no frontend expõe apenas `publish`, `archive` e `clone`. Não é possível editar nome ou notas de uma versão pela UI.  
**Impacto:** Versões criadas com nome errado não podem ser renomeadas sem acessar o banco diretamente.  
**Correção:** Adicionar `update: (id, data) => api.patch(\`/budget-versions/${id}\`, data)` ao `versionsApi`.

---

## 3. Plano de Implementação por Prioridade

### Critérios de prioridade
- **P0** = quebra funcional / bug já causando erro silencioso
- **P1** = funcionalidade crítica ausente (necessária para uso cotidiano)
- **P2** = funcionalidade importante mas com workaround razoável
- **P3** = refinamento / melhor UX sem impacto funcional direto

---

### P0 — Correções de Inconsistência (sem sprint, fazer já)

#### P0.1 · Corrigir `organizationsApi.update` de PUT para PATCH
**Camadas:** Frontend `api.ts`  
**Esforço:** 1 linha  
```ts
// De:
api.put<Organization>(`/organizations/${id}`, data)
// Para:
api.patch<Organization>(`/organizations/${id}`, data)
```

#### P0.2 · Corrigir listagem de BudgetVersion com status=archived
**Camadas:** Backend `budget_versions.py`  
**Esforço:** 1 linha no `list_budget_versions`  
```python
# Adicionar filtro:
q = q.filter(BudgetVersion.status != "archived")
# (além do is_active == True já existente)
```
**Ou** tornar o filtro de status parametrizável: `?include_archived=false` (default).

#### P0.3 · Adicionar `versionsApi.update()` ao api.ts
**Camadas:** Frontend `api.ts`  
**Esforço:** 2 linhas

---

### P1 — Exclusão e Edição de Cenários (relatado como bug)

**Entidade:** `Scenario`

#### P1.1 · Backend: `DELETE /scenarios/{id}` (soft-delete)
**Arquivo:** `backend/app/api/v1/endpoints/scenarios.py`  
**Lógica:**
1. Verificar se existem `BudgetVersion` com `scenario_id = id` → se sim, retornar `409` com mensagem clara.
2. Setar `scenario.is_active = False`.
3. Registrar em `AuditLog` (`action = delete`, `entity_type = "scenario"`).
```python
@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: str, db: Session = ..., current_user: User = ...):
    s = db.query(Scenario).filter(Scenario.id == scenario_id, Scenario.is_active == True).first()
    if not s:
        raise HTTPException(404, "Cenário não encontrado")
    # Guardrail: cenário com versões vinculadas → bloquear
    if db.query(BudgetVersion).filter(BudgetVersion.scenario_id == scenario_id, BudgetVersion.is_active == True).count() > 0:
        raise HTTPException(409, "Cenário possui versões de orçamento ativas. Arquive-as primeiro.")
    s.is_active = False
    db.add(AuditLog(entity_type="scenario", entity_id=scenario_id, action=AuditAction.delete, performed_by=current_user.id))
    db.commit()
```

#### P1.2 · Frontend api.ts: adicionar `scenariosApi.update()` e `scenariosApi.delete()`
```ts
update: (id: string, data: Partial<Scenario>): Promise<Scenario> =>
  api.patch<Scenario>(`/scenarios/${id}`, data).then((r) => r.data),
delete: (id: string): Promise<void> =>
  api.delete(`/scenarios/${id}`).then(() => {}),
```

#### P1.3 · UI `/scenarios/page.tsx`: botões Editar e Excluir por cenário
**Componentes a adicionar:**
- **Botão editar** (ícone `Pencil`) ao lado do nome do cenário → abre `EditScenarioModal` inline (campos: nome, tipo, descrição).
- **Botão excluir** (ícone `Trash2`) → abre `ConfirmDeleteModal` com texto de aviso e lista de versões vinculadas se houver.
- **`EditScenarioModal`**: formulário pré-preenchido, usa `scenariosApi.update()`, invalida `['scenarios', businessId]` on success.
- **`ConfirmDeleteModal`** (reutilizável): componente genérico com `title`, `description`, `onConfirm`, `isPending`.

**Fluxo protegido:** Se o cenário tiver versões ativas, o backend retorna 409 → frontend exibe toast de erro explicativo em vez de confirmar.

---

### P1 — Exclusão de Versões de Orçamento (rascunhos)

**Entidade:** `BudgetVersion` (status=`draft`)

#### P1.4 · Backend: `DELETE /budget-versions/{id}` (soft-delete guardado)
**Regra de negócio obrigatória:** Só permite exclusão se `status == "draft"`. Versões publicadas devem ser apenas arquivadas, nunca excluídas.  
```python
@router.delete("/{version_id}", status_code=204)
def delete_budget_version(version_id: str, ...):
    v = db.query(BudgetVersion).filter(BudgetVersion.id == version_id, BudgetVersion.is_active == True).first()
    if not v:
        raise HTTPException(404, "Versão não encontrada")
    if v.status != "draft":
        raise HTTPException(409, "Apenas versões em rascunho podem ser excluídas. Use arquivar para versões publicadas.")
    v.is_active = False
    db.add(AuditLog(..., action=AuditAction.delete, entity_type="budget_version", entity_id=version_id))
    db.commit()
```

#### P1.5 · Frontend api.ts: adicionar `versionsApi.delete()`
```ts
delete: (id: string): Promise<void> =>
  api.delete(`/budget-versions/${id}`).then(() => {}),
```

#### P1.6 · UI `/budget/page.tsx`: botão excluir em versões com status=draft
- Exibir ícone `Trash2` apenas quando `v.status === 'draft'`.
- Abrir `ConfirmDeleteModal` (componente reutilizável do P1.3).
- Após exclusão: invalidar `['versions', unit.id, ...]`.

---

### P2 — Edição e Exclusão de Negócios

**Entidade:** `Business`

#### P2.1 · Backend: `DELETE /businesses/{id}` (soft-delete com guardrail)
**Guardrail:** Bloquear se houver `Unit` com versões ativas vinculadas ao business.  
```python
@router.delete("/{business_id}", status_code=204)
def delete_business(business_id: str, ...):
    b = db.query(Business).filter(Business.id == business_id, Business.is_active == True).first()
    if not b:
        raise HTTPException(404, ...)
    # Contar unidades ativas
    unit_count = db.query(Unit).filter(Unit.business_id == business_id).count()
    if unit_count > 0:
        raise HTTPException(409, f"Negócio possui {unit_count} unidade(s). Exclua-as primeiro.")
    b.is_active = False
    db.add(AuditLog(..., entity_type="business", entity_id=business_id, action=AuditAction.delete))
    db.commit()
```

#### P2.2 · Frontend api.ts: adicionar `businessesApi.update()` e `businessesApi.delete()`
```ts
update: (id: string, data: Partial<Business>): Promise<Business> =>
  api.patch<Business>(`/businesses/${id}`, data).then((r) => r.data),
delete: (id: string): Promise<void> =>
  api.delete(`/businesses/${id}`).then(() => {}),
```

#### P2.3 · UI `/businesses/page.tsx`: botões Editar e Excluir por negócio
- **Botão editar**: `EditBusinessModal` (campos: nome, slug, tipo, descrição).
- **Botão excluir**: `ConfirmDeleteModal` reutilizável.
- Se business tem unidades → BE retorna 409 → FE exibe mensagem de bloqueio.

---

### P2 — Exclusão de Unidades

**Entidade:** `Unit`

**Nota arquitetural:** `Unit` não tem campo `is_active`. O modelo usa `status` (`planning/pre_opening/active/closed`). Para deletar, a abordagem mais coerente com o modelo existente é setar `status = "closed"` + um campo `is_deleted = True` (nova migração), ou reutilizar `status = "closed"` como indicador de exclusão lógica.  
**Decisão recomendada:** Adicionar `is_active: bool = True` ao modelo `Unit` em nova migration para consistência com o restante do sistema.

#### P2.4 · Backend: migração para adicionar `is_active` em `units`
```sql
ALTER TABLE units ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
```

#### P2.5 · Backend: `DELETE /units/{id}` (soft-delete com guardrail)
**Guardrail:** Bloquear se houver `BudgetVersion` ativas vinculadas.  
```python
@router.delete("/{unit_id}", status_code=204)
def delete_unit(unit_id: str, ...):
    unit = db.query(Unit).filter(Unit.id == unit_id, Unit.is_active == True).first()
    if not unit:
        raise HTTPException(404, ...)
    active_versions = db.query(BudgetVersion).filter(
        BudgetVersion.unit_id == unit_id,
        BudgetVersion.is_active == True,
        BudgetVersion.status != "archived"
    ).count()
    if active_versions > 0:
        raise HTTPException(409, f"Unidade possui {active_versions} versão(ões) ativa(s). Arquive-as primeiro.")
    unit.is_active = False
    db.add(AuditLog(..., entity_type="unit", entity_id=unit_id, action=AuditAction.delete))
    db.commit()
```

#### P2.6 · Frontend api.ts: adicionar `unitsApi.delete()`
```ts
delete: (id: string): Promise<void> =>
  api.delete(`/units/${id}`).then(() => {}),
```

#### P2.7 · UI `/units/page.tsx`: botão Excluir por unidade
- Botão `Trash2` em cada linha/card de unidade.
- `ConfirmDeleteModal` reutilizável.
- Se unidade tem versões → BE retorna 409 → FE exibe mensagem de bloqueio.

---

### P2 — Renomeação/Edição de Versões de Orçamento

**Entidade:** `BudgetVersion`

#### P2.8 · UI `/budget/page.tsx` ou `BudgetVersionClient.tsx`: editar nome e notas
- Botão `Pencil` ao lado do nome da versão (na lista `/budget`).
- Modal simples: campos `nome` e `notas`.
- Usa `versionsApi.update()` (adicionado em P0.3).

---

### P3 — Exclusão de Organização

**Entidade:** `Organization`

**Contexto:** Entidade de mais alto nível da árvore. Exclusão em cascata afeta tudo embaixo (businesses → units → versions → results). Operação de altíssimo impacto.

#### P3.1 · Backend: `DELETE /organizations/{id}` (soft-delete com guardrail máximo)
**Guardrail obrigatório:** Bloquear se houver qualquer `Business` ativo.  
```python
@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: str, ...):
    # Exige superuser
    if not current_user.is_superuser:
        raise HTTPException(403, "Apenas administradores podem excluir organizações")
    org = db.query(Organization).filter(Organization.id == org_id, Organization.is_active == True).first()
    if not org:
        raise HTTPException(404, ...)
    biz_count = db.query(Business).filter(Business.organization_id == org_id, Business.is_active == True).count()
    if biz_count > 0:
        raise HTTPException(409, f"Organização possui {biz_count} negócio(s) ativo(s). Exclua-os primeiro.")
    org.is_active = False
    db.add(AuditLog(..., entity_type="organization", entity_id=org_id, action=AuditAction.delete, performed_by=current_user.id))
    db.commit()
```

#### P3.2 · Frontend api.ts: adicionar `organizationsApi.delete()`
```ts
delete: (id: string): Promise<void> =>
  api.delete(`/organizations/${id}`).then(() => {}),
```

#### P3.3 · UI: botão exclusão apenas para superuser
- Visível apenas se `user.is_superuser === true`.
- Exige confirmação dupla (digitar o nome da organização para confirmar).

---

### P3 — Exclusão de Usuário

**Entidade:** `User`

#### P3.4 · Backend: `DELETE /users/{id}`
**Regra:** Apenas superuser pode excluir. Não pode excluir a si mesmo.  
```python
@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = ..., current_user: User = Depends(require_superuser)):
    if user_id == current_user.id:
        raise HTTPException(400, "Não é possível excluir o próprio usuário")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, ...)
    # Soft-delete: is_active = False (campo já presente no User model?)
    # Se não houver is_active no User, usar hard delete com cautela
    db.delete(user)
    db.commit()
```

**Nota:** Verificar se `User` model tem `is_active` antes de implementar.

---

### P3 — Gestão Completa de Planos de Serviço (ServicePlan)

**Contexto:** A tela `/settings` já tem edição de planos, mas falta criar e excluir pela UI.

#### P3.5 · UI `/settings/page.tsx`: botão criar novo plano e botão excluir
- Criar: modal com campos nome, preço/hora, mix%, min/max aulas.
- Excluir: `ConfirmDeleteModal` com aviso sobre impacto no motor financeiro.
- **Atenção:** o backend já valida `Σ(target_mix_pct) == 1.0` no PATCH — ao excluir um plano, o mix dos restantes ficará < 1.0, o que quebrará os cálculos. A UI deve alertar sobre isso.

#### P3.6 · Corrigir hard delete de ServicePlan para incluir AuditLog
**Arquivo:** `backend/app/api/v1/endpoints/service_plans.py`  
Registrar `AuditLog` antes de `db.delete(p)`.

---

## 4. Componente Reutilizável: `ConfirmDeleteModal`

**Localização sugerida:** `frontend/src/components/ui/ConfirmDeleteModal.tsx`

```tsx
interface ConfirmDeleteModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  confirmLabel?: string;       // default: "Excluir"
  warningItems?: string[];     // lista de impactos/dependências
}
```

Este componente deve ser criado **antes** dos outros itens P1–P3 para evitar duplicação de código nos modais de confirmação.

---

## 5. Regras Transversais (aplicar em todos os endpoints de DELETE)

### 5.1 Authorization
- `PATCH` e `DELETE` de qualquer entidade devem verificar que o usuário tem acesso à organização da entidade.  
- Atualmente os endpoints apenas checam autenticação (`get_current_user`) mas não checam `organization_id` do usuário.  
- **Risco:** Usuário de Org A poderia excluir cenários da Org B se conhecer o UUID.  
- **Correção mínima:** Em cada DELETE, verificar que a entidade pertence à organização do `current_user`.

### 5.2 AuditLog obrigatório
- Todo DELETE (inclusive soft-delete) deve criar um registro em `AuditLog` com `action = AuditAction.delete`.
- Campos obrigatórios: `entity_type`, `entity_id`, `performed_by`, `notes` (com nome da entidade deletada para legibilidade).

### 5.3 Padrão de resposta de erro para 409
Padronizar mensagem de erro quando exclusão é bloqueada por dependências:
```json
{
  "detail": "Cenário possui 3 versão(ões) de orçamento ativa(s). Arquive-as primeiro antes de excluir o cenário."
}
```
O frontend deve exibir esse `detail` diretamente no toast/modal de erro (não uma mensagem genérica).

### 5.4 Invalidação de cache no frontend
Após qualquer DELETE bem-sucedido, invalidar:
- A query-key da **lista** da entidade excluída.
- A query-key de entidades **dependentes** (ex.: excluir cenário → invalidar `['versions']`, `['scenarios', businessId]`).
- O `useNavStore` se a entidade excluída for a atualmente selecionada (ex.: excluir o cenário ativo deve resetar `navStore.scenarioId`).

---

## 6. Sequência de Implementação Recomendada

```
Semana 1 — P0 (inconsistências críticas, ~2h)
├── P0.1  Fix PUT→PATCH em organizationsApi
├── P0.2  Fix listagem de BudgetVersion filtrando archived
└── P0.3  Adicionar versionsApi.update()

Semana 1-2 — Componente base (~3h)
└── Criar ConfirmDeleteModal reutilizável

Semana 2 — P1 Cenários (~4h)
├── P1.1  BE: DELETE /scenarios/{id}
├── P1.2  FE: scenariosApi.update() + scenariosApi.delete()
└── P1.3  UI: EditScenarioModal + botões na /scenarios

Semana 2 — P1 Versões de Orçamento (~3h)
├── P1.4  BE: DELETE /budget-versions/{id} (draft only)
├── P1.5  FE: versionsApi.delete()
└── P1.6  UI: botão excluir em /budget para drafts

Semana 3 — P2 Negócios (~3h)
├── P2.1  BE: DELETE /businesses/{id}
├── P2.2  FE: businessesApi.update() + businessesApi.delete()
└── P2.3  UI: EditBusinessModal + botões na /businesses

Semana 3 — P2 Unidades (~4h — inclui migration)
├── P2.4  Migration: is_active em units
├── P2.5  BE: DELETE /units/{id}
├── P2.6  FE: unitsApi.delete()
└── P2.7  UI: botão excluir em /units

Semana 3 — P2 Renomear Versões (~1h)
└── P2.8  UI: modal editar nome/notas de BudgetVersion

Semana 4 — P3 Organização, Usuário, ServicePlan (~4h total)
├── P3.1–P3.3  DELETE organization (superuser only)
├── P3.4        DELETE user (superuser only)
└── P3.5–P3.6  UI criar/excluir ServicePlan + AuditLog no hard delete
```

**Tempo total estimado:** ~24h de desenvolvimento  
**Esforço de testes:** ~8h (unitários backend + UI manual)

---

## 7. Checklist de Validação por Feature

Para cada item implementado, validar:

- [ ] Backend: endpoint retorna status HTTP correto (204 para delete, 409 para conflito, 404 para não encontrado)
- [ ] Backend: `AuditLog` criado no banco com campos corretos
- [ ] Backend: soft-delete — entidade não retorna mais em listagens após exclusão
- [ ] Backend: guardrail de dependências testado (tentar excluir com filhos ativos → 409)
- [ ] Frontend: `api.ts` — método implementado e tipado corretamente
- [ ] Frontend: UI — botão só aparece quando permitido (ex: delete de draft só se status=draft)
- [ ] Frontend: toast de sucesso e de erro com mensagens claras
- [ ] Frontend: query cache invalidado corretamente após ação
- [ ] Frontend: `navStore` resetado se entidade ativa for excluída
- [ ] Autorização: usuário de Org A não consegue excluir dados da Org B
