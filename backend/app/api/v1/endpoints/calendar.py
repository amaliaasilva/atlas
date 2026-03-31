"""
Atlas Finance — Calendar Endpoint (BE-A-06/07)

GET  /calendar/{unit_id}?year=YYYY → resumo anual de dias úteis por mês
POST /calendar/exceptions           → criar exceção manual
DELETE /calendar/exceptions/{id}   → remover exceção manual
"""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.calendar_exception import CalendarException, CalendarExceptionType
from app.services.calendar_service import calendar_service

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────


class MonthSummaryOut(BaseModel):
    year_month: str
    calendar_days: int
    weekend_days: int
    saturday_days: int
    sunday_days: int
    holiday_days: int
    working_days: int
    effective_working_days: int
    is_estimate: bool


class CalendarYearOut(BaseModel):
    unit_id: str | None
    year: int
    months: list[MonthSummaryOut]
    total_effective_working_days: int
    total_holiday_days: int


class ExceptionIn(BaseModel):
    unit_id: str | None = None
    exception_date: date
    exception_type: CalendarExceptionType
    description: str | None = None
    notes: str | None = None


class ExceptionOut(BaseModel):
    id: str
    unit_id: str | None
    exception_date: date
    exception_type: CalendarExceptionType
    description: str | None
    notes: str | None

    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("/{unit_id}", response_model=CalendarYearOut)
def get_unit_calendar(
    unit_id: str,
    year: int = Query(..., ge=2020, le=2040, description="Ano YYYY"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o resumo de calendário (dias úteis, feriados, capacidade) de uma unidade
    para todos os 12 meses de um ano.
    """
    summaries = calendar_service.get_year_summaries(db, unit_id, year)
    months_out = [
        MonthSummaryOut(
            year_month=s.year_month,
            calendar_days=s.calendar_days,
            weekend_days=s.weekend_days,
            saturday_days=s.saturday_days,
            sunday_days=s.sunday_days,
            holiday_days=s.holiday_days,
            working_days=s.working_days,
            effective_working_days=s.effective_working_days,
            is_estimate=s.is_estimate,
        )
        for s in summaries
    ]
    return CalendarYearOut(
        unit_id=unit_id,
        year=year,
        months=months_out,
        total_effective_working_days=sum(m.effective_working_days for m in months_out),
        total_holiday_days=sum(m.holiday_days for m in months_out),
    )


@router.get("/national/{year}", response_model=CalendarYearOut)
def get_national_calendar(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o calendário nacional (sem unit_id) para o ano especificado."""
    summaries = calendar_service.get_year_summaries(db, None, year)
    months_out = [
        MonthSummaryOut(
            year_month=s.year_month,
            calendar_days=s.calendar_days,
            weekend_days=s.weekend_days,
            saturday_days=s.saturday_days,
            sunday_days=s.sunday_days,
            holiday_days=s.holiday_days,
            working_days=s.working_days,
            effective_working_days=s.effective_working_days,
            is_estimate=s.is_estimate,
        )
        for s in summaries
    ]
    return CalendarYearOut(
        unit_id=None,
        year=year,
        months=months_out,
        total_effective_working_days=sum(m.effective_working_days for m in months_out),
        total_holiday_days=sum(m.holiday_days for m in months_out),
    )


@router.post("/exceptions", response_model=ExceptionOut, status_code=201)
def create_exception(
    body: ExceptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria uma exceção de calendário (feriado estadual/municipal ou fechamento manual).
    Para feriados nacionais usa a seed; este endpoint é para exceções por unidade.
    """
    # Impede duplicatas para mesma (unit_id, date, type)
    existing = (
        db.query(CalendarException)
        .filter(
            CalendarException.unit_id == body.unit_id,
            CalendarException.exception_date == body.exception_date,
            CalendarException.exception_type == body.exception_type,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Exceção já cadastrada para esta data, unidade e tipo.",
        )

    exc = CalendarException(
        id=str(uuid.uuid4()),
        unit_id=body.unit_id,
        exception_date=body.exception_date,
        exception_type=body.exception_type,
        description=body.description,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)
    return exc


@router.delete("/exceptions/{exception_id}", status_code=204)
def delete_exception(
    exception_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uma exceção de calendário. Feriados nacionais (seed) não podem ser removidos."""
    exc = (
        db.query(CalendarException)
        .filter(CalendarException.id == exception_id)
        .first()
    )
    if not exc:
        raise HTTPException(status_code=404, detail="Exceção não encontrada.")
    if exc.exception_type == CalendarExceptionType.holiday_national:
        raise HTTPException(
            status_code=403,
            detail="Feriados nacionais não podem ser removidos. Use um override manual_open se necessário.",
        )
    db.delete(exc)
    db.commit()
