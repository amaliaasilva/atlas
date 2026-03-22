"""Auth dependency for FastAPI endpoints."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.status == "active").first()
    if user is None:
        raise credentials_exception
    return user


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user


def verify_business_access(business_id: str, current_user: User, db: Session) -> None:
    """Raise 403 if the current user does not have access to the given business.

    Access is granted when ANY of the following is true:
    - user is a superuser
    - user has a UserRole with business_id equal to the requested business
    - user has a UserRole with an organization_id that owns the business
    """
    if current_user.is_superuser:
        return

    # Check for direct business-level role
    direct_role = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == current_user.id, UserRole.business_id == business_id
        )
        .first()
    )
    if direct_role:
        return

    # Check for org-level role: fetch business org_id then verify user has a role in that org
    from app.models.business import Business  # local import to avoid circular deps

    business = db.query(Business).filter(Business.id == business_id).first()
    if business:
        org_role = (
            db.query(UserRole)
            .filter(
                UserRole.user_id == current_user.id,
                UserRole.organization_id == business.organization_id,
            )
            .first()
        )
        if org_role:
            return

    raise HTTPException(status_code=403, detail="Acesso negado a este negócio")
