"""Reports — exportação CSV/Excel"""
import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.calculated_result import CalculatedResult
from app.models.line_item import LineItemDefinition

router = APIRouter()


@router.get("/export/csv/{version_id}")
def export_csv(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(CalculatedResult, LineItemDefinition)
        .join(LineItemDefinition, CalculatedResult.line_item_id == LineItemDefinition.id)
        .filter(CalculatedResult.budget_version_id == version_id)
        .order_by(LineItemDefinition.display_order, CalculatedResult.period_date)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["period_date", "line_item_code", "line_item_name", "category", "value"])
    for r, li in results:
        writer.writerow([r.period_date, li.code, li.name, li.category, r.value])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=atlas_results_{version_id[:8]}.csv"},
    )
