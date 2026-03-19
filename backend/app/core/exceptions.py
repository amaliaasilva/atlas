"""Atlas Finance — Exception classes"""

from fastapi import HTTPException, status


class AtlasException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(HTTPException):
    def __init__(self, entity: str, entity_id: Any = None):
        detail = f"{entity} não encontrado"
        if entity_id:
            detail += f" (id={entity_id})"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, message: str = "Acesso não autorizado"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class ConflictError(HTTPException):
    def __init__(self, message: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=message)


class ValidationError(HTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message
        )


from typing import Any  # noqa — keep at bottom to avoid circular
