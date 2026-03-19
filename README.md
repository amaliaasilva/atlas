# ATLAS FINANCE

Plataforma de planejamento financeiro multi-unidade para o Grupo Atlas (Cowork Gym / Fitness).  
Substitui o sistema baseado em planilhas Excel por uma aplicação web com banco de dados relacional, motor de cálculo Python e interface React/Next.js.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | FastAPI 0.115 + Python 3.12 |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic |
| Banco de dados | PostgreSQL 16 |
| Autenticação | JWT (HS256) + bcrypt |
| Frontend | Next.js 15 + React 19 + TypeScript |
| Estilização | Tailwind CSS 3 |
| Gráficos | Recharts 2 |
| HTTP client | Axios + TanStack Query v5 |
| Estado global | Zustand 5 |
| Container | Docker + docker-compose |
| Cloud (prod) | GCP Cloud Run + Cloud SQL + Cloud Storage |

---

## Estrutura do Repositório

```
atlas/
├── backend/                 # FastAPI
│   ├── main.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/env.py
│   ├── app/
│   │   ├── core/            # config, database, security, exceptions
│   │   ├── models/          # 17 modelos SQLAlchemy
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── api/v1/          # 13 grupos de endpoints
│   │   ├── services/
│   │   │   └── financial_engine/   # motor de cálculo puro Python
│   │   ├── importers/       # pipeline Excel → banco
│   │   └── seeds/           # dados iniciais (8 unidades, 3 cenários)
│   └── tests/               # testes unitários do motor
├── frontend/                # Next.js App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/       # tela de login
│   │   │   └── (auth)/      # rotas protegidas
│   │   │       ├── dashboard/
│   │   │       ├── businesses/
│   │   │       ├── units/
│   │   │       ├── scenarios/
│   │   │       ├── budget/[versionId]/
│   │   │       ├── results/[versionId]/
│   │   │       ├── dashboard/unit/[versionId]/
│   │   │       ├── dashboard/consolidated/[businessId]/
│   │   │       ├── compare/units/
│   │   │       ├── compare/scenarios/
│   │   │       ├── import/
│   │   │       ├── audit/
│   │   │       └── settings/
│   │   ├── components/      # UI + gráficos + layout
│   │   ├── lib/             # api-client, api.ts, utils
│   │   ├── store/           # Zustand auth + nav
│   │   └── types/           # TypeScript interfaces
├── planilha/                # Excel originais (reverse-engineered)
├── docs/                    # relatório de RE + arquitetura
├── scripts/                 # reverse_engineer.py
├── docker-compose.yml
└── .env.example
```

---

## Rodando Localmente

### Pré-requisitos

- Docker + Docker Compose ≥ 2.x
- (Alternativa sem Docker) Python 3.12 + Node 20 + PostgreSQL 16

### Com Docker (recomendado)

```bash
# 1. Clone e entre no diretório
cd /workspaces/atlas

# 2. Crie o .env
cp .env.example .env
# Edite SECRET_KEY com um valor seguro

# 3. Suba tudo
docker compose up --build

# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# Swagger:  http://localhost:8000/docs
```

### Sem Docker

#### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Configure PostgreSQL e ajuste DATABASE_URL no .env
export DATABASE_URL="postgresql://atlas:atlas@localhost:5432/atlas_finance"
export SECRET_KEY="sua-chave-secreta"

# Migrações
alembic upgrade head

# Seeds (cria org, business, 8 unidades, cenários, usuário admin)
python -m app.seeds.initial_data

# Servidor
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# → http://localhost:3000
```

---

## Credenciais Padrão

| Campo | Valor |
|-------|-------|
| E-mail | `admin@atlasfinance.com` |
| Senha | `Atlas@2026!` |

> **Troque a senha imediatamente em produção.**

---

## API

A documentação interativa (Swagger UI) fica em:

```
http://localhost:8000/docs
```

Todos os endpoints exigem `Authorization: Bearer <token>` — exceto `POST /api/v1/auth/login`.

### Principais groups

| Prefixo | Descrição |
|---------|-----------|
| `/auth` | Login / token |
| `/organizations` | Multi-tenant orgs |
| `/businesses` | Negócios por org |
| `/units` | Unidades por business |
| `/scenarios` | Cenários (base/conservador/agressivo) |
| `/budget-versions` | Versões de orçamento — draft/published/archived |
| `/assumptions` | Categorias, definições e valores das premissas |
| `/calculations` | Recalcular, consolidar, buscar resultados |
| `/dashboard` | KPIs e séries temporais |
| `/reports` | Export CSV |
| `/imports` | Upload Excel e jobs |
| `/audit` | Log de auditoria |
| `/users` | CRUD de usuários |

---

## Testes

```bash
cd backend
pip install pytest
pytest tests/ -v
```

Os testes cobrem:
- Motor financeiro: receita, custos fixos, custos variáveis, PMT/PRICE, KPIs
- Engine de orçamento end-to-end
- Consolidador (multi-unidade)

---

## Deploy — GCP Cloud Run

1. **Cloud SQL (PostgreSQL 16)** — crie instância e atualize `DATABASE_URL` no Secret Manager.
2. **Cloud Storage** — crie bucket para uploads e coloque o nome em `GCS_BUCKET_NAME`.
3. **Backend**
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/SEU_PROJECT/atlas-backend
   gcloud run deploy atlas-backend \
     --image gcr.io/SEU_PROJECT/atlas-backend \
     --add-cloudsql-instances SEU_PROJECT:REGION:atlas-db \
     --set-env-vars DATABASE_URL=... \
     --region us-central1 --allow-unauthenticated
   ```
4. **Frontend**
   ```bash
   cd frontend
   gcloud builds submit --tag gcr.io/SEU_PROJECT/atlas-frontend
   gcloud run deploy atlas-frontend \
     --image gcr.io/SEU_PROJECT/atlas-frontend \
     --set-env-vars NEXT_PUBLIC_API_URL=https://atlas-backend-xxxx.run.app \
     --region us-central1 --allow-unauthenticated
   ```

---

## Motor Financeiro

O motor é implementado como dataclasses Python puras (sem acoplamento com banco):

| Módulo | Responsabilidade |
|--------|-----------------|
| `revenue.py` | Receita bruta = alunos × ticket mix + personal training |
| `fixed_costs.py` | Aluguel, pessoal, utilities, admin, marketing, equipamentos, seguros |
| `variable_costs.py` | Kit hygiene por aluno + comissão de vendas |
| `financing.py` | PMT/PRICE — tabela price com carência opcional |
| `kpi.py` | Break-even, EBITDA, burn rate, payback, runway |
| `engine.py` | Orquestrador: calcula período a período e persiste no banco |
| `consolidator.py` | Soma de versões publicadas → ConsolidatedResult |

---

## Dados Iniciais (Seeds)

Os seeds criam automaticamente:

- **1 Organização**: Grupo Atlas
- **1 Negócio**: Cowork Gym / Fitness (business_type = `cowork_gym`)
- **8 Unidades**: Laboratório (UNIT01) + UNIT02 a UNIT08
- **3 Cenários**: Base, Conservador, Agressivo
- **7 Categorias de premissas** com **45+ definições**
- **22 Itens de DRE (LineItemDefinition)**
- **5 Perfis**: superuser, analyst, viewer, unit_manager, business_manager
- **1 Usuário admin**: `admin@atlasfinance.com`

---

## Licença

Uso interno — Grupo Atlas © 2026