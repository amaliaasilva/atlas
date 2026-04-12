import math
from calendar import monthrange
from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field, model_validator


DEFAULT_PROJECTION_HORIZON_YEARS = 9


def _projection_years_from_dates(
    start: date | None,
    end: date | None,
    fallback: int | None = DEFAULT_PROJECTION_HORIZON_YEARS,
) -> int:
    if not start or not end:
        return fallback or DEFAULT_PROJECTION_HORIZON_YEARS
    if end < start:
        raise ValueError("A data final da projeção deve ser maior ou igual ao início")

    total_months = (end.year - start.year) * 12 + (end.month - start.month) + 1
    return max(1, math.ceil(total_months / 12))


class BudgetVersionCreate(BaseModel):
    """Aceita tanto o formato do frontend (name, horizon_*) quanto o legado (version_name, effective_*)."""

    unit_id: str
    scenario_id: str
    # Campos do frontend
    name: str | None = Field(None, min_length=2, max_length=100)
    horizon_start: str | None = None  # "YYYY-MM"
    horizon_end: str | None = None  # "YYYY-MM"
    # Campos legados (API direta)
    version_name: str | None = Field(None, min_length=2, max_length=100)
    effective_start_date: date | None = None
    effective_end_date: date | None = None
    status: str = "draft"
    notes: str | None = None
    # ARCH-08: horizonte de projeção explícito
    projection_horizon_years: int = DEFAULT_PROJECTION_HORIZON_YEARS

    @model_validator(mode="after")
    def normalise(self) -> "BudgetVersionCreate":
        # name → version_name
        if self.name and not self.version_name:
            self.version_name = self.name
        if not self.version_name:
            raise ValueError("'name' ou 'version_name' é obrigatório")
        # horizon_start → effective_start_date
        if self.horizon_start and not self.effective_start_date:
            self.effective_start_date = datetime.strptime(
                self.horizon_start + "-01", "%Y-%m-%d"
            ).date()
        # horizon_end → effective_end_date (último dia do mês)
        if self.horizon_end and not self.effective_end_date:
            dt = datetime.strptime(self.horizon_end + "-01", "%Y-%m-%d")
            last_day = monthrange(dt.year, dt.month)[1]
            self.effective_end_date = date(dt.year, dt.month, last_day)

        self.projection_horizon_years = _projection_years_from_dates(
            self.effective_start_date,
            self.effective_end_date,
            self.projection_horizon_years,
        )
        return self

    def to_db(self) -> dict:
        return {
            "unit_id": self.unit_id,
            "scenario_id": self.scenario_id,
            "version_name": self.version_name,
            "status": self.status,
            "effective_start_date": self.effective_start_date,
            "effective_end_date": self.effective_end_date,
            "notes": self.notes,
            "projection_horizon_years": self.projection_horizon_years,
        }


class BudgetVersionUpdate(BaseModel):
    version_name: str | None = None
    name: str | None = None  # alias frontend
    status: str | None = None
    notes: str | None = None
    effective_start_date: date | None = None
    effective_end_date: date | None = None
    horizon_start: str | None = None
    horizon_end: str | None = None
    projection_horizon_years: int | None = None

    @model_validator(mode="after")
    def normalise(self) -> "BudgetVersionUpdate":
        if self.name and not self.version_name:
            self.version_name = self.name
        if self.horizon_start and not self.effective_start_date:
            self.effective_start_date = datetime.strptime(
                self.horizon_start + "-01", "%Y-%m-%d"
            ).date()
        if self.horizon_end and not self.effective_end_date:
            dt = datetime.strptime(self.horizon_end + "-01", "%Y-%m-%d")
            last_day = monthrange(dt.year, dt.month)[1]
            self.effective_end_date = date(dt.year, dt.month, last_day)
        if self.projection_horizon_years is None and self.effective_start_date and self.effective_end_date:
            self.projection_horizon_years = _projection_years_from_dates(
                self.effective_start_date,
                self.effective_end_date,
            )
        return self


class BudgetVersionOut(BaseModel):
    id: str
    unit_id: str
    scenario_id: str
    version_name: str
    status: str
    effective_start_date: date | None = None
    effective_end_date: date | None = None
    notes: str | None = None
    created_by: str | None = None
    is_active: bool
    projection_horizon_years: int = DEFAULT_PROJECTION_HORIZON_YEARS
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    # Campos compatíveis com o frontend
    @computed_field  # type: ignore[misc]
    @property
    def name(self) -> str:
        return self.version_name

    @computed_field  # type: ignore[misc]
    @property
    def horizon_start(self) -> str | None:
        if self.effective_start_date:
            return self.effective_start_date.strftime("%Y-%m")
        return None

    @computed_field  # type: ignore[misc]
    @property
    def horizon_end(self) -> str | None:
        """Retorna o último mês configurado para a projeção."""
        if self.effective_end_date:
            return self.effective_end_date.strftime("%Y-%m")
        if self.effective_start_date:
            total_months = self.projection_horizon_years * 12 - 1
            start = self.effective_start_date
            y = start.year + (start.month - 1 + total_months) // 12
            m = (start.month - 1 + total_months) % 12 + 1
            return f"{y}-{m:02d}"
        return None
