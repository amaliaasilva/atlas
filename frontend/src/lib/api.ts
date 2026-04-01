import api from './api-client';
import type {
  AuthTokens, Organization, Business, Unit, Scenario,
  BudgetVersion, AssumptionCategory, AssumptionDefinition,
  AssumptionDefinitionUpdateInput,
  AssumptionValue, CalculatedResult, DashboardUnit,
  DashboardConsolidated, UnitComparison, UnitsComparisonResponse,
  ImportJob, AuditLog, User,
  FinancingContract, FinancingContractInput,
  ServicePlan, ServicePlanInput,
  DREResponse, AuditTraceResponse, AnnualSummaryResponse, PortfolioResponse,
  PeriodTraceResponse,
} from '@/types/api';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string): Promise<AuthTokens> =>
    api
      .post<AuthTokens>('/auth/login', { email, password })
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
    api.patch<Organization>(`/organizations/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/organizations/${id}`).then(() => {}),
};

// ── Businesses ───────────────────────────────────────────────────────────────

export const businessesApi = {
  list: (org_id: string): Promise<Business[]> =>
    api.get<Business[]>('/businesses', { params: { organization_id: org_id } }).then((r) => r.data),
  get: (id: string): Promise<Business> =>
    api.get<Business>(`/businesses/${id}`).then((r) => r.data),
  create: (data: Partial<Business>): Promise<Business> =>
    api.post<Business>('/businesses', data).then((r) => r.data),
  update: (id: string, data: Partial<Business>): Promise<Business> =>
    api.patch<Business>(`/businesses/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/businesses/${id}`).then(() => {}),
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
    api.patch<Unit>(`/units/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/units/${id}`).then(() => {}),
};

// ── Scenarios ────────────────────────────────────────────────────────────────

export const scenariosApi = {
  list: (business_id: string): Promise<Scenario[]> =>
    api.get<Scenario[]>('/scenarios', { params: { business_id } }).then((r) => r.data),
  get: (id: string): Promise<Scenario> =>
    api.get<Scenario>(`/scenarios/${id}`).then((r) => r.data),
  create: (data: Partial<Scenario>): Promise<Scenario> =>
    api.post<Scenario>('/scenarios', data).then((r) => r.data),
  update: (id: string, data: Partial<Scenario>): Promise<Scenario> =>
    api.patch<Scenario>(`/scenarios/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/scenarios/${id}`).then(() => {}),
};

// ── Budget Versions ──────────────────────────────────────────────────────────

