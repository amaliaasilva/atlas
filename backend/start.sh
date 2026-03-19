#!/bin/bash
set -e

APP_PORT="${PORT:-8000}"

echo "==> Atlas Finance Backend starting on port $APP_PORT"

# ── Verificação de banco de dados (não-fatal, com timeout de 15s) ─────────────
# Alembic cuida das migrações em CI/CD; aqui só verificamos conectividade.
echo "--> Verificando conectividade com o banco de dados (timeout 15s)..."
if timeout 15 python3 - <<'PYEOF' 2>&1; then
import sys, os
sys.path.insert(0, '/app')
from app.core.database import engine
with engine.connect() as conn:
    conn.execute(__import__('sqlalchemy').text('SELECT 1'))
print("Banco de dados acessível.")
PYEOF
  echo "--> Banco de dados OK."
else
  echo "WARN: Banco de dados inacessível ou timeout atingido."
  echo "WARN: Verifique se o Cloud SQL está configurado e o SA tem roles/cloudsql.client."
  echo "WARN: O servidor iniciará mesmo assim — endpoints que precisam do DB retornarão 503."
fi

# ── Seed de dados iniciais (não-fatal, sem bloquear) ─────────────────────────
echo "--> Executando seed de dados iniciais (máx. 30s)..."
timeout 30 python3 -m app.seeds.initial_data 2>&1 || echo "WARN: Seed ignorado, pulado ou timeout."

# ── Servidor ──────────────────────────────────────────────────────────────────
echo "--> Iniciando uvicorn na porta $APP_PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$APP_PORT"
