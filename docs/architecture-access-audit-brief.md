# Atlas Finance — Brief Final de Arquitetura
## Identidade, Acesso, Auditoria e Trilha de Cálculo

**Versão:** 1.0  
**Data:** 19/03/2026  
**Status:** Decisão pendente — não implementar antes de fechar os três pontos em aberto  
**Contexto:** Consolidação da vistoria arquitetural com refinamentos conceituais antes da execução

---

## 1. DIAGNÓSTICO CONFIRMADO

Os pontos abaixo foram verificados por leitura direta do código e estão confirmados. Não há ambiguidade.

| # | Diagnóstico | Camada afetada | Severidade |
|---|---|---|---|
| 1 | O sistema autentica, mas praticamente não autoriza por escopo | Backend — todos os endpoints | 🔴 Crítico |
| 2 | `user_roles` existe no modelo ORM mas não governa nenhuma decisão real | Backend — `deps.py` | 🔴 Crítico |
| 3 | Qualquer usuário autenticado acessa qualquer business, unit, version, premissa e resultado via API | Backend — todos os endpoints de dados | 🔴 Crítico |
| 4 | Os conceitos "Investidor" e "Anjo" não existem em nenhuma camada — nem de dados, nem de código | Backend + Frontend | 🔴 Crítico |
| 5 | `audit_logs` está modeled mas nunca é escrito — nenhum endpoint faz INSERT | Backend — services | 🟠 Alto |
| 6 | `calculation_trace` em `CalculatedResult` existe como coluna JSON, mas permanece `NULL` — a engine não o popula | Backend — engine financeiro | 🟠 Alto |
| 7 | Frontend: sidebar estática, filtros de contexto sem restrição de escopo, middleware protege apenas autenticação | Frontend | 🟠 Alto |
| 8 | Esconder itens de menu não substitui enforcement real no backend | Arquitetura geral | Princípio inegociável |

**Conclusão do diagnóstico:** O Atlas é hoje *multi-tenant estrutural*, não *multi-tenant seguro*. A estrutura de dados foi projetada para suportar acesso granular, mas a camada de enforcement nunca foi construída.

---

## 2. TRÊS CORREÇÕES CONCEITUAIS ANTES DE CODAR

Antes de qualquer implementação, três definições precisam ser fechadas. Executar antes disso é construir sobre fundação errada.

---

### 2.1 — Decisão de Arquitetura de Autenticação com Firebase

Este é o ponto de maior risco de retrabalho. O sistema atual usa **email/senha → JWT próprio (HS256, apenas `sub` + `exp`)**. A decisão de migrar para Firebase Google Auth ainda não foi tomada em código.

Existem dois modelos possíveis e eles impactam toda a camada de autorização:

#### Opção Auth-1 — Frontend autentica com Firebase → backend valida o Firebase ID Token diretamente

```
[Browser] → Google OAuth → Firebase SDK → ID Token (JWT do Google)
[Browser] → POST /api/resource com Header: Authorization: Bearer <firebase_id_token>
[Backend] → verifica assinatura do Firebase ID Token via firebase-admin SDK
[Backend] → extrai uid, email, claims do token
[Backend] → busca ou cria User local por email/uid
```

**Prós:** simples, sem estado extra, claims do Firebase podem carregar roles customizadas via Custom Claims  
**Contras:** backend precisa do firebase-admin SDK e acesso à chave de serviço GCP; renovação do token é gerenciada pelo Firebase (1h)

---

#### Opção Auth-2 — Frontend autentica com Firebase → backend troca por JWT próprio do Atlas

```
[Browser] → Google OAuth → Firebase SDK → ID Token
[Browser] → POST /auth/firebase-exchange { firebase_token }
[Backend] → valida Firebase ID Token
[Backend] → cria JWT Atlas com { sub, role, scope, exp }
[Browser] → usa JWT Atlas para todas as chamadas subsequentes
```

**Prós:** JWT do Atlas pode carregar escopo/roles sem validar Firebase a cada request; desacopla do Firebase em runtime  
**Contras:** requer o endpoint de troca; dois tokens em jogo

---

#### ⚠️ Decisão obrigatória antes de implementar RBAC

Não importa qual opção for escolhida — o que importa é que **esta decisão precede qualquer trabalho em `/me`, roles, guards e enforcement de escopo**, porque eles dependem de saber de onde vem a identidade e como ela é verificada a cada request.