export const versionsApi = {
  list: (unit_id: string, scenario_id?: string): Promise<BudgetVersion[]> =>
    api
      .get<BudgetVersion[]>('/budget-versions', { params: { unit_id, scenario_id } })
      .then((r) => r.data),
  listByBusiness: (business_id: string, scenario_id?: string): Promise<BudgetVersion[]> =>
    api
      .get<BudgetVersion[]>('/budget-versions', { params: { business_id, scenario_id } })
      .then((r) => r.data),
  get: (id: string): Promise<BudgetVersion> =>
    api.get<BudgetVersion>(`/budget-versions/${id}`).then((r) => r.data),
  create: (data: Partial<BudgetVersion>): Promise<BudgetVersion> =>
    api.post<BudgetVersion>('/budget-versions', data).then((r) => r.data),
  update: (id: string, data: Partial<BudgetVersion>): Promise<BudgetVersion> =>
    api.patch<BudgetVersion>(`/budget-versions/${id}`, data).then((r) => r.data),
  publish: (id: string): Promise<BudgetVersion> =>
    api.post<BudgetVersion>(`/budget-versions/${id}/publish`).then((r) => r.data),
  archive: (id: string): Promise<BudgetVersion> =>
    api.post<BudgetVersion>(`/budget-versions/${id}/archive`).then((r) => r.data),
  clone: (id: string, newName?: string): Promise<BudgetVersion> =>
    api.post<BudgetVersion>(`/budget-versions/${id}/clone`, { new_name: newName }).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/budget-versions/${id}`).then(() => {}),
};

// ── Assumptions ──────────────────────────────────────────────────────────────

export const assumptionsApi = {
  categories: (): Promise<AssumptionCategory[]> =>
    api.get<AssumptionCategory[]>('/assumptions/categories').then((r) => r.data),
  definitions: (category_id?: string): Promise<AssumptionDefinition[]> =>
    api.get<AssumptionDefinition[]>('/assumptions/definitions', { params: { category_id } }).then((r) => r.data),
  updateDefinition: (definition_id: string, data: AssumptionDefinitionUpdateInput): Promise<AssumptionDefinition> =>
    api.patch<AssumptionDefinition>(`/assumptions/definitions/${definition_id}`, data).then((r) => r.data),
  values: (version_id: string): Promise<AssumptionValue[]> =>
    api.get<AssumptionValue[]>(`/assumptions/values/${version_id}`).then((r) => r.data),
  bulkUpsert: (version_id: string, values: Partial<AssumptionValue>[]): Promise<{ updated: number }> =>
    api.post<{ updated: number }>(`/assumptions/values/${version_id}/bulk`, values).then((r) => r.data),
  quickAdd: (data: {
    budget_version_id: string;
    business_id: string;
    name: string;
    value: number;
    category_code: string;
    data_type?: string;
    growth_rule?: object | null;
  }): Promise<{ definition_id: string; code: string; value_id: string }> =>
    api.post('/assumptions/quick-add', data).then((r) => r.data),
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
  consolidated: (business_id: string, scenario_id: string, unit_ids: string[] = []): Promise<DashboardConsolidated> =>
    api
      .get<DashboardConsolidated>(`/dashboard/business/${business_id}/consolidated`, {
        params: { scenario_id, ...(unit_ids.length > 0 ? { unit_ids } : {}) },
      })
      .then((r) => r.data),
  unitsComparison: (business_id: string, scenario_id: string, metric = 'net_result'): Promise<UnitsComparisonResponse> =>
    api
      .get<UnitsComparisonResponse>(`/dashboard/business/${business_id}/units-comparison`, {
        params: { scenario_id, metric },
      })
      .then((r) => r.data),
  // GAP-09: Novos endpoints de dashboard
  dre: (version_id: string): Promise<DREResponse> =>
    api.get<DREResponse>(`/dashboard/unit/${version_id}/dre`).then((r) => r.data),
  auditTrace: (version_id: string): Promise<AuditTraceResponse> =>
    api.get<AuditTraceResponse>(`/dashboard/unit/${version_id}/audit`).then((r) => r.data),
  annual: (business_id: string, scenario_id: string, unit_ids: string[] = []): Promise<AnnualSummaryResponse> =>
    api
      .get<AnnualSummaryResponse>(`/dashboard/business/${business_id}/annual`, {
        params: { scenario_id, ...(unit_ids.length > 0 ? { unit_ids } : {}) },
      })
      .then((r) => r.data),
  portfolio: (business_id: string, scenario_id: string): Promise<PortfolioResponse> =>
    api
      .get<PortfolioResponse>(`/dashboard/business/${business_id}/portfolio`, {
        params: { scenario_id },
      })
      .then((r) => r.data),
  // Sprint 4: Split de receita franqueador/franqueado
  revenueSplit: (version_id: string): Promise<import('@/types/api').RevenueSplitResponse> =>
    api.get(`/dashboard/unit/${version_id}/split`).then((r) => r.data),
  // BE-B-01: DRE consolidado
  dreConsolidated: (
    business_id: string,
    scenario_id: string,
    unit_ids: string[] = [],
  ): Promise<import('@/types/api').DREConsolidatedResponse> =>
    api
      .get(`/dashboard/business/${business_id}/dre/consolidated`, {
        params: { scenario_id, ...(unit_ids.length > 0 ? { unit_ids } : {}) },
      })
      .then((r) => r.data),
  // Drill-down: cálculo detalhado de um período (utilidades, pessoal)
  periodTrace: (version_id: string, period: string): Promise<PeriodTraceResponse> =>
    api.get<PeriodTraceResponse>(`/dashboard/unit/${version_id}/period-trace/${period}`).then((r) => r.data),
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
    return api.post<ImportJob>(`/imports/upload/${unit_id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  list: (unit_id?: string): Promise<ImportJob[]> =>
    api.get<ImportJob[]>('/imports/jobs', { params: { unit_id } }).then((r) => r.data),
  downloadTemplate: (): Promise<Blob> =>
    api.get<Blob>('/imports/template', { responseType: 'blob' }).then((r) => r.data),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: { entity_type?: string; entity_id?: string; skip?: number; limit?: number }): Promise<{ total: number; items: AuditLog[] }> =>
    api.get<{ total: number; items: AuditLog[] }>('/audit', { params }).then((r) => r.data),
  byEntity: (entity_type: string, entity_id: string, limit = 20): Promise<AuditLog[]> =>
    api.get<{ total: number; items: AuditLog[] }>('/audit', { params: { entity_type, entity_id, limit } }).then((r) => r.data.items),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: (): Promise<User> => api.get<User>('/users/me').then((r) => r.data),
  list: (): Promise<User[]> => api.get<User[]>('/users').then((r) => r.data),
  create: (data: Partial<User> & { password: string }): Promise<User> =>
    api.post<User>('/users', data).then((r) => r.data),
};

