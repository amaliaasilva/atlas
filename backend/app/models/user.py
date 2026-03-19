import uuid
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base
from app.models.base import TimestampMixin


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"


class RoleCode(str, enum.Enum):
    super_admin = "super_admin"
    org_admin = "org_admin"
    business_manager = "business_manager"
    analyst = "analyst"
    viewer = "viewer"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(UserStatus), nullable=False, default=UserStatus.active)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user_roles: Mapped[list["UserRole"]] = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(SAEnum(RoleCode), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Relationships
    user_roles: Mapped[list["UserRole"]] = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    business_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")
    organization: Mapped["Organization | None"] = relationship("Organization", back_populates="user_roles")
