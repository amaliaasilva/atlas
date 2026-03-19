#!/usr/bin/env bash
# =============================================================================
#  Atlas Finance — Provisionamento GCP (one-time setup)
#  Execute UMA vez para criar toda a infraestrutura no GCP.
#  Pré-requisito: gcloud autenticado com conta Owner do projeto atlasfinance
#
#  Uso: ./scripts/setup-gcp.sh
# =============================================================================
set -euo pipefail

GCP_PROJECT="atlasfinance"
GCP_REGION="southamerica-east1"
CLOUD_RUN_SERVICE="atlas-backend"
DB_INSTANCE="atlas-db"
DB_NAME="atlas_finance"
DB_USER="atlas"
GCS_BUCKET="${GCP_PROJECT}-uploads"
FIREBASE_SITE="atlasfinance"
SA_NAME="atlas-deploy"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log_step()  { echo -e "\n${BOLD}${BLUE}▶ $*${NC}"; }
log_ok()    { echo -e "${GREEN}  ✓ $*${NC}"; }
log_warn()  { echo -e "${YELLOW}  ⚠ $*${NC}"; }
log_error() { echo -e "${RED}  ✗ $*${NC}" >&2; }

# ─── 1. Ativar APIs necessárias ───────────────────────────────────────────────
log_step "1/8 — Ativando APIs GCP"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firebase.googleapis.com \
  --project="${GCP_PROJECT}" \
  --quiet
log_ok "APIs ativadas"

# ─── 2. Service Account para CI/CD ───────────────────────────────────────────
log_step "2/8 — Criando Service Account para CI/CD"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" \
    --project="${GCP_PROJECT}" &>/dev/null; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Atlas Finance Deploy SA" \
    --project="${GCP_PROJECT}"
  log_ok "Service account criada: ${SA_EMAIL}"
else
  log_warn "Service account já existe: ${SA_EMAIL}"
fi