// ── Financing Contracts ─────────────────────────────────────────────────────

export const financingContractsApi = {
  list: (version_id: string): Promise<FinancingContract[]> =>
    api.get<FinancingContract[]>(`/financing-contracts/${version_id}`).then((r) => r.data),
  create: (data: FinancingContractInput): Promise<FinancingContract> =>
    api.post<FinancingContract>('/financing-contracts', data).then((r) => r.data),
  update: (id: string, data: Partial<FinancingContractInput>): Promise<FinancingContract> =>
    api.patch<FinancingContract>(`/financing-contracts/contract/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/financing-contracts/contract/${id}`).then(() => {}),
};

// ── Service Plans ─────────────────────────────────────────────────────────────

export const servicePlansApi = {
  list: (business_id: string): Promise<ServicePlan[]> =>
    api.get<ServicePlan[]>('/service-plans', { params: { business_id } }).then((r) => r.data),
  create: (data: ServicePlanInput): Promise<ServicePlan> =>
    api.post<ServicePlan>('/service-plans', data).then((r) => r.data),
  update: (id: string, data: Partial<ServicePlanInput>): Promise<ServicePlan> =>
    api.patch<ServicePlan>(`/service-plans/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/service-plans/${id}`).then(() => {}),
};

// ── Sprint 4: Split de Receita + Benefícios Personal ─────────────────────────

export const franchiseFeeApi = {
  getConfig: (business_id: string): Promise<import('@/types/api').FranchiseFeeConfig> =>
    api.get(`/franchise-fee-configs/${business_id}`).then((r) => r.data),
  upsert: (data: { business_id: string; platform_fee_pct: number; referral_commission_pct: number }) =>
    api.put('/franchise-fee-configs', data).then((r) => r.data),
};

export const benefitTiersApi = {
  list: (business_id: string): Promise<import('@/types/api').PersonalBenefitTier[]> =>
    api.get('/personal-benefit-tiers', { params: { business_id } }).then((r) => r.data),
  upsert: (data: { service_plan_id: string; monthly_kit_value: number; insurance_value: number; bonus_pct_on_extra: number }) =>
    api.put('/personal-benefit-tiers', data).then((r) => r.data),
};

// ── Sprint 6: AI Layer ────────────────────────────────────────────────────────

export const aiApi = {
  sanityCheck: (version_id: string): Promise<import('@/types/api').AuditReport> =>
    api.post(`/ai/sanity-check/${version_id}`).then((r) => r.data),
  scenarioCopilot: (data: {
    budget_version_id: string;
    command: string;
    dry_run?: boolean;
    confirmed?: boolean;
  }): Promise<import('@/types/api').CopilotScenarioResponse> =>
    api.post('/ai/scenario-copilot', data).then((r) => r.data),
  geoPricing: (unit_id: string, location?: string): Promise<import('@/types/api').GeoPricingReport> =>
    api.post('/ai/geo-pricing', { unit_id, location }).then((r) => r.data),
};

// ── Calendar ─────────────────────────────────────────────────────────────────

export const calendarApi = {
  getUnit: (unit_id: string, year: number): Promise<import('@/types/api').CalendarYearOut> =>
    api.get(`/calendar/${unit_id}`, { params: { year } }).then((r) => r.data),
  getNational: (year: number): Promise<import('@/types/api').CalendarYearOut> =>
    api.get(`/calendar/national/${year}`).then((r) => r.data),
  createException: (data: import('@/types/api').CalendarExceptionIn): Promise<import('@/types/api').CalendarExceptionOut> =>
    api.post('/calendar/exceptions', data).then((r) => r.data),
  deleteException: (id: string): Promise<void> =>
    api.delete(`/calendar/exceptions/${id}`).then((r) => r.data),
};
