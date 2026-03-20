import uuid
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class AuditAction(str, enum.Enum):
    create = "create"
    update = "update"
    delete = "delete"
    publish = "publish"
    archive = "archive"
    import_data = "import_data"
    recalculate = "recalculate"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(SAEnum(AuditAction), nullable=False)
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    performed_by: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ARCH-07: rastrear qual versão de orçamento foi afetada pela mudança
    budget_version_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("budget_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    performer: Mapped["User | None"] = relationship("User", foreign_keys=[performed_by])
    budget_version: Mapped["BudgetVersion | None"] = relationship(
        "BudgetVersion", foreign_keys=[budget_version_id]
    )
