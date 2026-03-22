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
  slug?: string;
  business_type: string;
  description?: string;
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
  notes?: string;
  sort_order?: number;
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
  version_name?: string; // alias do backend (= name)
  status: 'draft' | 'published' | 'archived';
  is_active: boolean;
  horizon_start: string;
  horizon_end: string;
  projection_horizon_years?: number;
  effective_start_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssumptionCategory {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  /** @deprecated use sort_order */
  display_order?: number;
}

export interface AssumptionDefinition {
  id: string;
  category_id: string;
  name: string;
  code: string;
  data_type: 'float' | 'integer' | 'percentage' | 'boolean' | 'string' | 'currency' | 'numeric';
  unit_of_measure?: string;
  default_value?: number | string;
  /** @deprecated use editable */
  is_required?: boolean;
  editable?: boolean;
  sort_order: number;
  /** @deprecated use sort_order */
  display_order?: number;
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
  // Professores necessários (GAP-06)
  teachers_needed_pessimistic?: number;
  teachers_needed_medium?: number;
  teachers_needed_optimistic?: number;
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
  // Professores necessários (GAP-06)
  teachers_needed_pessimistic?: number;
  teachers_needed_medium?: number;
  teachers_needed_optimistic?: number;
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
  annual_summaries?: AnnualSummaryBackend[];
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
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  performed_by?: string | null;
  created_at: string;
  notes?: string | null;
  budget_version_id?: string | null;
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

// ── DRE Detalhado (GAP-09) ────────────────────────────────────────────────────────────────────────

export type DRECategory = 'revenue' | 'fixed_cost' | 'variable_cost' | 'tax' | 'financing' | 'result' | 'operational';

export interface DREItem {
  code: string;
  name: string;
  category: DRECategory;
  display_order: number;
  value: number;
  pct_of_revenue: number;
}

export interface DREPeriod {
  period: string; // "YYYY-MM"
  items: DREItem[];
}

export interface DREResponse {
  version_id: string;
  dre: DREPeriod[];
}

// ── Resumo Anual do Backend (GAP-09 / P0.9) ───────────────────────────────────────────────

export interface AnnualSummaryBackend {
  year: string;
  months: number;
  revenue_total: number;
  total_fixed_costs: number;
  total_variable_costs: number;
  taxes_on_revenue: number;
  financing_payment: number;
  operating_result: number;
  net_result: number;
  ebitda: number;
  net_margin: number;
  occupancy_rate?: number;
  capacity_hours_month?: number;
  active_hours_month?: number;
}

export interface AnnualSummaryResponse {
  business_id: string;
  scenario_id: string;
  annual: AnnualSummaryBackend[];
}

// ── Portfolio / ROI (GAP-09) ────────────────────────────────────────────────────────────────────

export interface PortfolioUnit {
  unit_id: string;
  unit_name: string;
  version_id: string;
  capex: number;
  net_result: number;
  payback_months: number | null;
  roi_pct: number | null;
}

export interface PortfolioResponse {
  business_id: string;
  scenario_id: string;
  total_capex: number;
  total_net_result: number;
  roi_pct: number | null;
  units: PortfolioUnit[];
}

// ── Trilha de Cálculo (GAP-09) ───────────────────────────────────────────────────────────────────

export interface CalcTraceRevenue {
  formula: string;
  capacity_hours_month: number;
  occupancy_rate: number;
  active_hours_month: number;
  avg_price_per_hour: number;
  cowork_revenue: number;
  other_revenue: number;
  service_plans: Array<{ name: string; price: number; mix: number }>;
}

export interface CalcTraceFixedCosts {
  rent: number;
  staff: number;
  utilities: number;
  admin: number;
  marketing: number;
  equipment: number;
  insurance: number;
  other: number;
  detail: Record<string, unknown>;
}

export interface CalcTraceKpis {
  break_even_revenue: number;
  break_even_occupancy_pct: number;
  contribution_margin_pct: number;
  operating_result: number;
  net_result: number;
  ebitda: number;
  teachers_needed_pessimistic?: number;
  teachers_needed_medium?: number;
  teachers_needed_optimistic?: number;
}

export interface CalcTrace {
  period: string;
  trace: {
    revenue: CalcTraceRevenue;
    fixed_costs: CalcTraceFixedCosts;
    variable_costs: {
      hygiene_kit: number;
      sales_commission: number;
      card_fee?: number;
      other: number;
    };
    taxes: { tax_rate: number; taxes_on_revenue: number };
    financing: {
      total_payment: number;
      principal: number;
      interest: number;
      contracts: unknown[];
    };
    kpis: CalcTraceKpis;
  };
}

export interface AuditTraceResponse {
  version_id: string;
  traces: CalcTrace[];
}

// ─── Sprint 4: Split de Receita + Benefícios Personal ────────────────────────

export interface RevenueSplitPeriod {
  period: string;
  gross_revenue: number;
  franchisee_revenue: number;
  platform_revenue: number;
  referral_commission: number;
}

export interface RevenueSplitResponse {
  version_id: string;
  business_id: string;
  platform_fee_pct: number;
  referral_commission_pct: number;
  periods: RevenueSplitPeriod[];
  totals: RevenueSplitPeriod;
}

export interface FranchiseFeeConfig {
  id: string;
  business_id: string;
  platform_fee_pct: number;
  referral_commission_pct: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalBenefitTier {
  id: string;
  service_plan_id: string;
  monthly_kit_value: number;
  insurance_value: number;
  bonus_pct_on_extra: number;
  created_at: string;
  updated_at: string;
}

// ── Sprint 6: AI Layer ────────────────────────────────────────────────────────

export interface AuditAlert {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  year?: string | null;
  message: string;
  metric_affected: string;
  current_value?: number | null;
  threshold?: number | null;
}

export interface AuditReport {
  overall_health: 'healthy' | 'warning' | 'critical' | 'unavailable';
  risk_score: number;
  alerts: AuditAlert[];
  recommendations: string[];
  generated_at: string;
  model_used: string;
  version_id: string;
  tokens_used: number;
}

export interface FunctionCall {
  function: string;
  arguments: Record<string, unknown>;
  description: string;
}

export interface CopilotScenarioResponse {
  status: string;
  planned_actions: FunctionCall[];
  confirmation_required: boolean;
  actions_executed: Record<string, unknown>[];
  summary: string;
  model_used: string;
}

export interface SuggestedPrice {
  plan: string;
  current: number;
  suggested: number;
  rationale: string;
}

export interface GeoPricingReport {
  unit_id: string;
  city: string;
  state: string;
  location_profile: Record<string, unknown>;
  suggested_prices: SuggestedPrice[];
  revenue_impact: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  data_sources: string[];
  caveats: string[];
  generated_at: string;
  model_used: string;
}