**Recomendação:** Opção Auth-2 é mais segura para evolução do sistema. O JWT Atlas pode ser enriquecido com escopo sem demandar round-trip ao Firebase a cada request. Mas ambas são válidas — o que não é válido é deixar em aberto enquanto se constrói o RBAC.

---

### 2.2 — Qual é a Menor Unidade de Autorização do Atlas?

A vistoria original sugeriu adicionar `unit_id` ao `user_roles`. Isso pode ser correto — mas só depois de responder esta pergunta:

> **Qual é o menor objeto de acesso que o sistema precisa controlar?**

As opções são:

| Granularidade | Significado | Quando faz sentido |
|---|---|---|
| **Organization** | usuário vê tudo dentro de uma org | Multi-empresa com isolamento total por org |
| **Business** | usuário vê tudo dentro de um business | Anjo controla um negócio inteiro |
| **Unit** | usuário vê apenas unidades específicas | Anjo gerencia só algumas unidades de um business |
| **Version** | usuário vê apenas certas versões de orçamento | Auditor externo com acesso pontual |

**Para o caso atual do Atlas (cowork fitness, múltiplas unidades, Investidor + Anjo):**

Uma hipótese razoável que precisa ser confirmada antes de modelar:

- **Investidor** vê um portfólio explícito de businesses (não necessariamente toda a organização)
- **Anjo** vê um business inteiro **OU** um subset de unidades dentro de um business

Se a segunda parte for verdadeira (Anjo pode ter visão parcial dentro de um business), então `unit_id` em `user_roles` faz sentido. Se Anjo sempre vê o business inteiro, `business_id` é suficiente.

**Esta resposta deve vir do produto, não da arquitetura.** A arquitetura só modela o que o produto define.

---

### 2.3 — Portfólio e Acesso Explícito: Investidor não é "vê tudo"

Este é o ponto mais sensível. A solução mais simples — e mais errada — seria dizer:

> "Investidor = `is_superuser` ou `org_admin` → vê tudo na organização."

Isso funciona enquanto há um único Investidor e uma única organização. Assim que houver dois Investidores com portfólios diferentes, o modelo quebra.

**O modelo correto é:** o Investidor tem um portfólio explícito de businesses. Não existe "vê tudo" como padrão — existe "vê o que foi concedido".

Isso implica em uma tabela ou mecanismo de grants de acesso explícito:

```
user_business_access (ou portfolio_businesses)
  - user_id
  - business_id
  - access_level: "read" | "write" | "admin"
  - granted_by
  - granted_at
```

**Diferença crítica:**
- `profile_type = investor` é um atributo de UX/persona — serve para personalizar a interface
- `user_business_access` é a espinha dorsal da autorização — determina o que o backend retorna

`profile_type` **não deve ser** a fonte de verdade da autorização. Um Investidor sem nenhuma entrada em `user_business_access` não deve ver nada. Um Anjo com duas entradas vê dois businesses.

---

## 3. SEPARAÇÃO CONCEITUAL FUNDAMENTAL

Antes de qualquer código de RBAC, a equipe precisa compartilhar este mapa mental:

```
┌─────────────────────────────────────────────┐
│            IDENTIDADE (Autenticação)         │
│  "Quem é você?"                              │
│  → Firebase ID Token ou JWT Atlas            │
│  → user.id, email, full_name                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         PAPEL FUNCIONAL (Role)               │
│  "O que você pode fazer?"                    │
│  → super_admin, org_admin, analyst, viewer   │
│  → governa ações (criar, publicar, arquivar) │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         ESCOPO DE DADOS (Access Scope)       │
│  "Sobre o que você pode agir?"               │
│  → user_business_access (portfólio)          │
│  → user_unit_access (se granularidade unit)  │
│  → governa quais registros o backend retorna │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         PERSONA DE UX (Profile Type)         │
│  "Como a interface se apresenta para você?"  │
│  → investor, angel, admin                    │
│  → governa sidebar, filtros, painéis         │
│  → NÃO governa o que o backend retorna       │
└─────────────────────────────────────────────┘
```

Misturar qualquer uma dessas camadas cria dívida e vulnerabilidade.

---

## 4. MODELO DE DADOS PROPOSTO (revisado)

### 4.1 — Adições ao modelo User

