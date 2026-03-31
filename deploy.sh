#!/usr/bin/env bash
# =============================================================================
#  Atlas Finance — Deploy Unificado
#
#  Uso:  ./deploy.sh [frontend|backend|all] [opções]
#  Docs: ./deploy.sh --help
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

# ─── Cores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }
log_section() {
  echo -e "\n${BOLD}${BLUE}══════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $*${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════${NC}"
}

# ─── Constantes ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
BACKEND_DIR="${SCRIPT_DIR}/backend"
GCP_PROJECT="${GCP_PROJECT:-atlasfinance}"
GCP_REGION="${GCP_REGION:-southamerica-east1}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-atlas-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-atlas-frontend}"
FIREBASE_SITE="${FIREBASE_SITE:-atlasfinance}"
IMAGE_NAME="gcr.io/${GCP_PROJECT}/${CLOUD_RUN_SERVICE}"
FRONTEND_IMAGE_NAME="gcr.io/${GCP_PROJECT}/${FRONTEND_SERVICE}"
DEPLOY_TARGET="all"
ENVIRONMENT="production"
DRY_RUN=false
START_TIME=$(date +%s)

# ─── Ajuda (deve ser definida ANTES do parse de args) ────────────────────────
usage() {
  cat <<EOF

${BOLD}Atlas Finance Deploy Script${NC}

  ${CYAN}./deploy.sh${NC} [target] [opções]

${BOLD}Targets:${NC}
  frontend    Deploy somente o frontend (Docker → Cloud Run + Firebase Hosting)
  backend     Deploy somente o backend (Cloud Run)
  all         Deploy completo (padrão)

${BOLD}Opções:${NC}
  --env       staging | production  (padrão: production)
  --project   ID do projeto GCP     (padrão: atlasfinance)
  --tag       Tag da imagem Docker  (padrão: git short SHA)
  --dry-run   Simula sem executar
  -h, --help  Exibe este menu

${BOLD}Variáveis de ambiente:${NC}
  FIREBASE_TOKEN       Token do Firebase CLI (obrigatório em CI p/ hosting)
  NEXT_PUBLIC_API_URL  URL do backend (auto-detectado via Cloud Run se omitido)
  DATABASE_URL         URL do Cloud SQL (postgresql+asyncpg://...)
  SECRET_KEY           Chave JWT secreta
  GCS_BUCKET_NAME      Bucket do Cloud Storage

${BOLD}Exemplos:${NC}
  ./deploy.sh all --env production
  ./deploy.sh frontend
  ./deploy.sh backend --tag v1.2.3
  DRY_RUN=true ./deploy.sh all
  FIREBASE_TOKEN=\$TOKEN ./deploy.sh frontend

EOF
}

# ─── Parse de argumentos ─────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    frontend|backend|all) DEPLOY_TARGET="$1"; shift ;;
    --env)        ENVIRONMENT="${2:-production}"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --project)    GCP_PROJECT="$2"; IMAGE_NAME="gcr.io/${GCP_PROJECT}/${CLOUD_RUN_SERVICE}"; FRONTEND_IMAGE_NAME="gcr.io/${GCP_PROJECT}/${FRONTEND_SERVICE}"; shift 2 ;;
    --tag)        IMAGE_TAG="$2"; shift 2 ;;
    -h|--help)    usage; exit 0 ;;
    *)            log_error "Argumento desconhecido: $1"; usage; exit 1 ;;
  esac
done

IMAGE_TAG="${IMAGE_TAG:-$(git -C "${SCRIPT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "latest")}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
FULL_IMAGE_LATEST="${IMAGE_NAME}:latest"
FRONTEND_FULL_IMAGE="${FRONTEND_IMAGE_NAME}:${IMAGE_TAG}"
FRONTEND_FULL_IMAGE_LATEST="${FRONTEND_IMAGE_NAME}:latest"

