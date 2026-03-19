#!/bin/bash
set -e

APP_PORT="${PORT:-8000}"

echo "==> Atlas Finance Backend starting on port $APP_PORT"

# ── Criação de tabelas (não-fatal: Alembic cuida das migrações em CI/CD) ──────
echo "--> Tentando criar/verificar tabelas no banco de dados..."
if python3 - <<'PYEOF' 2>&1; then
import sys
sys.path.insert(0, '/app')
from app.core.database import engine, Base
import app.models
Base.metadata.create_all(bind=engine)
print("Tabelas criadas/verificadas com sucesso.")
PYEOF
  echo "--> Banco de dados OK."
else
  echo "WARN: Não foi possível conectar ao banco de dados durante a inicialização."
  echo "WARN: O servidor irá iniciar mesmo assim — certifique-se de que o Cloud SQL"
  echo "WARN: está acessível e as migrações Alembic foram executadas."
fi

# ── Seed de dados iniciais (não-fatal) ────────────────────────────────────────
echo "--> Executando seed de dados iniciais..."
python3 -m app.seeds.initial_data 2>&1 || echo "WARN: Seed ignorado ou já concluído."

# ── Servidor ──────────────────────────────────────────────────────────────────
echo "--> Iniciando uvicorn na porta $APP_PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$APP_PORT"
