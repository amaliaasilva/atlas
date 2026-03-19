#!/bin/bash
echo "Creating database tables..."
python3 -c "
import sys
sys.path.insert(0, '/app')
from app.core.database import engine, Base
import app.models  # registers all models
Base.metadata.create_all(bind=engine)
print('Tables created successfully.')
"

echo "Seeding initial data if needed..."
python3 -m app.seeds.initial_data 2>&1 || echo "Seed skipped or already done."

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