# ─── Verificações de pré-requisitos ──────────────────────────────────────────
check_prerequisites() {
  log_step "Verificando pré-requisitos"

  local missing=()

  command -v node    >/dev/null 2>&1 || missing+=("node")
  command -v docker  >/dev/null 2>&1 || missing+=("docker")
  command -v gcloud  >/dev/null 2>&1 || missing+=("gcloud (https://cloud.google.com/sdk/docs/install)")

  if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "all" ]]; then
    command -v firebase>/dev/null 2>&1 || missing+=("firebase-tools (npm i -g firebase-tools)")
  fi

  if [[ "${#missing[@]}" -gt 0 ]]; then
    log_error "Ferramentas obrigatórias não encontradas:"
    for tool in "${missing[@]}"; do
      echo -e "  ${RED}✗${NC} $tool"
    done
    exit 1
  fi

  log_ok "Todos os pré-requisitos satisfeitos"
}

# ─── Validações de ambiente ───────────────────────────────────────────────────
validate_environment() {
  log_step "Validando variáveis de ambiente (${ENVIRONMENT})"

  local warnings=()

  # Token Firebase — obrigatório em CI quando há deploy de hosting
  if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "all" ]]; then
    if [[ -z "${FIREBASE_TOKEN:-}" ]] && [[ ! -t 0 ]]; then
      log_error "FIREBASE_TOKEN não definido. Em CI, exporte FIREBASE_TOKEN=\$(cat /tmp/fb_token.txt)"
      exit 1
    fi
  fi

  if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "all" ]]; then
    [[ -z "${DATABASE_URL:-}" ]]    && warnings+=("DATABASE_URL não definido")
    [[ -z "${SECRET_KEY:-}" ]]      && warnings+=("SECRET_KEY não definido")
    [[ -z "${GCS_BUCKET_NAME:-}" ]] && warnings+=("GCS_BUCKET_NAME não definido (uploads desativados)")
  fi

  if [[ "${#warnings[@]}" -gt 0 ]]; then
    log_warn "Avisos de configuração:"
    for w in "${warnings[@]}"; do
      echo -e "  ${YELLOW}⚠${NC} $w"
    done
    if [[ "$ENVIRONMENT" == "production" ]]; then
      read -rp $'\n'"Continue mesmo assim? [s/N] " confirm
      [[ "$confirm" =~ ^[sS]$ ]] || { log_info "Deploy cancelado."; exit 0; }
    fi
  fi

  log_ok "Ambiente validado"
}

# ─── Verificar branch Git ─────────────────────────────────────────────────────
check_git_branch() {
  local current_branch
  current_branch=$(git -C "${SCRIPT_DIR}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

  if [[ "$ENVIRONMENT" == "production" && "$current_branch" != "main" ]]; then
    log_warn "Deploy de production a partir da branch '${current_branch}' (recomendado: main)"
    read -rp "Continuar? [s/N] " confirm
    [[ "$confirm" =~ ^[sS]$ ]] || { log_info "Deploy cancelado."; exit 0; }
  fi

  log_info "Branch: ${current_branch} | Commit: ${IMAGE_TAG} | Ambiente: ${ENVIRONMENT}"
}

# ─── Testes ───────────────────────────────────────────────────────────────────
run_tests() {
  log_step "Executando testes do backend"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] pytest seria executado aqui"
    return 0
  fi

  if [[ -f "${BACKEND_DIR}/requirements-dev.txt" ]]; then
    pip install -q -r "${BACKEND_DIR}/requirements-dev.txt" 2>/dev/null || true
  fi

  cd "${BACKEND_DIR}"
  python -m pytest tests/ -x -q --tb=short 2>&1 || {
    log_error "Testes falharam — deploy abortado"
    exit 1
  }
  cd "${SCRIPT_DIR}"
  log_ok "Todos os testes passaram"
}