```python
class User(Base, TimestampMixin):
    # ... campos existentes ...
    profile_type: str  # "investor" | "angel" | "admin"
    # profile_type é UX/persona — não é a fonte de autorização
```

### 4.2 — Tabela de Acesso Explícito a Businesses

```python
class UserBusinessAccess(Base):
    __tablename__ = "user_business_access"
    
    id: str
    user_id: str          # FK → users
    business_id: str       # FK → businesses
    access_level: str      # "read" | "write" | "admin"
    granted_by: str | None # FK → users (quem concedeu)
    granted_at: datetime
    expires_at: datetime | None
    # Sem expires_at = acesso permanente até revogar
```

### 4.3 — Tabela de Acesso a Unidades (só se necessário)

```python
class UserUnitAccess(Base):
    __tablename__ = "user_unit_access"
    
    id: str
    user_id: str
    unit_id: str           # FK → units
    access_level: str
    granted_by: str | None
    granted_at: datetime
```

> **Só criar `user_unit_access` se confirmado que a menor unidade de autorização é a Unit.**  
> Se for o Business, essa tabela é prematura.

### 4.4 — `user_roles` existente

Mantém o papel: continua representando o **papel funcional** (o que pode fazer), não o escopo (sobre o que pode agir). Os dois coexistem e têm responsabilidades distintas.

### 4.5 — `UserOut` enriquecido

```python
class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    status: str
    is_superuser: bool
    profile_type: str                    # investor | angel | admin
    accessible_business_ids: list[str]   # derivado de user_business_access
    roles: list[str]                     # derivado de user_roles
    created_at: datetime
```

---

## 5. FUNÇÃO DE ENFORCEMENT DE ESCOPO (Backend)

```python
# app/core/authorization.py

def get_accessible_business_ids(user: User, db: Session) -> list[str]:
    """
    Retorna os IDs dos businesses que o usuário pode acessar.
    Fonte de verdade: user_business_access.
    super_admin pode acessar tudo (sem entradas necessárias).
    """
    if user.is_superuser:
        return [b.id for b in db.query(Business).filter(Business.is_active == True).all()]
    
    rows = (
        db.query(UserBusinessAccess.business_id)
        .filter(UserBusinessAccess.user_id == user.id)
        .all()
    )
    return [r.business_id for r in rows]


def require_business_access(
    business_id: str,
    user: User,
    db: Session,
    min_level: str = "read",
) -> None:
    """
    Levanta 403 se o usuário não tem acesso ao business.
    Usar em todos os endpoints que recebem business_id como parâmetro.
    """
    if user.is_superuser:
        return
    access = (
        db.query(UserBusinessAccess)
        .filter(
            UserBusinessAccess.user_id == user.id,
            UserBusinessAccess.business_id == business_id,
        )
        .first()
    )
    if not access:
        raise HTTPException(status_code=403, detail="Acesso negado a este negócio")
```

Todos os endpoints que hoje recebem `business_id` (diretamente ou via join) precisam chamar `require_business_access` antes de qualquer query de dados.

---

## 6. EIXO DE AUDITORIA — ESTADO E PLANO

### 6.1 — O que existe e o que está oco

| Elemento | Estado | Observação |
|---|---|---|
| Tabela `audit_logs` | Modelada ✅ | Nunca escrita |
| `AuditAction` enum | Modelado ✅ | create, update, delete, publish, archive, import_data, recalculate |
| `old_value` / `new_value` JSON | Modelado ✅ | Nunca preenchido |
| `calculation_trace` em `CalculatedResult` | Coluna existe ✅ | Engine não escreve |
| `source_type` em `AssumptionValue` | Existe ✅ | manual / imported / derived |
| `updated_by` em `AssumptionValue` | Existe ✅ | FK para users |
| `ImportMapping` (rastreio de célula→campo) | Existe ✅ | Bem modelado |
| Histórico de `AssumptionValue` (before/after) | Ausente ❌ | UPDATE sobrescreve o valor |
| Audit service que escreve eventos | Ausente ❌ | Nenhum endpoint chama |
| Endpoint `GET /audit/` com filtro de escopo | Parcial ⚠️ | Existe mas sem filtro por business |

### 6.2 — O que uma trilha de cálculo completa precisa mostrar

