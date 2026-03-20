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
  opening_date?: string; // "YYYY-MM-DD" — data de inauguração
  slots_per_hour?: number;
  hours_open_weekday?: number;
  hours_open_saturday?: number;
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
  status: 'draft' | 'published' | 'archived' | 'planning';
  is_active: boolean;
  horizon_start: string;
  horizon_end: string;
  projection_horizon_years?: number;
  effective_start_date?: string;
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
  data_type: 'float' | 'integer' | 'percentage' | 'boolean' | 'string' | 'currency' | 'numeric';
  unit_of_measure?: string;
  default_value?: number | string;
  is_required: boolean;
  display_order: number;
  /** Periodicidade da premissa: 'static' | 'monthly' | 'one_time' | 'yearly' */
  periodicity?: string;
  /** ARCH-04: regra de crescimento para expansão automática ({type, rate?, values?}) */
  growth_rule?: {
    type: 'compound_growth' | 'curve' | 'flat';
    rate?: number;
    base_year?: number;
    values?: number[];
  } | null;
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
  // KPIs B2B Coworking
  break_even_revenue?: number;
  break_even_occupancy_pct?: number;
  contribution_margin_pct?: number;
  capacity_hours_month?: number;
  active_hours_month?: number;
}

export interface DashboardUnit {
  version_id: string;
  unit_id: string;
  unit_name: string | null;
  scenario_id: string;
  status: string;
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
  // KPIs B2B Coworking
  capacity_hours_month?: number;
  active_hours_month?: number;
  avg_price_per_hour?: number;
  break_even_revenue?: number;
  break_even_occupancy_pct?: number;
  contribution_margin_pct?: number;
  net_margin?: number;
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

// ── Contratos de Financiamento (ARCH-02 / GAP-06) ───────────────────────────

export interface FinancingContract {
  id: string;
  budget_version_id: string;
  name: string;
  description?: string;
  financed_amount: number;
  monthly_rate: number;       // ex: 0.012 = 1.2% a.m.
  term_months: number;        // 0 = pagamento único
  grace_period_months: number;
  down_payment_pct: number;   // ex: 0.20 = 20% de entrada
  start_date?: string;        // "YYYY-MM-DD"
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type FinancingContractInput = Omit<FinancingContract, 'id' | 'created_at' | 'updated_at'>;

// ── Planos de Serviço (ARCH-06 / GAP-02) ─────────────────────────────────

export interface ServicePlan {
  id: string;
  business_id: string;
  name: string;
  code: string;
  description?: string;
  price_per_hour: number;     // R$/hora
  target_mix_pct: number;    // 0.0–1.0
  min_classes_month: number;
  max_classes_month: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServicePlanInput = Omit<ServicePlan, 'id' | 'created_at' | 'updated_at'>;