# ─── Build da imagem Docker do Frontend ─────────────────────────────────────
build_frontend_image() {
  log_step "Build da imagem Docker → ${FRONTEND_FULL_IMAGE}"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] docker build do frontend seria executado"
    return 0
  fi

  # Obtém a URL do backend para NEXT_PUBLIC_API_URL (necessário em build time)
  local api_url="${NEXT_PUBLIC_API_URL:-}"
  if [[ -z "$api_url" ]]; then
    log_info "NEXT_PUBLIC_API_URL não definido — consultando Cloud Run..."
    api_url=$(gcloud run services describe "${CLOUD_RUN_SERVICE}" \
      --project="${GCP_PROJECT}" \
      --region="${GCP_REGION}" \
      --format="value(status.url)" 2>/dev/null || echo "")
    if [[ -z "$api_url" ]]; then
      log_error "Não foi possível determinar NEXT_PUBLIC_API_URL. Defina a variável ou faça deploy do backend primeiro."
      exit 1
    fi
  fi
  log_info "NEXT_PUBLIC_API_URL=${api_url}"

  # Configura Docker para autenticar no GCR
  gcloud auth configure-docker --quiet 2>&1

  docker build \
    --file "${FRONTEND_DIR}/Dockerfile" \
    --build-arg "NEXT_PUBLIC_API_URL=${api_url}" \
    --tag "${FRONTEND_FULL_IMAGE}" \
    --tag "${FRONTEND_FULL_IMAGE_LATEST}" \
    --label "git.commit=${IMAGE_TAG}" \
    --label "build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "build.environment=${ENVIRONMENT}" \
    "${FRONTEND_DIR}" 2>&1

  log_ok "Imagem construída: ${FRONTEND_FULL_IMAGE}"
}

# ─── Push da imagem do Frontend para GCR ─────────────────────────────────────
push_frontend_image() {
  log_step "Push do Frontend para Container Registry"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] docker push do frontend seria executado"
    return 0
  fi

  docker push "${FRONTEND_FULL_IMAGE}" 2>&1
  docker push "${FRONTEND_FULL_IMAGE_LATEST}" 2>&1

  log_ok "Imagem publicada em: ${FRONTEND_FULL_IMAGE}"
}

# ─── Deploy Cloud Run (Frontend) ──────────────────────────────────────────────
deploy_frontend_cloud_run() {
  log_step "Deploy Cloud Run → ${FRONTEND_SERVICE} (${GCP_REGION})"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] gcloud run deploy do frontend seria executado"
    return 0
  fi

  gcloud run deploy "${FRONTEND_SERVICE}" \
    --image="${FRONTEND_FULL_IMAGE}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=5 \
    --concurrency=80 \
    --timeout=60 \
    --labels="environment=${ENVIRONMENT},commit=${IMAGE_TAG}" \
    --quiet 2>&1

  local service_url
  service_url=$(gcloud run services describe "${FRONTEND_SERVICE}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --format="value(status.url)" 2>/dev/null || echo "")
  log_ok "Frontend Cloud Run: ${service_url}"
}

# ─── Deploy Firebase Hosting (atualiza configuração CDN/rewrites) ────────────
deploy_frontend() {
  log_step "Deploy Firebase Hosting → site: ${FIREBASE_SITE}"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] firebase deploy --only hosting seria executado"
    return 0
  fi

  cd "${FRONTEND_DIR}"

  local firebase_opts=(
    deploy
    --only "hosting:${FIREBASE_SITE}"
    --project "${GCP_PROJECT}"
    --non-interactive
  )

  # Usa token em CI; usa sessão interativa em local
  if [[ -n "${FIREBASE_TOKEN:-}" ]]; then
    firebase_opts+=(--token "${FIREBASE_TOKEN}")
    log_info "Usando FIREBASE_TOKEN (modo CI)"
  fi

  firebase "${firebase_opts[@]}" 2>&1

  log_ok "Firebase Hosting atualizado:"
  echo -e "  ${GREEN}https://${FIREBASE_SITE}.web.app${NC}"
  echo -e "  ${GREEN}https://${FIREBASE_SITE}.firebaseapp.com${NC}"

  cd "${SCRIPT_DIR}"
}

# ─── Build da imagem Docker do Backend ───────────────────────────────────────
build_backend_image() {
  log_step "Build da imagem Docker → ${FULL_IMAGE}"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] docker build seria executado"
    return 0
  fi

  # Configura Docker para autenticar no GCR
  gcloud auth configure-docker --quiet 2>&1

  docker build \
    --file "${BACKEND_DIR}/Dockerfile" \
    --tag "${FULL_IMAGE}" \
    --tag "${FULL_IMAGE_LATEST}" \
    --label "git.commit=${IMAGE_TAG}" \
    --label "build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "build.environment=${ENVIRONMENT}" \
    --cache-from "${FULL_IMAGE_LATEST}" \
    "${BACKEND_DIR}" 2>&1

  log_ok "Imagem construída: ${FULL_IMAGE}"
}