```
AssumptionValue X foi alterado:
  ├── Quem:     updated_by → user.full_name   ← JÁ EXISTE
  ├── Quando:   updated_at                    ← JÁ EXISTE
  ├── Antes:    old_value                     ← PRECISA audit_log
  ├── Depois:   new_value                     ← PRECISA audit_log
  ├── Contexto: budget_version → unit → scenario → business
  ├── Recálculo disparado?                    ← PRECISA audit_log (action=recalculate)
  └── Outputs impactados:
        CalculatedResult onde version_id = X  ← PRECISA calculation_trace populado
```

### 6.3 — O que `calculation_trace` deve conter (por entry em CalculatedResult)

```json
{
  "engine_version": "1.0",
  "calculated_at": "2026-03-19T10:00:00Z",
  "period": "2026-08",
  "inputs": {
    "taxa_ocupacao": 0.45,
    "alunos_capacidade_maxima": 200,
    "ticket_medio_plano_mensal": 199.90
  },
  "steps": [
    { "name": "active_students", "formula": "max_students * occupancy_rate", "result": 90 },
    { "name": "membership_revenue", "formula": "active_students * weighted_avg_ticket", "result": 17370.0 },
    { "name": "gross_revenue", "formula": "membership_revenue + pt_revenue + other_revenue", "result": 23370.0 }
  ],
  "source_refs": {
    "taxa_ocupacao": { "source_type": "imported", "import_job_id": "abc-123" }
  }
}
```

---

## 7. OPÇÕES DE IMPLEMENTAÇÃO — REVISADAS

### Eixo Investidor / Anjo

#### Opção A — Paliativa (descartada)
Usar `is_superuser` como proxy de Investidor. Não escala. Não modelar.

#### Opção B — Correta para MVP ✅ (com refinamento)

Esta é a direção. Com os ajustes:

- **Não** depender de `profile_type` como espinha dorsal da autorização
- **Sim** criar `user_business_access` com grants explícitos
- `profile_type` existe apenas para UX (sidebar, painel, filtros)
- `unit_id` em `user_roles` ou `user_unit_access` apenas se confirmado que a unidade é a menor granularidade
- Endpoint `/me` retorna `accessible_business_ids` calculado em runtime a partir de `user_business_access`

#### Opção C — Enterprise/Escalável (prematura)
Policy engine completo, delegação granular, permissões por resource+action. Correto para produto maduro. Não agora.

---

### Eixo Auditoria / Trilha

#### Opção B — Correta para MVP ✅
Consenso. Implementar:
1. `audit_service.py` com função `log_event()` genérica
2. Instrumentação nos endpoints de escrita críticos
3. `calculation_trace` populado pela engine
4. Histórico de `AssumptionValue` (tabela `assumption_value_history`)
5. Endpoint `/audit/` filtrado por escopo
6. UI de auditoria real no frontend

**Não** ir para event sourcing. É sofisticar antes do momento certo.

---

## 8. FASES DE IMPLEMENTAÇÃO (ORDEM CORRETA)

### ⚠️ Pré-requisito: Fase 0 — Decisões de Arquitetura (não é sprint de código)

Antes de qualquer linha de código de RBAC, fechar as três questões:

| Questão | Responsável | Decisão esperada |
|---|---|---|
| Firebase: validar ID Token direto **ou** trocar por JWT Atlas? | Tech Lead + CTO | Opção Auth-1 ou Auth-2 |
| Menor unidade de autorização: business ou unit? | Produto + Tech Lead | Define se `user_unit_access` precisa existir |
| Investidor vê toda a org por padrão ou portfólio explícito? | Produto | Define o modelo de grants |

---

### Fase 1 — Backend: Identidade e Acesso

Após as decisões da Fase 0:

- [ ] Migrar/adaptar autenticação para Firebase (conforme decisão)
- [ ] Adicionar `profile_type` ao modelo `User` (migration)
- [ ] Criar tabela `user_business_access` (migration)
- [ ] Criar `app/core/authorization.py` com `get_accessible_business_ids()` e `require_business_access()`
- [ ] Retrofitar os ~12 endpoints críticos com verificação de escopo
- [ ] Enriquecer `UserOut` com `profile_type`, `accessible_business_ids`, `roles`
- [ ] Enriquecer `GET /users/me`

> Entregável: qualquer chamada à API com um JWT válido retorna apenas dados do escopo do usuário. Um 403 real para acesso fora do escopo.

---

### Fase 2 — Frontend: Perfil e Escopo na Interface

