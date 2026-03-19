import uuid
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class ImportStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    partial = "partial"


class ImportType(str, enum.Enum):
    unit_budget = "unit_budget"
    consolidated = "consolidated"
    dashboard = "dashboard"


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    import_type: Mapped[str] = mapped_column(SAEnum(ImportType), nullable=False, default=ImportType.unit_budget)
    status: Mapped[str] = mapped_column(SAEnum(ImportStatus), nullable=False, default=ImportStatus.pending)
    unit_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    budget_version_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("budget_versions.id", ondelete="SET NULL"), nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    mappings: Mapped[list["ImportMapping"]] = relationship("ImportMapping", back_populates="import_job", cascade="all, delete-orphan")


class ImportMapping(Base):
    __tablename__ = "import_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    import_job_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_sheet: Mapped[str] = mapped_column(String(200), nullable=False)
    source_cell_or_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_table: Mapped[str] = mapped_column(String(100), nullable=False)
    target_field: Mapped[str] = mapped_column(String(100), nullable=False)
    transform_rule: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    import_job: Mapped["ImportJob"] = relationship("ImportJob", back_populates="mappings")
