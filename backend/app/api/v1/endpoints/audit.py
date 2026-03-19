"""
Atlas Finance — Audit Log Endpoint
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("/")
def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    performed_by: str | None = Query(None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if performed_by:
        q = q.filter(AuditLog.performed_by == performed_by)
    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": log.id,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "action": log.action,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "performed_by": log.performed_by,
                "created_at": log.created_at,
                "notes": log.notes,
            }
            for log in logs
        ],
    }
