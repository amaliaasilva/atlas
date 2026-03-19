#!/usr/bin/env bash
# =============================================================================
# Atlas Finance — Workload Identity Federation setup
#
# Executa UMA VEZ no GCP Cloud Shell (console.cloud.google.com → botão ">_")
# O Cloud Shell já vem autenticado com sua conta Google.
#
# O que este script faz:
#   1. Garante que a Service Account atlas-deployer existe
#   2. Cria o Workload Identity Pool (GitHub Actions)
#   3. Cria o OIDC Provider apontando para github.com
#   4. Vincula a SA ao repositório GitHub específico
#   5. Seta os secrets no GitHub (se gh CLI estiver disponível/autenticado)
#
# Uso:
#   bash scripts/setup-wif.sh
#
# Pré-requisitos no Cloud Shell (já satisfeitos por padrão):
#   - gcloud autenticado na conta dona do projeto atlasfinance
#   - Permissões: roles/iam.workloadIdentityPoolAdmin, roles/iam.serviceAccountAdmin
# =============================================================================
set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────────────────
PROJECT_ID="atlasfinance"
REPO="amaliaasilva/atlas"
SA_NAME="atlas-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_ID="github-actions"
PROVIDER_ID="github-oidc"
LOCATION="global"
BACKEND_URL="https://atlas-backend-7cuu5kzxjq-rj.a.run.app"

# ── Cores ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok() { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Atlas Finance — Workload Identity Federation Setup     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Projeto GCP : $PROJECT_ID"
echo "  Repositório : $REPO"
echo "  SA           : $SA_EMAIL"
echo ""

# Confirmar projeto correto
gcloud config set project "$PROJECT_ID" --quiet

# ── 1. Service Account ────────────────────────────────────────────────────────
info "Verificando service account..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" \
       --project="$PROJECT_ID" &>/dev/null; then
  info "Criando service account $SA_NAME..."
  gcloud iam service-accounts create "$SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="Atlas Deploy (GitHub Actions)" \
    --quiet
  ok "Service account criada"
else
  ok "Service account já existe"
fi

# Garantir roles necessárias
info "Garantindo roles na service account..."
ROLES=(
  "roles/run.admin"
  "roles/storage.admin"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.writer"
  "roles/secretmanager.secretAccessor"
)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --quiet 2>/dev/null || true
done
ok "Roles configuradas"

# ── 2. Workload Identity Pool ─────────────────────────────────────────────────
info "Verificando Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
       --project="$PROJECT_ID" --location="$LOCATION" &>/dev/null; then
  info "Criando pool $POOL_ID..."
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location="$LOCATION" \
    --display-name="GitHub Actions" \
    --quiet
  ok "Pool criado"
else
  ok "Pool já existe"
fi

POOL_RESOURCE=$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="$LOCATION" \
  --format="value(name)")

# ── 3. OIDC Provider ──────────────────────────────────────────────────────────
info "Verificando OIDC Provider..."
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
       --project="$PROJECT_ID" \
       --location="$LOCATION" \
       --workload-identity-pool="$POOL_ID" &>/dev/null; then
  info "Criando provider $PROVIDER_ID..."
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location="$LOCATION" \
    --workload-identity-pool="$POOL_ID" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="\
google.subject=assertion.sub,\
attribute.actor=assertion.actor,\
attribute.repository=assertion.repository,\
attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition="assertion.repository=='${REPO}'" \
    --quiet
  ok "Provider criado"
else
  ok "Provider já existe"
fi

PROVIDER_RESOURCE=$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="$LOCATION" \
  --workload-identity-pool="$POOL_ID" \
  --format="value(name)")

# ── 4. Vincular SA ao repositório ────────────────────────────────────────────
info "Vinculando service account ao repositório GitHub..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${REPO}" \
  --quiet
ok "SA vinculada ao repo $REPO"

# ── 5. Configurar secrets no GitHub ──────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  VALORES DOS SECRETS GITHUB"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  WIF_PROVIDER        = $PROVIDER_RESOURCE"
echo "  WIF_SERVICE_ACCOUNT = $SA_EMAIL"
echo "  NEXT_PUBLIC_API_URL = $BACKEND_URL"
echo ""

if command -v gh &>/dev/null; then
  if gh auth status &>/dev/null 2>&1; then
    info "gh CLI autenticado — setando secrets automaticamente..."
    gh secret set WIF_PROVIDER        --body="$PROVIDER_RESOURCE" --repo="$REPO"
    gh secret set WIF_SERVICE_ACCOUNT --body="$SA_EMAIL"           --repo="$REPO"
    gh secret set NEXT_PUBLIC_API_URL --body="$BACKEND_URL"        --repo="$REPO"
    echo ""
    ok "✅ Todos os secrets configurados no GitHub!"
    echo ""
    info "Verifique em: https://github.com/${REPO}/settings/secrets/actions"
  else
    warn "gh CLI disponível mas não autenticado."
    echo "  Execute: gh auth login"
    echo "  Depois reexecute este script para setar os secrets automaticamente."
  fi
else
  warn "gh CLI não encontrado."
  echo "  Adicione os valores acima manualmente em:"
  echo "  https://github.com/${REPO}/settings/secrets/actions"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  SETUP CONCLUÍDO"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Os workflows agora usam autenticação keyless (sem JSON)."
echo "  Faça um push ou dispare manualmente os workflows de deploy."
echo ""