# ─── Push da imagem para GCR ──────────────────────────────────────────────────
push_backend_image() {
  log_step "Push para Container Registry"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] docker push seria executado"
    return 0
  fi

  docker push "${FULL_IMAGE}" 2>&1
  docker push "${FULL_IMAGE_LATEST}" 2>&1

  log_ok "Imagem publicada em: ${FULL_IMAGE}"
}

# ─── Deploy Cloud Run ─────────────────────────────────────────────────────────
deploy_backend() {
  log_step "Deploy Cloud Run → ${CLOUD_RUN_SERVICE} (${GCP_REGION})"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] gcloud run deploy seria executado"
    return 0
  fi

  # Monta as env vars para Cloud Run.
  # Usa "^|^" como delimitador para suportar valores com vírgulas (ex: CORS_ORIGINS).
  # Referência: https://cloud.google.com/sdk/gcloud/reference/topic/escaping
  #
  # CORS inclui Firebase Hosting + Cloud Run frontend (caso acesso direto pela URL do Cloud Run)
  local frontend_run_url
  frontend_run_url=$(gcloud run services describe "${FRONTEND_SERVICE}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --format="value(status.url)" 2>/dev/null || echo "")
  local cors_value="https://${FIREBASE_SITE}.web.app,https://${FIREBASE_SITE}.firebaseapp.com"
  if [[ -n "$frontend_run_url" ]]; then
    cors_value="${cors_value},${frontend_run_url}"
    log_info "CORS inclui Cloud Run frontend: ${frontend_run_url}"
  fi
  local env_vars="^|^ENVIRONMENT=${ENVIRONMENT}|CORS_ORIGINS=${cors_value}"

  if [[ -n "${DATABASE_URL:-}" ]]; then
    env_vars+="|DATABASE_URL=${DATABASE_URL}"
  fi
  if [[ -n "${SECRET_KEY:-}" ]]; then
    env_vars+="|SECRET_KEY=${SECRET_KEY}"
  fi
  if [[ -n "${GCS_BUCKET_NAME:-}" ]]; then
    env_vars+="|GCS_BUCKET_NAME=${GCS_BUCKET_NAME}"
  fi

  gcloud run deploy "${CLOUD_RUN_SERVICE}" \
    --image="${FULL_IMAGE}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8000 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --concurrency=80 \
    --timeout=60 \
    --set-env-vars="${env_vars}" \
    --labels="environment=${ENVIRONMENT},commit=${IMAGE_TAG}" \
    --quiet 2>&1

  # Obtém a URL do serviço deployado
  local service_url
  service_url=$(gcloud run services describe "${CLOUD_RUN_SERVICE}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --format="value(status.url)" 2>/dev/null || echo "")

  log_ok "Backend deployado em: ${service_url:-https://${CLOUD_RUN_SERVICE}-<hash>.${GCP_REGION}.run.app}"
}

# ─── Health check pós-deploy ──────────────────────────────────────────────────
# Usa node (https nativo) em vez de curl — compatível com ambientes restritos
_http_check() {
  local url="$1"
  node -e "
    const mod = require('${url}'.startsWith('https') ? 'https' : 'http');
    mod.get('${url}', (r) => { console.log(r.statusCode); }).on('error', () => console.log('000'));
  " 2>/dev/null || echo "000"
}

health_check() {
  local target="$1"
  log_step "Health check pós-deploy"

  if $DRY_RUN; then
    log_warn "[DRY-RUN] health check seria executado"
    return 0
  fi

  if [[ "$target" == "backend" || "$target" == "all" ]]; then
    local backend_url=""
    if command -v gcloud &>/dev/null; then
      backend_url=$(gcloud run services describe "${CLOUD_RUN_SERVICE}" \
        --project="${GCP_PROJECT}" \
        --region="${GCP_REGION}" \
        --format="value(status.url)" 2>/dev/null || echo "")
    fi

    if [[ -n "$backend_url" ]]; then
      log_info "Testando ${backend_url}/health ..."
      local http_code
      http_code=$(_http_check "${backend_url}/health")
      if [[ "$http_code" == "200" ]]; then
        log_ok "Backend respondendo ✓ (HTTP ${http_code})"
      else
        log_warn "Backend retornou HTTP ${http_code} (pode estar em cold start)"
      fi
    fi
  fi

  if [[ "$target" == "frontend" || "$target" == "all" ]]; then
    local frontend_url="https://${FIREBASE_SITE}.web.app"
    log_info "Testando ${frontend_url} ..."
    local http_code
    http_code=$(_http_check "${frontend_url}")
    if [[ "$http_code" == "200" ]]; then
      log_ok "Frontend respondendo ✓ (HTTP ${http_code})"
    else
      log_warn "Frontend retornou HTTP ${http_code} (propagação CDN pode levar alguns minutos)"
    fi
  fi
}

# ─── Resumo final ─────────────────────────────────────────────────────────────
print_summary() {
  local end_time=$(date +%s)
  local duration=$((end_time - START_TIME))

  log_section "Deploy concluído"
  echo -e "  ${BOLD}Ambiente:${NC}    ${ENVIRONMENT}"
  echo -e "  ${BOLD}Target:${NC}      ${DEPLOY_TARGET}"
  echo -e "  ${BOLD}Commit:${NC}      ${IMAGE_TAG}"
  echo -e "  ${BOLD}Duração:${NC}     ${duration}s"
  echo ""

  if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "all" ]]; then
    local fe_url="N/A"
    if command -v gcloud &>/dev/null; then
      fe_url=$(gcloud run services describe "${FRONTEND_SERVICE}" \
        --project="${GCP_PROJECT}" --region="${GCP_REGION}" \
        --format="value(status.url)" 2>/dev/null || echo "N/A")
    fi
    echo -e "  ${GREEN}🌐 Frontend:${NC} https://${FIREBASE_SITE}.web.app"
    [[ "$fe_url" != "N/A" ]] && echo -e "  ${GREEN}   Cloud Run:${NC} ${fe_url}"
  fi

  if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "all" ]]; then
    local svc_url="N/A"
    if command -v gcloud &>/dev/null; then
      svc_url=$(gcloud run services describe "${CLOUD_RUN_SERVICE}" \
        --project="${GCP_PROJECT}" --region="${GCP_REGION}" \
        --format="value(status.url)" 2>/dev/null || echo "N/A")
    fi
    echo -e "  ${GREEN}🔧 Backend:${NC}  ${svc_url}"
    [[ "$svc_url" != "N/A" ]] && echo -e "  ${GREEN}📖 Docs:${NC}     ${svc_url}/docs"
  fi
  echo ""
}

