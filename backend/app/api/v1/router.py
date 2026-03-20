"""Atlas Finance — API Router principal"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    organizations,
    businesses,
    units,
    scenarios,
    budget_versions,
    assumptions,
    calculations,
    dashboard,
    reports,
    imports,
    audit,
    users,
    financing_contracts,
    service_plans,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["organizations"]
)
api_router.include_router(businesses.router, prefix="/businesses", tags=["businesses"])
api_router.include_router(units.router, prefix="/units", tags=["units"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])
api_router.include_router(
    budget_versions.router, prefix="/budget-versions", tags=["budget-versions"]
)
api_router.include_router(
    assumptions.router, prefix="/assumptions", tags=["assumptions"]
)
api_router.include_router(
    calculations.router, prefix="/calculations", tags=["calculations"]
)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(
    financing_contracts.router, prefix="/financing-contracts", tags=["financing-contracts"]
)
api_router.include_router(
    service_plans.router, prefix="/service-plans", tags=["service-plans"]
)
