// ─── Tipos base ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface Business {
  id: string;
  organization_id: string;
  name: string;
  business_type: string;
  is_active: boolean;
}

export interface Unit {
  id: string;
  business_id: string;
  name: string;
  code: string;
  status: 'planning' | 'pre_opening' | 'active' | 'closed';
  city?: string;
  state?: string;
  area_m2?: number;
}

export interface Scenario {
  id: string;
  business_id: string;
  name: string;
  scenario_type: 'base' | 'conservative' | 'aggressive' | 'custom';
  description?: string;
}

export interface BudgetVersion {
  id: string;
  unit_id: string;
  scenario_id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  horizon_start: string;
  horizon_end: string;
}

export interface AssumptionCategory {
  id: string;
  name: string;
  code: string;
  display_order: number;
}

export interface AssumptionDefinition {
  id: string;
  category_id: string;
  name: string;
  code: string;
  data_type: 'float' | 'integer' | 'percentage' | 'boolean' | 'string';
  unit_of_measure?: string;
  default_value?: number | string;
  is_required: boolean;
  display_order: number;
}

export interface AssumptionValue {
  id?: string;
  assumption_definition_id: string;
  code: string;
  period_date?: string;
  numeric_value?: number;
  text_value?: string;
  source_type: 'manual' | 'imported' | 'calculated';
}

export interface CalculatedResult {
  id: string;
  budget_version_id: string;
  period_date: string;
  metric_code: string;
  metric_name: string;
  value: number;
  unit?: string;
}

export interface KPISummary {
  gross_revenue: number;
  net_result: number;
  ebitda: number;
  total_costs: number;
  active_students: number;
  occupancy_rate: number;
  break_even_students?: number;
  net_margin?: number;
  payback_months?: number;
}

export interface DashboardUnit {
  version: BudgetVersion;
  kpis: KPISummary;
  time_series: TimeSeries[];
}

export interface TimeSeries {
  period: string;
  // Aliases do backend (revenue_total) e frontend legado (gross_revenue)
  gross_revenue?: number;
  revenue_total?: number;
  net_result: number;
  ebitda: number;
  operating_result?: number;
  active_students?: number;
  occupancy_rate?: number;
  total_fixed_costs?: number;
  total_variable_costs?: number;
  taxes?: number;
  taxes_on_revenue?: number;
  financing_payment?: number;
  break_even_students?: number;
}

// Helper para resolver alias revenue_total vs gross_revenue
export function getRevenue(ts: TimeSeries): number {
  return ts.revenue_total ?? ts.gross_revenue ?? 0;
}

// Dados de unidade para comparação
export interface UnitComparisonDetail {
  unit_id: string;
  unit_name: string;
  total: number;
  series: Record<string, number>;
}

export interface UnitsComparisonResponse {
  business_id: string;
  metric: string;
  units: UnitComparisonDetail[];
}

// Resumo anual derivado do time_series
export interface AnnualSummary {
  year: string;
  revenue: number;
  profit: number;
  margin: number;
  units_count?: number;
}

export interface DashboardConsolidated {
  business_id: string;
  scenario_id: string;
  kpis: KPISummary;
  time_series: TimeSeries[];
}

export interface UnitComparison {
  unit_id: string;
  unit_name: string;
  data: Array<{ period: string; value: number }>;
}

export interface ImportJob {
  id: string;
  unit_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  rows_imported?: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