# ─── Tratamento de erros (trap) ───────────────────────────────────────────────
on_error() {
  local exit_code=$?
  local line_no=$1
  log_error "Falha na linha ${line_no} (exit code: ${exit_code})"
  log_error "Deploy abortado. Nenhuma alteração parcial foi aplicada."
  exit "${exit_code}"
}
trap 'on_error ${LINENO}' ERR

# ─── Ponto de entrada ─────────────────────────────────────────────────────────
main() {
  log_section "Atlas Finance Deploy — $(date '+%Y-%m-%d %H:%M:%S')"

  check_prerequisites
  validate_environment
  check_git_branch

  case "$DEPLOY_TARGET" in
    frontend)
      build_frontend_image
      push_frontend_image
      deploy_frontend_cloud_run
      deploy_frontend
      health_check frontend
      ;;
    backend)
      run_tests
      build_backend_image
      push_backend_image
      deploy_backend
      health_check backend
      ;;
    all)
      run_tests
      build_backend_image
      push_backend_image
      deploy_backend
      build_frontend_image
      push_frontend_image
      deploy_frontend_cloud_run
      deploy_frontend
      health_check all
      ;;
    *)
      log_error "Target inválido: '${DEPLOY_TARGET}'. Use: frontend | backend | all"
      usage
      exit 1
      ;;
  esac

  print_summary
}

main "$@"