# Permissões mínimas necessárias (princípio do menor privilégio)
declare -a ROLES=(
  "roles/run.admin"
  "roles/storage.admin"
  "roles/secretmanager.secretAccessor"
  "roles/cloudsql.client"
  "roles/iam.serviceAccountUser"
  "roles/firebase.admin"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet 2>/dev/null | grep -q "Updated" && log_ok "Role: ${ROLE}" || log_warn "Role já configurada: ${ROLE}"
done

# ─── 3. Gerar chave JSON para GitHub Actions ──────────────────────────────────
log_step "3/8 — Gerando chave JSON do Service Account"
SA_KEY_FILE="$(mktemp /tmp/atlas-sa-key-XXXXXX.json)"
gcloud iam service-accounts keys create "${SA_KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${GCP_PROJECT}"
log_ok "Chave gerada em: ${SA_KEY_FILE}"

echo ""
echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════════════╗"
echo -e "║  IMPORTANTE — GitHub Secret: GCP_SA_KEY          ║"
echo -e "╚══════════════════════════════════════════════════╝${NC}"
echo "Adicione o conteúdo abaixo como secret 'GCP_SA_KEY' no GitHub:"
echo "  Acesso: https://github.com/amaliaasilva/atlas/settings/secrets/actions"
echo ""
cat "${SA_KEY_FILE}"
echo ""

# ─── 4. Cloud SQL (PostgreSQL 16) ─────────────────────────────────────────────
log_step "4/8 — Provisionando Cloud SQL (PostgreSQL 16)"

if ! gcloud sql instances describe "${DB_INSTANCE}" \
    --project="${GCP_PROJECT}" &>/dev/null; then
  log_warn "Criando instância Cloud SQL (pode demorar ~5 min)..."
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region="${GCP_REGION}" \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-point-in-time-recovery \
    --no-assign-ip \
    --project="${GCP_PROJECT}" \
    --quiet
  log_ok "Instância criada: ${DB_INSTANCE}"
else
  log_warn "Instância já existe: ${DB_INSTANCE}"
fi

# Database
gcloud sql databases create "${DB_NAME}" \
  --instance="${DB_INSTANCE}" \
  --project="${GCP_PROJECT}" \
  --quiet 2>/dev/null && log_ok "Database: ${DB_NAME}" || log_warn "Database já existe"

# Usuário com senha aleatória
DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
gcloud sql users create "${DB_USER}" \
  --instance="${DB_INSTANCE}" \
  --password="${DB_PASSWORD}" \
  --project="${GCP_PROJECT}" \
  --quiet 2>/dev/null || true

DB_CONNECTION_NAME=$(gcloud sql instances describe "${DB_INSTANCE}" \
  --project="${GCP_PROJECT}" \
  --format="value(connectionName)")

DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${DB_CONNECTION_NAME}"
log_ok "Cloud SQL configurado: ${DB_CONNECTION_NAME}"

# ─── 5. Cloud Storage bucket ──────────────────────────────────────────────────
log_step "5/8 — Criando Cloud Storage Bucket"
if ! gsutil ls "gs://${GCS_BUCKET}" &>/dev/null; then
  gsutil mb \
    -p "${GCP_PROJECT}" \
    -l "${GCP_REGION}" \
    -b on \
    "gs://${GCS_BUCKET}"
  gsutil lifecycle set /dev/stdin "gs://${GCS_BUCKET}" <<EOF
{
  "rule": [{
    "action": {"type": "Delete"},
    "condition": {"age": 365, "matchesPrefix": ["tmp/"]}
  }]
}
EOF
  log_ok "Bucket criado: gs://${GCS_BUCKET}"
else
  log_warn "Bucket já existe: gs://${GCS_BUCKET}"
fi

# ─── 6. Secret Manager ────────────────────────────────────────────────────────
log_step "6/8 — Configurando Secret Manager"

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

create_or_update_secret() {
  local secret_id="$1"
  local secret_value="$2"
  if gcloud secrets describe "${secret_id}" --project="${GCP_PROJECT}" &>/dev/null; then
    echo -n "${secret_value}" | gcloud secrets versions add "${secret_id}" \
      --data-file=- --project="${GCP_PROJECT}" --quiet
    log_ok "Secret atualizado: ${secret_id}"
  else
    echo -n "${secret_value}" | gcloud secrets create "${secret_id}" \
      --data-file=- --project="${GCP_PROJECT}" --replication-policy=automatic --quiet
    log_ok "Secret criado: ${secret_id}"
  fi
}

create_or_update_secret "atlas-database-url" "${DATABASE_URL}"
create_or_update_secret "atlas-secret-key" "${SECRET_KEY}"
create_or_update_secret "atlas-gcs-bucket" "${GCS_BUCKET}"

# Permissão para Cloud Run acessar secrets
gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

log_ok "Secrets configurados"

# ─── 7. Firebase Hosting ─────────────────────────────────────────────────────
log_step "7/8 — Configurando Firebase Hosting"
if command -v firebase &>/dev/null; then
  firebase projects:addfirebase "${GCP_PROJECT}" 2>/dev/null || \
    log_warn "Firebase já configurado para ${GCP_PROJECT}"
  log_ok "Firebase Hosting: ${FIREBASE_SITE}.web.app"
else
  log_warn "Firebase CLI não encontrado — instale com: npm i -g firebase-tools"
fi

# ─── 8. Resumo e próximos passos ──────────────────────────────────────────────
log_step "8/8 — Setup concluído"

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗"
echo -e "║  Atlas Finance — Infraestrutura Provisionada     ║"
echo -e "╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Projeto GCP:${NC}        ${GCP_PROJECT}"
echo -e "  ${BOLD}Região:${NC}             ${GCP_REGION}"
echo -e "  ${BOLD}Cloud Run:${NC}          ${CLOUD_RUN_SERVICE} (não deployado ainda)"
echo -e "  ${BOLD}Cloud SQL:${NC}          ${DB_INSTANCE} (${DB_CONNECTION_NAME})"
echo -e "  ${BOLD}GCS Bucket:${NC}         gs://${GCS_BUCKET}"
echo -e "  ${BOLD}Firebase Hosting:${NC}   https://${FIREBASE_SITE}.web.app"
echo ""
echo -e "${BOLD}${YELLOW}Próximos passos:${NC}"
echo "  1. Adicione GCP_SA_KEY no GitHub Secrets (conteúdo impresso acima)"
echo "     URL: https://github.com/amaliaasilva/atlas/settings/secrets/actions"
echo ""
echo "  2. Adicione FIREBASE_TOKEN no GitHub Secrets:"
echo "     Valor: $(cat /tmp/fb_token.txt 2>/dev/null | tr -d '\n' || echo '<execute firebase login:ci para obter>')"
echo ""
echo "  3. Adicione NEXT_PUBLIC_API_URL como secret:"
echo "     Valor: https://${CLOUD_RUN_SERVICE}-<hash>.${GCP_REGION}.run.app"
echo "     (disponível após o primeiro deploy do backend)"
echo ""
echo "  4. Faça push para a branch main:"
echo "     git push origin main"
echo ""
echo -e "  ${GREEN}✓ O pipeline de CI/CD cuidará do resto automaticamente!${NC}"
echo ""
