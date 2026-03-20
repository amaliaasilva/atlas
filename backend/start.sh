#!/bin/bash
# Atlas Finance — Container entrypoint
# Inicia o uvicorn imediatamente usando a porta definida pelo Cloud Run ($PORT).
# Operações de banco (migrations, seed) são executadas via Cloud Run Jobs no CI/CD.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
