import api from './api-client';
import type {
  AuthTokens, Organization, Business, Unit, Scenario,
  BudgetVersion, AssumptionCategory, AssumptionDefinition,
  AssumptionValue, CalculatedResult, DashboardUnit,
  DashboardConsolidated, UnitComparison, UnitsComparisonResponse,
  ImportJob, AuditLog, User,
} from '@/types/api';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string): Promise<AuthTokens> =>
    api
      .post<AuthTokens>('/auth/login', new URLSearchParams({ username: email, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((r) => r.data),

  me: (): Promise<User> => api.get<User>('/users/me').then((r) => r.data),
};

// ── Organizations ────────────────────────────────────────────────────────────

export const organizationsApi = {
  list: (): Promise<Organization[]> =>
    api.get<Organization[]>('/organizations').then((r) => r.data),
  get: (id: string): Promise<Organization> =>
    api.get<Organization>(`/organizations/${id}`).then((r) => r.data),
  create: (data: Partial<Organization>): Promise<Organization> =>
    api.post<Organization>('/organizations', data).then((r) => r.data),
  update: (id: string, data: Partial<Organization>): Promise<Organization> =>
    api.put<Organization>(`/organizations/${id}`, data).then((r) => r.data),
};

// ── Businesses ───────────────────────────────────────────────────────────────

export const businessesApi = {
  list: (org_id: string): Promise<Business[]> =>
    api.get<Business[]>('/businesses', { params: { organization_id: org_id } }).then((r) => r.data),
  get: (id: string): Promise<Business> =>
    api.get<Business>(`/businesses/${id}`).then((r) => r.data),
  create: (data: Partial<Business>): Promise<Business> =>
    api.post<Business>('/businesses', data).then((r) => r.data),
};

// ── Units ────────────────────────────────────────────────────────────────────

export const unitsApi = {
  list: (business_id: string): Promise<Unit[]> =>
    api.get<Unit[]>('/units', { params: { business_id } }).then((r) => r.data),
  get: (id: string): Promise<Unit> =>
    api.get<Unit>(`/units/${id}`).then((r) => r.data),
  create: (data: Partial<Unit>): Promise<Unit> =>
    api.post<Unit>('/units', data).then((r) => r.data),
  update: (id: string, data: Partial<Unit>): Promise<Unit> =>
    api.put<Unit>(`/units/${id}`, data).then((r) => r.data),
};

// ── Scenarios ────────────────────────────────────────────────────────────────

export const scenariosApi = {
  list: (business_id: string): Promise<Scenario[]> =>
    api.get<Scenario[]>('/scenarios', { params: { business_id } }).then((r) => r.data),
  get: (id: string): Promise<Scenario> =>
    api.get<Scenario>(`/scenarios/${id}`).then((r) => r.data),
  create: (data: Partial<Scenario>): Promise<Scenario> =>
    api.post<Scenario>('/scenarios', data).then((r) => r.data),
};

// ── Budget Versions ──────────────────────────────────────────────────────────

export const versionsApi = {
  list: (unit_id: string, scenario_id?: string): Promise<BudgetVersion[]> =>
    api
      .get<BudgetVersion[]>('/budget-versions', { params: { unit_id, scenario_id } })
      .then((r) => r.data),
  get: (id: string): Promise<BudgetVersion> =>
    api.get<BudgetVersion>(`/budget-versions/${id}`).then((r) => r.data),
  create: (data: Partial<BudgetVersion>): Promise<BudgetVersion> =>
    api.post<BudgetVersion>('/budget-versions', data).then((r) => r.data),
  publish: (id: string): Promise<BudgetVersion> =>
    api.post<BudgetVersion>(`/budget-versions/${id}/publish`).then((r) => r.data),
  archive: (id: string): Promise<BudgetVersion> =>
    api.post<BudgetVersion>(`/budget-versions/${id}/archive`).then((r) => r.data),
};

// ── Assumptions ──────────────────────────────────────────────────────────────

export const assumptionsApi = {
  categories: (): Promise<AssumptionCategory[]> =>
    api.get<AssumptionCategory[]>('/assumptions/categories').then((r) => r.data),
  definitions: (category_id?: string): Promise<AssumptionDefinition[]> =>
    api.get<AssumptionDefinition[]>('/assumptions/definitions', { params: { category_id } }).then((r) => r.data),
  values: (version_id: string): Promise<AssumptionValue[]> =>
    api.get<AssumptionValue[]>(`/assumptions/values/${version_id}`).then((r) => r.data),
  bulkUpsert: (version_id: string, values: Partial<AssumptionValue>[]): Promise<{ updated: number }> =>
    api.post<{ updated: number }>(`/assumptions/values/${version_id}/bulk`, values).then((r) => r.data),
};

// ── Calculations ──────────────────────────────────────────────────────────────

export const calculationsApi = {
  recalculate: (version_id: string): Promise<{ status: string; periods_calculated: number }> =>
    api.post(`/calculations/recalculate/${version_id}`).then((r) => r.data),
  consolidate: (business_id: string, scenario_id: string): Promise<{ status: string }> =>
    api.post(`/calculations/consolidate/${business_id}/${scenario_id}`).then((r) => r.data),
  results: (version_id: string): Promise<CalculatedResult[]> =>
    api.get<CalculatedResult[]>(`/calculations/results/${version_id}`).then((r) => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  unit: (version_id: string): Promise<DashboardUnit> =>
    api.get<DashboardUnit>(`/dashboard/unit/${version_id}`).then((r) => r.data),
  consolidated: (business_id: string, scenario_id: string): Promise<DashboardConsolidated> =>
    api
      .get<DashboardConsolidated>(`/dashboard/business/${business_id}/consolidated`, {
        params: { scenario_id },
      })
      .then((r) => r.data),
  unitsComparison: (business_id: string, scenario_id: string, metric = 'net_result'): Promise<UnitsComparisonResponse> =>
    api
      .get<UnitsComparisonResponse>(`/dashboard/business/${business_id}/units-comparison`, {
        params: { scenario_id, metric },
      })
      .then((r) => r.data),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  exportCsv: (version_id: string): Promise<Blob> =>
    api
      .get(`/reports/csv/${version_id}`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
};

// ── Imports ───────────────────────────────────────────────────────────────────

export const importsApi = {
  upload: (unit_id: string, file: File): Promise<ImportJob> => {
    const form = new FormData();
    form.append('file', file);
    form.append('unit_id', unit_id);
    return api.post<ImportJob>('/imports/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  list: (unit_id?: string): Promise<ImportJob[]> =>
    api.get<ImportJob[]>('/imports', { params: { unit_id } }).then((r) => r.data),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: { entity_type?: string; entity_id?: string; skip?: number; limit?: number }): Promise<AuditLog[]> =>
    api.get<AuditLog[]>('/audit', { params }).then((r) => r.data),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: (): Promise<User> => api.get<User>('/users/me').then((r) => r.data),
  list: (): Promise<User[]> => api.get<User[]>('/users').then((r) => r.data),
  create: (data: Partial<User> & { password: string }): Promise<User> =>
    api.post<User>('/users', data).then((r) => r.data),
};