Após Fase 1:

- [ ] `useAuthStore`: adicionar `profile_type` e `accessible_business_ids`
- [ ] `GlobalFilters`: limitar select de Business a `accessible_business_ids`
- [ ] `Sidebar`: renderização condicional por `profile_type`
- [ ] `middleware.ts`: nenhuma mudança necessária (já protege autenticação)
- [ ] Painel Investidor: visão de portfólio (múltiplos businesses)
- [ ] Painel Anjo: visão limitada ao seu escopo

> Entregável: interface reflete o escopo real do usuário. Um Anjo não vê negócios de outro Anjo porque o backend não retorna — não porque o menu está escondido.

---

### Fase 3 — Backend: Auditoria e Trilha

Após Fase 2 (pode rodar em paralelo com parte da Fase 2):

- [ ] `app/services/audit_service.py`: função `log_event(entity_type, entity_id, action, old_value, new_value, user_id, db)`
- [ ] Instrumentar endpoints: `PATCH /assumptions/values`, `POST /budget-versions/{id}/publish`, `POST /calculations/recalculate`, `POST /imports/upload`, qualquer DELETE
- [ ] Popular `calculation_trace` na `FinancialEngine.calculate()`
- [ ] Criar tabela `assumption_value_history` com before/after
- [ ] Endpoint `GET /audit/entity/{entity_type}/{entity_id}` — trilha de um objeto
- [ ] Endpoint `GET /calculations/results/{version_id}/trace` — trilha de cálculo por versão
- [ ] Adicionar filtro de escopo no `/audit/` (join business via version → unit → business)

> Entregável: alterações são rastreadas, `calculation_trace` é populado, trilha de premissa → cálculo → resultado é viável.

---

### Fase 4 — Frontend: Auditoria e Explorer

Após Fase 3:

- [ ] Página `/audit` real com tabela filtrada por entity_type, business, período, ação
- [ ] `CalculationTraceDrawer`: painel lateral na tela de resultados — mostra steps do cálculo
- [ ] `AssumptionHistory`: histórico de alterações de uma premissa com before/after
- [ ] Data Explorer (controlado): tabelas críticas navegáveis com filtro de escopo, sem SQL livre
- [ ] Filtro de `file_path` ausente de qualquer resposta da UI (segurança)

> Entregável: usuário consegue explicar de onde vem qualquer número exibido no dashboard.

---

## 9. RISCOS ATIVOS (NÃO RESOLVIDOS AINDA)

| Risco | Probabilidade | Impacto | Mitigação necessária |
|---|---|---|---|
| Implementar RBAC antes de decidir Firebase → retrabalho total | Alta se não há decisão | Alto | Fase 0 obrigatória |
| Modelar escopo por org e descobrir que precisa ser por unit | Média | Alto | Confirmar granularidade com produto |
| Usar `profile_type` como espinha de autorização | Alta (caminho natural) | Alto | Separar persona de escopo desde o início |
| Expor `/audit/` sem filtro de escopo | Já existe | Alto | Corrigir na Fase 3 antes de expor na UI |
| `calculation_trace = NULL` enquanto a UI de trilha é construída | Já existe | Médio | Popular na engine antes de construir a UI |

---

## 10. RESUMO EXECUTIVO

**Diagnóstico:** forte e confirmado. O Atlas é multi-tenant estrutural, não multi-tenant seguro. Roles existem mas estão mortas. Auditoria foi modelada mas nunca escrita.

**Maior risco técnico ativo:** ausência de enforcement de escopo no backend. Um JWT válido acessa qualquer dado de qualquer negócio via API direta.

**Maior risco de arquitetura antes de codar:** iniciar RBAC sem definir o modelo de autenticação com Firebase. Implementar roles e guards em cima de um modelo de auth que ainda vai mudar gera retrabalho significativo.

**Três decisões que precisam preceder qualquer código:**
1. Arquitetura de autenticação com Firebase (validar ID Token direto ou trocar por JWT Atlas)
2. Menor unidade de autorização (business ou unit)
3. Portfólio de Investidor: toda a organização ou grants explícitos (resposta correta: grants explícitos)

**Melhor caminho:** Fase 0 (decisões) → Fase 1 (backend enforcement) → Fase 2 (frontend por escopo) → Fase 3 (auditoria write) → Fase 4 (auditoria UI). Nessa ordem. Sem pular etapas.
