"""One-off script: populate effective_start_date / effective_end_date
for budget_versions where those fields are NULL."""

import sys

sys.path.insert(0, "/app")

from datetime import date
from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()
try:
    result = db.execute(
        text(
            "UPDATE budget_versions"
            " SET effective_start_date = :start, effective_end_date = :end"
            " WHERE effective_start_date IS NULL"
        ),
        {"start": date(2026, 1, 1), "end": date(2026, 12, 31)},
    )
    db.commit()
    print(f"Updated {result.rowcount} budget version(s) with default horizon dates.")
finally:
    db.close()
