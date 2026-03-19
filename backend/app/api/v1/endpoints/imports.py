"""
Atlas Finance — Import Endpoint
Upload e processamento de arquivos Excel.
"""

import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.importers.excel_importer import import_from_path

router = APIRouter()


@router.post("/upload/{unit_id}")
async def upload_excel(
    unit_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Faz upload de um arquivo Excel e inicia o pipeline de importação
    para a unidade especificada (usa a budget_version ativa da unidade).
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Apenas arquivos Excel (.xlsx, .xls) são permitidos"
        )

    # Busca a budget_version ativa da unidade
    from app.models.budget_version import BudgetVersion

    budget_version = (
        db.query(BudgetVersion)
        .filter(BudgetVersion.unit_id == unit_id, BudgetVersion.is_active == True)
        .order_by(BudgetVersion.created_at.desc())
        .first()
    )
    if not budget_version:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma budget version ativa encontrada para esta unidade",
        )

    # Sanitiza o nome do arquivo
    safe_name = f"{uuid.uuid4()}_{Path(file.filename).name}"
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / safe_name

    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
    finally:
        file.file.close()

    result = import_from_path(str(dest), budget_version.id, db, unit_id=unit_id)
    return result


@router.get("/jobs")
def list_import_jobs(
    unit_id: str | None = Query(None),
    budget_version_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.import_job import ImportJob

    q = db.query(ImportJob)
    if unit_id:
        q = q.filter(ImportJob.unit_id == unit_id)
    if budget_version_id:
        q = q.filter(ImportJob.budget_version_id == budget_version_id)
    return q.order_by(ImportJob.created_at.desc()).limit(50).all()


@router.get("/jobs/{job_id}")
def get_import_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.import_job import ImportJob

    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return job
