'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { assumptionsApi, versionsApi, calculationsApi, financingContractsApi, aiApi, auditApi, scenariosApi, servicePlansApi, unitsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import type {
  AssumptionValue,
  FinancingContract,
  AssumptionDefinition,
  CopilotScenarioResponse,
  AuditLog,
  AssumptionDefinitionUpdateInput,
} from '@/types/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/Spinner';
import { cn, formatNumber, formatPeriod, getErrorMessage } from '@/lib/utils';
import { Save, PlayCircle, ChevronDown, ChevronRight, Plus, Trash2, TrendingUp, Zap, History, SlidersHorizontal, X, Edit3, Info, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

// ── Gera lista de períodos entre dois meses ────────────────────────────────────
function generatePeriods(start: string, end: string): string[] {
  const periods: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return periods;
}

// ── Adiciona N meses a um "YYYY-MM" string ───────────────────────────────────
function addMonths(yyyymm: string, n: number): string {
  const [sy, sm] = yyyymm.split('-').map(Number);
  let y = sy, m = sm + n;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ── Computa valor expandido pelo growth_rule (client-side preview) ─────────────
function normalizeComputedValue(value: number, decimals = 10): number {
  return Number(value.toFixed(decimals));
}

function computeAutoValue(
  def: AssumptionDefinition,
  baseValue: number,
  period: string,
  allPeriods: string[],
): number {
  const rule = def.growth_rule;
  if (!rule || !allPeriods.length) return baseValue;

  if (rule.type === 'compound_growth') {
    const rate = rule.rate ?? 0;
    const baseYear = rule.base_year ?? parseInt(allPeriods[0].slice(0, 4));
    const year = parseInt(period.slice(0, 4));
    return normalizeComputedValue(
      baseValue * Math.pow(1 + rate, Math.max(0, year - baseYear)),
    );
  }
  if (rule.type === 'curve') {
    const values = rule.values ?? [];
    if (!values.length) return baseValue;
    const baseYear = rule.base_year ?? parseInt(allPeriods[0].slice(0, 4));
    const year = parseInt(period.slice(0, 4));
    const yearIdx = Math.max(0, year - baseYear);
    return normalizeComputedValue(values[Math.min(yearIdx, values.length - 1)] ?? baseValue);
  }
  return baseValue;
}

// ── Formata label resumido da growth_rule ─────────────────────────────────────
function growthRuleLabel(rule: AssumptionDefinition['growth_rule']): string | null {
  if (!rule) return null;
  if (rule.type === 'compound_growth' && rule.rate != null)
    return `+${(rule.rate * 100).toFixed(0)}% a.a.`;
  if (rule.type === 'curve') return 'curva';
  return null;
}

function hasActiveGrowthRule(def?: Pick<AssumptionDefinition, 'growth_rule'> | null): boolean {
  return Boolean(def?.growth_rule && def.growth_rule.type !== 'flat');
}

function categoryTone(categoryCode?: string): { header: string; dot: string } {
  if (categoryCode?.includes('RECEITA')) {
    return { header: 'bg-emerald-50 hover:bg-emerald-100', dot: 'bg-emerald-500' };
  }
  if (categoryCode?.includes('SALARIO')) {
    return { header: 'bg-violet-50 hover:bg-violet-100', dot: 'bg-violet-500' };
  }
  if (categoryCode?.includes('CAPEX')) {
    return { header: 'bg-amber-50 hover:bg-amber-100', dot: 'bg-amber-500' };
  }
  return { header: 'bg-rose-50 hover:bg-rose-100', dot: 'bg-rose-500' };
}

const PERSISTED_DEFINITION_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPersistedDefinitionId(id: string): boolean {
  return PERSISTED_DEFINITION_ID_REGEX.test(id);
}

function getAssumptionVisualEmoji(def: Pick<AssumptionDefinition, 'code' | 'name'>): string | null {
  const normalizedCode = normalizeAssumptionLabel(def.code);
  const normalizedName = normalizeAssumptionLabel(def.name);

  if (normalizedCode.includes('receita') || normalizedName.includes('receita') || normalizedCode.includes('ticket')) return '💰';
  if (normalizedCode.includes('energia') || normalizedName.includes('energia')) return '⚡';
  if (normalizedCode.includes('agua') || normalizedName.includes('agua')) return '💧';
  if (normalizedCode.includes('imposto') || normalizedName.includes('imposto')) return '🧾';
  if (normalizedCode.includes('cartao') || normalizedName.includes('cartao')) return '💳';
  if (normalizedCode.includes('ocupacao') || normalizedName.includes('ocupacao')) return '📈';
  if (normalizedCode.includes('capacidade') || normalizedName.includes('capacidade')) return '📊';
  if (normalizedCode.includes('salario') || normalizedName.includes('salario') || normalizedCode.includes('folha') || normalizedName.includes('folha')) return '👥';
  if (normalizedCode.includes('kit_higiene') || normalizedName.includes('higiene')) return '🧴';
  if (normalizedCode.includes('aluguel') || normalizedName.includes('aluguel')) return '🏢';
  if (normalizedCode.includes('marketing') || normalizedName.includes('marketing')) return '📣';
  if (normalizedCode.includes('seguro') || normalizedName.includes('seguro')) return '🛡️';
  if (normalizedCode.includes('royalties') || normalizedName.includes('royalties') || normalizedCode.includes('franchise') || normalizedName.includes('franquia')) return '🤝';
  return null;
}

type RuleTypeOption = 'flat' | 'compound_growth' | 'curve';
type SeparatorTone = 'slate' | 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
type SeparatorFontSize = 'xs' | 'sm' | 'base' | 'lg';
type SeparatorStyleConfig = {
  tone: SeparatorTone;
  font_size: SeparatorFontSize;
  bold: boolean;
  italic: boolean;
};

const HIDDEN_ASSUMPTION_CODES = new Set([
  'alunos_capacidade_maxima',
  'capacidade_maxima_mes',
  'preco_medio_hora',
  'ticket_medio_plano_trimestral',
  'ticket_medio_plano_anual',
  'mix_plano_mensal_pct',
  'mix_plano_trimestral_pct',
  'mix_plano_anual_pct',
  'beneficios_por_funcionario',
  'num_funcionarios',
  'num_personal_trainers',
  'receita_media_personal_mes',
  'kwh_consumo_mensal',
  'tarifa_kwh',
  'consumo_agua_m3_mensal',
  'tarifa_agua_m3',
  'consumo_energia_kwh_mensal',
  'tarifa_energia_kwh',
  // Driver interno do Cálculo Kit Higiene — não exibir no orçamento.
  // O total mensal pré-calculado (kit_higiene_professor_calculado_mes) é a linha visível.
  'kit_higiene_por_aluno',
]);
const SETTINGS_DRIVEN_ASSUMPTION_CODES = new Set(['ticket_medio_plano_mensal']);
const SETTINGS_DRIVEN_TICKET_DESCRIPTION = 'Valor sincronizado automaticamente com Configurações. Para alterar, edite os valores na tela de Configurações.';
const DERIVED_CAPACITY_CODE = 'capacidade_maxima_mes';
const DERIVED_CAPACITY_DESCRIPTION = 'Capacidade máxima de aulas por mês = (dias úteis × horas/dia útil + sábados × horas/dia sábado) × slots por hora. Valor pré-calculado automaticamente a partir das premissas operacionais.';
const DERIVED_ESTIMATED_CAPACITY_CODE = 'capacidade_estimada_aulas_mes';
const DERIVED_ESTIMATED_CAPACITY_DESCRIPTION = 'Capacidade estimada de aulas por mês = taxa de ocupação mensal × capacidade máxima de aulas por mês. Valor pré-calculado automaticamente.';
const DERIVED_REVENUE_CODE = 'receita_total_calculada_mes';
const DERIVED_REVENUE_DESCRIPTION = 'Receita estimada por mês = capacidade estimada de aulas por mês × ticket médio do plano mensal + outras receitas mensais.';
const DEFAULT_TAX_CURVE_VALUES = [0.06, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633, 0.1633];
const DEFAULT_TAX_GROWTH_RULE: NonNullable<AssumptionDefinition['growth_rule']> = {
  type: 'curve',
  values: DEFAULT_TAX_CURVE_VALUES,
};
const DERIVED_ELECTRICITY_CODE = 'custo_energia_calculado_mes';
const DERIVED_ELECTRICITY_DESCRIPTION = 'Energia estimada = (parcela fixa + máximo variável a 100% ocupação × a taxa de ocupação já definida em Receita) × (1 − redução por automação de A/C). Valor pré-calculado automaticamente.';
const DERIVED_WATER_CODE = 'custo_agua_calculado_mes';
const DERIVED_WATER_DESCRIPTION = 'Água estimada = parcela fixa + (máximo variável a 100% ocupação × a taxa de ocupação já definida em Receita). Valor pré-calculado automaticamente.';
const DERIVED_CARD_FEE_CODE = 'custo_taxa_cartao_calculado_mes';
const DERIVED_CARD_FEE_DESCRIPTION = 'Taxa de cartão estimada = receita total estimada × taxa de cartão (% da receita). Valor pré-calculado automaticamente.';
const DERIVED_HYGIENE_KIT_CODE = 'kit_higiene_professor_calculado_mes';
const DERIVED_HYGIENE_KIT_DESCRIPTION = 'Total mensal de kit higiene calculado na aba Cálculo Kit Higiene para professores diamante ativos. Composição: (sachês × banhos/mês) + (lavagem de toalha × banhos/mês) + reposição de itens (5% × R$20/un.). O valor é persistido mensalmente após salvar a simulação.';
const DERIVED_TAXES_CODE = 'impostos_calculados_mes';
const DERIVED_TAXES_DESCRIPTION = 'Impostos estimados = receita total estimada × alíquota de imposto sobre receita. Valor pré-calculado automaticamente.';
const DERIVED_UTILITIES_OCCUPANCY_CODE = 'taxa_ocupacao_referencia_utilidades';
const DERIVED_UTILITIES_OCCUPANCY_DESCRIPTION = 'Replica, apenas para leitura, a taxa de ocupação mensal definida na seção Receita. Para alterar esse percentual, edite o campo de ocupação em Receita.';
const DERIVED_CLT_BASE_CODE = 'folha_clt_base_calculada';
const DERIVED_CLT_BASE_DESCRIPTION = 'Base salarial CLT calculada automaticamente pela soma de todos os salários do custo fixo. Se você adicionar uma nova premissa com nome/código começando por salario_, ela entra aqui.';
const DERIVED_CLT_CHARGES_CODE = 'encargos_clt_calculados';
const DERIVED_CLT_CHARGES_DESCRIPTION = 'Encargos calculados automaticamente sobre a base salarial CLT usando a premissa de encargos da folha.';
const DERIVED_CLT_TOTAL_CODE = 'folha_clt_total_calculada';
const DERIVED_CLT_TOTAL_DESCRIPTION = 'Total da folha CLT = salário base + encargos. Benefícios por funcionário não entram mais automaticamente nesse total.';
const DEFAULT_SEPARATOR_STYLE: SeparatorStyleConfig = {
  tone: 'slate',
  font_size: 'sm',
  bold: true,
  italic: false,
};
const DERIVED_REVENUE_STYLE_CODES = new Set([
  'ticket_medio_plano_mensal',
  DERIVED_CAPACITY_CODE,
  DERIVED_ESTIMATED_CAPACITY_CODE,
  DERIVED_REVENUE_CODE,
]);
const DERIVED_EXPENSE_STYLE_CODES = new Set([
  DERIVED_ELECTRICITY_CODE,
  DERIVED_WATER_CODE,
  DERIVED_HYGIENE_KIT_CODE,
  DERIVED_CARD_FEE_CODE,
  DERIVED_TAXES_CODE,
  DERIVED_UTILITIES_OCCUPANCY_CODE,
  DERIVED_CLT_BASE_CODE,
  DERIVED_CLT_CHARGES_CODE,
  DERIVED_CLT_TOTAL_CODE,
]);
const DEFAULT_OUTSIDE_DRE_CODES = new Set([
  'slots_por_hora',
  'horas_dia_util',
  'horas_dia_sabado',
  'dias_uteis_mes',
  'sabados_mes',
  'taxa_ocupacao',
  'ticket_medio_plano_mensal',
  'preco_medio_hora',
  'ticket_medio_plano_trimestral',
  'ticket_medio_plano_anual',
  'mix_plano_mensal_pct',
  'mix_plano_trimestral_pct',
  'mix_plano_anual_pct',
  'mix_diamante_pct',
  'mix_ouro_pct',
  'mix_prata_pct',
  'mix_bronze_pct',
  'custo_energia_fixo',
  'custo_energia_variavel_max',
  'automacao_reducao_pct',
  'custo_agua_fixo',
  'custo_agua_variavel_max',
  'encargos_folha_pct',
  'taxa_cartao_pct',
  'aliquota_imposto_receita',
  DERIVED_CAPACITY_CODE,
  DERIVED_ESTIMATED_CAPACITY_CODE,
  DERIVED_UTILITIES_OCCUPANCY_CODE,
  DERIVED_CLT_BASE_CODE,
  DERIVED_CLT_CHARGES_CODE,
]);
const DEFAULT_INSIDE_DRE_CODES = new Set([
  DERIVED_REVENUE_CODE,
  DERIVED_ELECTRICITY_CODE,
  DERIVED_WATER_CODE,
  DERIVED_HYGIENE_KIT_CODE,
  DERIVED_CARD_FEE_CODE,
  DERIVED_TAXES_CODE,
  DERIVED_CLT_TOTAL_CODE,
]);
const HIGHLIGHTED_REVENUE_CODES = new Set([
  'taxa_ocupacao',
  'ticket_medio_plano_mensal',
  DERIVED_CAPACITY_CODE,
  DERIVED_ESTIMATED_CAPACITY_CODE,
  DERIVED_REVENUE_CODE,
]);
const SALARY_CATEGORY_ID = '__virtual_salario__';
const SEPARATOR_NAME_PREFIX = 'Separador - ';

function normalizeAssumptionLabel(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isSalaryLikeAssumption(def: Pick<AssumptionDefinition, 'code' | 'name'>): boolean {
  const normalizedCode = normalizeAssumptionLabel(def.code);
  const normalizedName = normalizeAssumptionLabel(def.name);
  return normalizedCode.startsWith('salario_') || normalizedName.startsWith('salario');
}

function isSeparatorAssumption(def: Pick<AssumptionDefinition, 'code' | 'name' | 'ui_config'>): boolean {
  if (def.ui_config?.is_separator) return true;
  const normalizedCode = normalizeAssumptionLabel(def.code);
  const normalizedName = normalizeAssumptionLabel(def.name);
  return normalizedCode.startsWith('separador_')
    || normalizedCode.startsWith('separator_')
    || normalizedName.includes('separador');
}

function getSeparatorDisplayName(name: string): string {
  return name
    .replace(/^\s*sal[aá]rio\s*-\s*/i, '')
    .replace(/^\s*separador\s*[-–—:]?\s*/i, '')
    .trim() || 'Separador';
}

function getSeparatorStyleConfig(uiConfig?: AssumptionDefinition['ui_config'] | null): SeparatorStyleConfig {
  const style = uiConfig?.separator_style ?? {};
  return {
    tone: style.tone ?? DEFAULT_SEPARATOR_STYLE.tone,
    font_size: style.font_size ?? DEFAULT_SEPARATOR_STYLE.font_size,
    bold: style.bold ?? DEFAULT_SEPARATOR_STYLE.bold,
    italic: style.italic ?? DEFAULT_SEPARATOR_STYLE.italic,
  };
}

function getSeparatorToneClasses(tone: SeparatorTone): { line: string; badge: string } {
  switch (tone) {
    case 'indigo':
    case 'blue':
      return { line: 'bg-sky-200', badge: 'border-sky-200 bg-sky-50 text-sky-700' };
    case 'emerald':
      return { line: 'bg-emerald-200', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
    case 'amber':
      return { line: 'bg-amber-200', badge: 'border-amber-200 bg-amber-50 text-amber-700' };
    case 'rose':
      return { line: 'bg-rose-200', badge: 'border-rose-200 bg-rose-50 text-rose-700' };
    case 'violet':
      return { line: 'bg-violet-200', badge: 'border-violet-200 bg-violet-50 text-violet-700' };
    default:
      return { line: 'bg-slate-200', badge: 'border-slate-200 bg-slate-50 text-slate-600' };
  }
}

function getSeparatorTextClasses(style: SeparatorStyleConfig): string {
  return cn(
    style.font_size === 'xs' && 'text-[10px]',
    style.font_size === 'sm' && 'text-[11px]',
    style.font_size === 'base' && 'text-xs',
    style.font_size === 'lg' && 'text-sm',
    style.bold ? 'font-semibold' : 'font-medium',
    style.italic && 'italic',
  );
}

function getDerivedStyleVariant(code: string): 'revenue' | 'expense' | 'neutral' {
  if (DERIVED_EXPENSE_STYLE_CODES.has(code)) return 'expense';
  if (DERIVED_REVENUE_STYLE_CODES.has(code)) return 'revenue';
  return 'neutral';
}

function getDefaultIncludeInDre(def: Pick<AssumptionDefinition, 'code' | 'ui_config' | 'include_in_dre' | 'name' | 'editable'>): boolean {
  if (isSeparatorAssumption(def)) return false;
  if (typeof def.include_in_dre === 'boolean') return def.include_in_dre;
  if (isSalaryLikeAssumption(def)) return false;
  if (DEFAULT_OUTSIDE_DRE_CODES.has(def.code)) return false;
  if (DEFAULT_INSIDE_DRE_CODES.has(def.code)) return true;
  if (def.editable === false) return false;
  return true;
}

function normalizeNewAssumptionValue(value: number, dataType: AssumptionDefinition['data_type']): number {
  if (dataType === 'percentage' && Math.abs(value) > 1) {
    return value / 100;
  }
  return value;
}

function parseCurveInputValues(raw: string, dataType: AssumptionDefinition['data_type']): number[] {
  const normalized = raw.trim();
  if (!normalized) return [];

  const chunks = normalized.includes(';')
    ? normalized.split(';')
    : normalized.split(',');

  return chunks
    .map((chunk) => Number(chunk.trim().replace(',', '.')))
    .filter((value) => Number.isFinite(value))
    .map((value) => normalizeNewAssumptionValue(value, dataType));
}

function getNewAssumptionValueLabel(dataType: AssumptionDefinition['data_type']): string {
  if (dataType === 'percentage') return 'Valor base (%)';
  if (dataType === 'currency') return 'Valor base (R$)';
  return 'Valor base';
}

function getNewAssumptionCurvePlaceholder(dataType: AssumptionDefinition['data_type']): string {
  if (dataType === 'percentage') return 'Ex: 6; 16,33; 16,33';
  return 'Ex: 12000; 14000; 16000';
}

export default function BudgetVersionClient() {
  const { versionId } = useParams<{ versionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState<'single' | 'all'>('single');
  const [dockCreateMenuOpen, setDockCreateMenuOpen] = useState(false);
  const [dockQuickCreateType, setDockQuickCreateType] = useState<'assumption' | 'separator' | 'contract' | null>(null);
  const [cellQuickMenu, setCellQuickMenu] = useState<{
    x: number;
    y: number;
    code: string;
    period: string;
    periodicity?: string;
  } | null>(null);
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [showAddContract, setShowAddContract] = useState(false);
  const [newContract, setNewContract] = useState({
    name: '',
    financed_amount: 0,
    monthly_rate: 0,
    term_months: 0,
    grace_period_months: 0,
    down_payment_pct: 0,
  });
  const [showAddAssumption, setShowAddAssumption] = useState(false);
  const [showAddSeparator, setShowAddSeparator] = useState(false);
  const [newAssumption, setNewAssumption] = useState({
    name: '',
    value: 0,
    category_code: 'CUSTO_FIXO',
    data_type: 'currency' as AssumptionDefinition['data_type'],
    growth_type: 'flat' as RuleTypeOption,
    growth_rate_pct: 0,
    curve_values: '',
    include_in_dre: true,
  });
  const [newSeparator, setNewSeparator] = useState({
    name: '',
    category_code: 'CUSTO_FIXO',
    tone: 'slate' as SeparatorTone,
    font_size: 'sm' as SeparatorFontSize,
    bold: true,
    italic: false,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [editingRuleDef, setEditingRuleDef] = useState<AssumptionDefinition | null>(null);
  const [editingMetaDef, setEditingMetaDef] = useState<AssumptionDefinition | null>(null);
  const [metaForm, setMetaForm] = useState({
    name: '',
    category_code: 'CUSTO_FIXO',
    include_in_dre: true,
    dre_bucket: '',
    separator_tone: 'slate' as SeparatorTone,
    separator_font_size: 'sm' as SeparatorFontSize,
    separator_bold: true,
    separator_italic: false,
  });
  const [draggingDefId, setDraggingDefId] = useState<string | null>(null);
  const [dragOverDefId, setDragOverDefId] = useState<string | null>(null);
  const [categoryOrderOverrides, setCategoryOrderOverrides] = useState<Record<string, string[]>>({});
  const [densityMode, setDensityMode] = useState<'compact' | 'comfortable'>('comfortable');
  const [ruleForm, setRuleForm] = useState({
    type: 'flat' as RuleTypeOption,
    ratePct: 0,
    curveValues: '',
  });
  const [bulkEditDef, setBulkEditDef] = useState<AssumptionDefinition | null>(null);
  const [bulkMode, setBulkMode] = useState<'zero' | 'range_months' | 'range_years'>('zero');
  const [bulkValue, setBulkValue] = useState(0);
  const [bulkFromPeriod, setBulkFromPeriod] = useState('');
  const [bulkToPeriod, setBulkToPeriod] = useState('');
  const [bulkFromYear, setBulkFromYear] = useState('');
  const [bulkToYear, setBulkToYear] = useState('');

  useEffect(() => {
    if (!cellQuickMenu) return;

    const closeMenu = () => setCellQuickMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [cellQuickMenu]);

  const { businessId } = useNavStore();

  // Dados
  const { data: version, isLoading: loadingVersion } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionsApi.get(versionId),
  });

  const { data: versionUnit } = useQuery({
    queryKey: ['unit', version?.unit_id],
    queryFn: () => unitsApi.get(version!.unit_id),
    enabled: !!version?.unit_id,
  });

  const effectiveBusinessId = versionUnit?.business_id ?? businessId ?? undefined;

  const { data: categories } = useQuery({
    queryKey: ['assumption-categories', effectiveBusinessId],
    queryFn: () => assumptionsApi.categories(effectiveBusinessId),
    enabled: !!effectiveBusinessId,
  });

  const { data: definitions } = useQuery({
    queryKey: ['assumption-definitions', effectiveBusinessId],
    queryFn: () => assumptionsApi.definitions(undefined, effectiveBusinessId),
    enabled: !!effectiveBusinessId,
  });

  const { data: values, isLoading: loadingValues } = useQuery({
    queryKey: ['assumption-values', versionId],
    queryFn: () => assumptionsApi.values(versionId),
  });

  const { data: servicePlans } = useQuery({
    queryKey: ['service-plans', effectiveBusinessId],
    queryFn: () => servicePlansApi.list(effectiveBusinessId!),
    enabled: !!effectiveBusinessId,
  });

  const { data: contracts } = useQuery({
    queryKey: ['financing-contracts', versionId],
    queryFn: () => financingContractsApi.list(versionId),
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['audit-version', versionId],
    queryFn: () => auditApi.byEntity('assumption_value', versionId),
    enabled: showHistory,
  });

  // Cenário desta versão — carregado para exibir/editar multiplicador de ocupação
  const { data: scenario } = useQuery({
    queryKey: ['scenario', version?.scenario_id],
    queryFn: () => scenariosApi.get(version!.scenario_id),
    enabled: !!version?.scenario_id,
  });

  const [occMultiplierInput, setOccMultiplierInput] = useState<string>('');

  const saveMultiplierMutation = useMutation({
    mutationFn: (pct: number) =>
      scenariosApi.update(scenario!.id, { occupancy_multiplier: pct / 100 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', version?.scenario_id] });
      setToast('Multiplicador de ocupação salvo! Recalcule para aplicar.');
      setTimeout(() => setToast(''), 4000);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  const addContractMutation = useMutation({
    mutationFn: () =>
      financingContractsApi.create({ ...newContract, budget_version_id: versionId, sort_order: (contracts?.length ?? 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contracts', versionId] });
      setShowAddContract(false);
      setNewContract({ name: '', financed_amount: 0, monthly_rate: 0, term_months: 0, grace_period_months: 0, down_payment_pct: 0 });
      setToast('Contrato adicionado!');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  const addAssumptionMutation = useMutation({
    mutationFn: () => {
      const isSalaryCategory = newAssumption.category_code === 'SALARIO';
      const normalizedName = isSalaryCategory && !/^\s*sal[aá]rio/i.test(newAssumption.name)
        ? `Salário - ${newAssumption.name}`
        : newAssumption.name;

      const normalizedValue = normalizeNewAssumptionValue(newAssumption.value, newAssumption.data_type);

      return assumptionsApi.quickAdd({
        budget_version_id: versionId,
        business_id: effectiveBusinessId!,
        name: normalizedName,
        value: normalizedValue,
        category_code: isSalaryCategory ? 'CUSTO_FIXO' : newAssumption.category_code,
        data_type: newAssumption.data_type,
        include_in_dre: newAssumption.include_in_dre,
        growth_rule:
          newAssumption.growth_type === 'compound_growth'
            ? { type: 'compound_growth', rate: newAssumption.growth_rate_pct / 100 }
            : newAssumption.growth_type === 'curve'
              ? {
                  type: 'curve',
                  values: parseCurveInputValues(newAssumption.curve_values, newAssumption.data_type),
                }
              : { type: 'flat' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
      setShowAddAssumption(false);
      setNewAssumption({
        name: '',
        value: 0,
        category_code: 'CUSTO_FIXO',
        data_type: 'currency',
        growth_type: 'flat',
        growth_rate_pct: 0,
        curve_values: '',
        include_in_dre: true,
      });
      setToast('Premissa adicionada!');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  const addSeparatorMutation = useMutation({
    mutationFn: () => {
      const rawName = newSeparator.name.trim();
      const label = rawName || 'Novo bloco';
      const isSalaryCategory = newSeparator.category_code === 'SALARIO';
      const separatorName = isSalaryCategory
        ? `Salário - ${SEPARATOR_NAME_PREFIX}${label}`
        : `${SEPARATOR_NAME_PREFIX}${label}`;

      return assumptionsApi.quickAdd({
        budget_version_id: versionId,
        business_id: effectiveBusinessId!,
        name: separatorName,
        value: 0,
        category_code: isSalaryCategory ? 'CUSTO_FIXO' : newSeparator.category_code,
        data_type: 'currency',
        include_in_dre: false,
        ui_config: {
          is_separator: true,
          separator_style: {
            tone: newSeparator.tone,
            font_size: newSeparator.font_size,
            bold: newSeparator.bold,
            italic: newSeparator.italic,
          },
        },
        growth_rule: { type: 'flat' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
      setShowAddSeparator(false);
      setNewSeparator({
        name: '',
        category_code: 'CUSTO_FIXO',
        tone: 'slate',
        font_size: 'sm',
        bold: true,
        italic: false,
      });
      setToast('Separador adicionado! Arraste para posicionar onde quiser.');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ definitionId, growthRule }: { definitionId: string; growthRule: AssumptionDefinitionUpdateInput['growth_rule'] }) => {
      const updated = await assumptionsApi.updateDefinition(definitionId, { growth_rule: growthRule });

      if (editingRuleDef && allPeriods.length > 0) {
        const staticKey = `${editingRuleDef.code}::static`;
        const baseValue = pendingChanges[staticKey] ?? valueMap[staticKey] ?? baseValues[editingRuleDef.code] ?? 0;
        const effectiveDef: AssumptionDefinition = {
          ...editingRuleDef,
          growth_rule: growthRule,
        };

        await assumptionsApi.bulkUpsert(versionId, [
          {
            assumption_definition_id: editingRuleDef.id,
            code: editingRuleDef.code,
            period_date: undefined,
            numeric_value: baseValue,
            source_type: 'manual',
          },
          ...allPeriods.map((period) => ({
            assumption_definition_id: editingRuleDef.id,
            code: editingRuleDef.code,
            period_date: period,
            numeric_value: computeAutoValue(effectiveDef, baseValue, period, allPeriods),
            source_type: 'derived' as const,
          })),
        ]);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      setEditingRuleDef(null);
      setToast('Regra de crescimento atualizada.');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro ao atualizar regra: ${getErrorMessage(err)}`),
  });

  const updateDefinitionMetaMutation = useMutation({
    mutationFn: ({ definitionId, payload }: { definitionId: string; payload: AssumptionDefinitionUpdateInput }) =>
      assumptionsApi.updateDefinition(definitionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
      setEditingMetaDef(null);
      setToast('Premissa atualizada.');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro ao atualizar premissa: ${getErrorMessage(err)}`),
  });

  const deleteAssumptionMutation = useMutation({
    mutationFn: (def: AssumptionDefinition) => assumptionsApi.deleteDefinition(def.id),
    onSuccess: (_data, def) => {
      setPendingChanges((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${def.code}::`))),
      );
      if (editingRuleDef?.id === def.id) setEditingRuleDef(null);
      if (bulkEditDef?.id === def.id) setBulkEditDef(null);
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
      setToast('Premissa excluída.');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro ao excluir premissa: ${getErrorMessage(err)}`),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => financingContractsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contracts', versionId] });
      setToast('Contrato removido.');
      setTimeout(() => setToast(''), 3000);
    },
  });

  // ── Horizonte completo: respeita a data final configurada na versão ──
  const allPeriods = useMemo(() => {
    if (!version?.horizon_start) return [];
    const horizonYears = version.projection_horizon_years ?? 9;
    const end = version.horizon_end || addMonths(version.horizon_start, horizonYears * 12 - 1);
    return generatePeriods(version.horizon_start, end);
  }, [version]);

  // Anos disponíveis para navegação
  const availableYears = useMemo(
    () => [...new Set(allPeriods.map((p) => p.slice(0, 4)))],
    [allPeriods],
  );

  const activeYear = selectedYear || availableYears[0] || '';

  // Períodos visíveis (12 meses do ano selecionado)
  const visiblePeriods = useMemo(
    () => allPeriods.filter((p) => p.startsWith(activeYear)),
    [allPeriods, activeYear],
  );

  // Vista anual: um item por ano; mensal: meses do ano selecionado
  const displayPeriods = viewMode === 'annual' ? availableYears : visiblePeriods;

  // Map valores: "code::period" → value; "code::static" para period_date=null
  const valueMap = useMemo(() => {
    const m: Record<string, number> = {};
    values?.forEach((v) => {
      const key = `${v.code}::${v.period_date ?? 'static'}`;
      m[key] = v.numeric_value ?? 0;
    });
    return m;
  }, [values]);

  const settingsDrivenMonthlyTicket = useMemo(() => {
    if (!servicePlans?.length) return null;
    const totalMix = servicePlans.reduce((acc, plan) => acc + (plan.target_mix_pct ?? 0), 0);
    if (totalMix <= 0) return null;

    const weightedValue = servicePlans.reduce(
      (acc, plan) => acc + plan.price_per_hour * ((plan.target_mix_pct ?? 0) / totalMix),
      0,
    );
    return Number(weightedValue.toFixed(2));
  }, [servicePlans]);

  const uiCategories = useMemo(() => {
    const baseCategories = [...(categories ?? [])];
    if (!baseCategories.some((cat) => cat.id === SALARY_CATEGORY_ID)) {
      const fixedCostSort = baseCategories.find((cat) => cat.code === 'CUSTO_FIXO')?.sort_order ?? 2;
      baseCategories.push({
        id: SALARY_CATEGORY_ID,
        name: 'Salário',
        code: 'SALARIO',
        sort_order: fixedCostSort - 0.1,
        display_order: fixedCostSort - 0.1,
      });
    }
    return baseCategories;
  }, [categories]);

  const visibleDefinitions = useMemo(() => {
    const filtered = (definitions ?? [])
      .filter((def) => !HIDDEN_ASSUMPTION_CODES.has(def.code))
      .map((def) => {
        if (isSalaryLikeAssumption(def)) {
          return {
            ...def,
            category_id: SALARY_CATEGORY_ID,
            sort_order: def.sort_order ?? 0,
            include_in_dre: getDefaultIncludeInDre(def),
          };
        }

        if (def.code === 'encargos_folha_pct') {
          return {
            ...def,
            category_id: SALARY_CATEGORY_ID,
            sort_order: 900,
            include_in_dre: false,
            description: 'Percentual aplicado automaticamente sobre todos os salários CLT desta categoria.',
          };
        }

        if (def.code === 'taxa_ocupacao') {
          return {
            ...def,
            sort_order: 999,
            include_in_dre: false,
          };
        }

        if (def.code === 'aliquota_imposto_receita') {
          return {
            ...def,
            include_in_dre: false,
            description: def.description ?? 'Imposto aplicado sobre a receita. Ano 1 = 6%; do ano 2 em diante = 16,33% por padrão.',
            growth_rule: !def.growth_rule || def.growth_rule.type === 'flat'
              ? DEFAULT_TAX_GROWTH_RULE
              : def.growth_rule,
          };
        }

        if (def.code === 'taxa_cartao_pct') {
          return {
            ...def,
            include_in_dre: false,
            description: def.description ?? 'Percentual aplicado sobre a receita total estimada. O valor em R$/mês aparece na linha pré-calculada logo abaixo.',
          };
        }

        if (def.code === 'kit_higiene_por_aluno') {
          // Driver interno usado apenas pela aba Cálculo Kit Higiene para derivar o
          // total mensal (kit_higiene_professor_calculado_mes). Não entra na DRE.
          return {
            ...def,
            name: 'Kit higiene por professor diamante ativo/mês',
            include_in_dre: false,
            editable: false,
            description: 'Custo unitário calculado automaticamente pela aba Cálculo Kit Higiene. Usado como driver intermediário; o total mensal aparece na linha pré-calculada abaixo.',
          };
        }

        if (SETTINGS_DRIVEN_ASSUMPTION_CODES.has(def.code)) {
          return {
            ...def,
            editable: false,
            include_in_dre: false,
            default_value: settingsDrivenMonthlyTicket ?? def.default_value,
            description: SETTINGS_DRIVEN_TICKET_DESCRIPTION,
            sort_order: 1000,
          };
        }

        return {
          ...def,
          include_in_dre: getDefaultIncludeInDre(def),
        };
      });
    const revenueCategoryId = categories?.find((cat) => cat.code === 'RECEITA')?.id;
    const fixedCostCategoryId = categories?.find((cat) => cat.code === 'CUSTO_FIXO')?.id;
    const variableCostCategoryId = categories?.find((cat) => cat.code === 'CUSTO_VARIAVEL')?.id;
    const fiscalCategoryId = categories?.find((cat) => cat.code === 'FISCAL')?.id;
    const occupancyCategoryId = categories?.find((cat) => cat.code === 'OCUPACAO')?.id;
    const targetCategoryId = revenueCategoryId ?? occupancyCategoryId;

    if (targetCategoryId && !filtered.some((def) => def.code === DERIVED_CAPACITY_CODE)) {
      filtered.push({
        id: DERIVED_CAPACITY_CODE,
        category_id: targetCategoryId,
        name: 'Capacidade máxima de aulas por mês',
        code: DERIVED_CAPACITY_CODE,
        description: DERIVED_CAPACITY_DESCRIPTION,
        data_type: 'numeric',
        unit_of_measure: 'h/mês',
        default_value: 4020,
        editable: false,
        include_in_dre: false,
        sort_order: 1001,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (targetCategoryId && !filtered.some((def) => def.code === DERIVED_ESTIMATED_CAPACITY_CODE)) {
      filtered.push({
        id: DERIVED_ESTIMATED_CAPACITY_CODE,
        category_id: targetCategoryId,
        name: 'Capacidade estimada de aulas por mês',
        code: DERIVED_ESTIMATED_CAPACITY_CODE,
        description: DERIVED_ESTIMATED_CAPACITY_DESCRIPTION,
        data_type: 'numeric',
        unit_of_measure: 'h/mês',
        default_value: 0,
        editable: false,
        include_in_dre: false,
        sort_order: 1002,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (revenueCategoryId && !filtered.some((def) => def.code === DERIVED_REVENUE_CODE)) {
      filtered.push({
        id: DERIVED_REVENUE_CODE,
        category_id: revenueCategoryId,
        name: 'Receita total estimada por mês (pré-calculada)',
        code: DERIVED_REVENUE_CODE,
        description: DERIVED_REVENUE_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: 1003,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    const energyDerivedSortOrder = ((filtered.find((def) => def.code === 'automacao_reducao_pct')?.sort_order as number | undefined)
      ?? (filtered.find((def) => def.code === 'custo_energia_variavel_max')?.sort_order as number | undefined)
      ?? 0) + 0.1;
    const utilitiesOccupancySortOrder = energyDerivedSortOrder - 0.01;
    const waterDerivedSortOrder = ((filtered.find((def) => def.code === 'custo_agua_variavel_max')?.sort_order as number | undefined)
      ?? (filtered.find((def) => def.code === 'custo_agua_fixo')?.sort_order as number | undefined)
      ?? 0) + 0.1;
    const taxDerivedSortOrder = ((filtered.find((def) => def.code === 'aliquota_imposto_receita')?.sort_order as number | undefined)
      ?? 0) + 0.1;
    const cardFeeDerivedSortOrder = ((filtered.find((def) => def.code === 'taxa_cartao_pct')?.sort_order as number | undefined)
      ?? 0) + 0.1;

    if (fixedCostCategoryId && !filtered.some((def) => def.code === DERIVED_UTILITIES_OCCUPANCY_CODE)) {
      filtered.push({
        id: DERIVED_UTILITIES_OCCUPANCY_CODE,
        category_id: fixedCostCategoryId,
        name: 'Taxa de ocupação (referência da Receita)',
        code: DERIVED_UTILITIES_OCCUPANCY_CODE,
        description: DERIVED_UTILITIES_OCCUPANCY_DESCRIPTION,
        data_type: 'percentage',
        unit_of_measure: '%',
        default_value: 0,
        editable: false,
        include_in_dre: false,
        sort_order: utilitiesOccupancySortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (fixedCostCategoryId && !filtered.some((def) => def.code === DERIVED_ELECTRICITY_CODE)) {
      filtered.push({
        id: DERIVED_ELECTRICITY_CODE,
        category_id: fixedCostCategoryId,
        name: '⚡ Energia elétrica — total estimado (pré-calculado)',
        code: DERIVED_ELECTRICITY_CODE,
        description: DERIVED_ELECTRICITY_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: energyDerivedSortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (fixedCostCategoryId && !filtered.some((def) => def.code === DERIVED_WATER_CODE)) {
      filtered.push({
        id: DERIVED_WATER_CODE,
        category_id: fixedCostCategoryId,
        name: '💧 Água — total estimado (pré-calculado)',
        code: DERIVED_WATER_CODE,
        description: DERIVED_WATER_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: waterDerivedSortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    // kit_higiene_por_aluno está oculto; ancora pelo sort_order da comissão de vendas
    // (primeira linha visível da categoria CUSTO_VARIAVEL) — instrui o pré-calculado a aparecer antes.
    const hygieneDerivedSortOrder = ((filtered.find((def) => def.code === 'comissao_vendas_pct')?.sort_order as number | undefined)
      ?? 1) - 0.1;

    if (variableCostCategoryId && !filtered.some((def) => def.code === DERIVED_HYGIENE_KIT_CODE)) {
      filtered.push({
        id: DERIVED_HYGIENE_KIT_CODE,
        category_id: variableCostCategoryId,
        name: 'Kit higiene professor/mês (pré-calculado)',
        code: DERIVED_HYGIENE_KIT_CODE,
        description: DERIVED_HYGIENE_KIT_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: hygieneDerivedSortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (fiscalCategoryId && !filtered.some((def) => def.code === DERIVED_TAXES_CODE)) {
      filtered.push({
        id: DERIVED_TAXES_CODE,
        category_id: fiscalCategoryId,
        name: 'Impostos — total estimado (pré-calculado)',
        code: DERIVED_TAXES_CODE,
        description: DERIVED_TAXES_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: taxDerivedSortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (fiscalCategoryId && !filtered.some((def) => def.code === DERIVED_CARD_FEE_CODE)) {
      filtered.push({
        id: DERIVED_CARD_FEE_CODE,
        category_id: fiscalCategoryId,
        name: 'Taxa de cartão — custo estimado (pré-calculado)',
        code: DERIVED_CARD_FEE_CODE,
        description: DERIVED_CARD_FEE_DESCRIPTION,
        data_type: 'currency',
        unit_of_measure: 'R$/mês',
        default_value: 0,
        editable: false,
        include_in_dre: true,
        sort_order: cardFeeDerivedSortOrder,
        periodicity: 'monthly',
        growth_rule: null,
      });
    }

    if (fixedCostCategoryId && !filtered.some((def) => def.code === DERIVED_CLT_BASE_CODE)) {
      filtered.push(
        {
          id: DERIVED_CLT_BASE_CODE,
          category_id: SALARY_CATEGORY_ID,
          name: 'Salário base total (pré-calculado)',
          code: DERIVED_CLT_BASE_CODE,
          description: DERIVED_CLT_BASE_DESCRIPTION,
          data_type: 'currency',
          unit_of_measure: 'R$/mês',
          default_value: 0,
          editable: false,
          include_in_dre: false,
          sort_order: 890,
          periodicity: 'monthly',
          growth_rule: null,
        },
        {
          id: DERIVED_CLT_CHARGES_CODE,
          category_id: SALARY_CATEGORY_ID,
          name: 'Encargos calculados sobre a folha',
          code: DERIVED_CLT_CHARGES_CODE,
          description: DERIVED_CLT_CHARGES_DESCRIPTION,
          data_type: 'currency',
          unit_of_measure: 'R$/mês',
          default_value: 0,
          editable: false,
          include_in_dre: false,
          sort_order: 910,
          periodicity: 'monthly',
          growth_rule: null,
        },
        {
          id: DERIVED_CLT_TOTAL_CODE,
          category_id: SALARY_CATEGORY_ID,
          name: 'Total após encargos (pré-calculado)',
          code: DERIVED_CLT_TOTAL_CODE,
          description: DERIVED_CLT_TOTAL_DESCRIPTION,
          data_type: 'currency',
          unit_of_measure: 'R$/mês',
          default_value: 0,
          editable: false,
          include_in_dre: true,
          sort_order: 920,
          periodicity: 'monthly',
          growth_rule: null,
        },
      );
    }

    return filtered;
  }, [definitions, categories, settingsDrivenMonthlyTicket]);

  // Valores base por definição (static > primeiro período > default)
  const baseValues = useMemo(() => {
    const result: Record<string, number> = {};
    visibleDefinitions.forEach((def) => {
      const staticPending = pendingChanges[`${def.code}::static`];
      const firstPeriod = allPeriods[0];
      const firstPeriodPending = firstPeriod ? pendingChanges[`${def.code}::${firstPeriod}`] : undefined;
      const hasGrowthRule = hasActiveGrowthRule(def);

      result[def.code] =
        staticPending ??
        valueMap[`${def.code}::static`] ??
        // Para premissas com growth_rule, override mensal não deve virar base global.
        (!hasGrowthRule ? firstPeriodPending : undefined) ??
        (firstPeriod ? valueMap[`${def.code}::${firstPeriod}`] : undefined) ??
        (typeof def.default_value === 'number' ? def.default_value : 0);
    });
    return result;
  }, [visibleDefinitions, pendingChanges, valueMap, allPeriods]);

  // Valores auto-expandidos pelo growth_rule (preview client-side)
  const autoValues = useMemo(() => {
    const result: Record<string, number> = {};
    if (!visibleDefinitions.length || !allPeriods.length) return result;
    visibleDefinitions.forEach((def) => {
      if (!def.growth_rule) return;
      const base = baseValues[def.code] ?? 0;
      allPeriods.forEach((p) => {
        result[`${def.code}::${p}`] = computeAutoValue(def, base, p, allPeriods);
      });
    });
    return result;
  }, [visibleDefinitions, baseValues, allPeriods]);

  const definitionPeriodicityByCode = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    visibleDefinitions.forEach((def) => {
      map[def.code] = def.periodicity;
    });
    return map;
  }, [visibleDefinitions]);

  const definitionByCode = useMemo(() => {
    const map: Record<string, AssumptionDefinition> = {};
    visibleDefinitions.forEach((def) => {
      map[def.code] = def;
    });
    return map;
  }, [visibleDefinitions]);

  type CellInfo = { value: number; isAuto: boolean };

  const getStoredCellValue = useCallback(
    (code: string, period: string, periodicity?: string): CellInfo => {
      const makeCellInfo = (value: number, isAuto: boolean): CellInfo => ({
        value: normalizeComputedValue(value),
        isAuto,
      });

      if (SETTINGS_DRIVEN_ASSUMPTION_CODES.has(code) && settingsDrivenMonthlyTicket != null) {
        return makeCellInfo(settingsDrivenMonthlyTicket, true);
      }

      // Premissas estáticas usam base global, mas podem receber overrides por período.
      if (periodicity === 'static') {
        const periodKey = `${code}::${period}`;
        if (periodKey in pendingChanges) return makeCellInfo(pendingChanges[periodKey], false);
        if (periodKey in valueMap) return makeCellInfo(valueMap[periodKey], false);

        const autoKey = `${code}::${period}`;
        if (autoKey in autoValues) return makeCellInfo(autoValues[autoKey], true);

        const k = `${code}::static`;
        if (k in pendingChanges) return makeCellInfo(pendingChanges[k], false);
        if (k in valueMap) return makeCellInfo(valueMap[k], false);
        return makeCellInfo(baseValues[code] ?? 0, false);
      }

      const pendKey = `${code}::${period}`;
      if (pendKey in pendingChanges) return makeCellInfo(pendingChanges[pendKey], false);
      const staticKey = `${code}::static`;
      if (hasActiveGrowthRule(definitionByCode[code]) && staticKey in pendingChanges && pendKey in autoValues) {
        return makeCellInfo(autoValues[pendKey], true);
      }
      if (pendKey in valueMap) return makeCellInfo(valueMap[pendKey], false);
      if (pendKey in autoValues) return makeCellInfo(autoValues[pendKey], true);
      if (staticKey in pendingChanges) return makeCellInfo(pendingChanges[staticKey], false);
      if (staticKey in valueMap) return makeCellInfo(valueMap[staticKey], false);
      return makeCellInfo(baseValues[code] ?? 0, false);
    },
    [pendingChanges, valueMap, autoValues, baseValues, settingsDrivenMonthlyTicket, definitionByCode],
  );

  const calculateDerivedCapacity = useCallback(
    (period: string) => {
      const lookup = (code: string) =>
        getStoredCellValue(code, period, definitionPeriodicityByCode[code]).value;

      const slotsPerHour = lookup('slots_por_hora');
      const weekdayHours = lookup('horas_dia_util');
      const saturdayHours = lookup('horas_dia_sabado');
      const workingDays = lookup('dias_uteis_mes');
      const saturdays = lookup('sabados_mes');

      const capacity = (workingDays * weekdayHours + saturdays * saturdayHours) * slotsPerHour;
      return Math.round(capacity * 100) / 100;
    },
    [definitionPeriodicityByCode, getStoredCellValue],
  );

  const calculateDerivedEstimatedCapacity = useCallback(
    (period: string) => {
      const occupancyRate = getStoredCellValue('taxa_ocupacao', period, definitionPeriodicityByCode.taxa_ocupacao).value;
      const estimatedCapacity = calculateDerivedCapacity(period) * occupancyRate;
      return Math.round(estimatedCapacity * 100) / 100;
    },
    [calculateDerivedCapacity, definitionPeriodicityByCode.taxa_ocupacao, getStoredCellValue],
  );

  const calculateDerivedElectricityCost = useCallback(
    (period: string) => {
      const fixedEnergy = getStoredCellValue('custo_energia_fixo', period, definitionPeriodicityByCode.custo_energia_fixo).value;
      const maxVariableEnergy = getStoredCellValue('custo_energia_variavel_max', period, definitionPeriodicityByCode.custo_energia_variavel_max).value;
      const occupancyRate = getStoredCellValue('taxa_ocupacao', period, definitionPeriodicityByCode.taxa_ocupacao).value;
      const automationReduction = getStoredCellValue('automacao_reducao_pct', period, definitionPeriodicityByCode.automacao_reducao_pct).value;
      const totalBeforeAutomation = fixedEnergy + maxVariableEnergy * occupancyRate;
      const total = totalBeforeAutomation * Math.max(0, 1 - automationReduction);
      return Math.round(total * 100) / 100;
    },
    [definitionPeriodicityByCode, getStoredCellValue],
  );

  const calculateDerivedWaterCost = useCallback(
    (period: string) => {
      const fixedWater = getStoredCellValue('custo_agua_fixo', period, definitionPeriodicityByCode.custo_agua_fixo).value;
      const maxVariableWater = getStoredCellValue('custo_agua_variavel_max', period, definitionPeriodicityByCode.custo_agua_variavel_max).value;
      const occupancyRate = getStoredCellValue('taxa_ocupacao', period, definitionPeriodicityByCode.taxa_ocupacao).value;
      const total = fixedWater + maxVariableWater * occupancyRate;
      return Math.round(total * 100) / 100;
    },
    [definitionPeriodicityByCode, getStoredCellValue],
  );

  const calculateDerivedCltBase = useCallback(
    (period: string) => {
      const salaryDefinitions = visibleDefinitions.filter(
        (def) => def.code !== DERIVED_CLT_BASE_CODE
          && def.code !== DERIVED_CLT_CHARGES_CODE
          && def.code !== DERIVED_CLT_TOTAL_CODE
          && def.code !== DERIVED_CAPACITY_CODE
          && def.code !== DERIVED_REVENUE_CODE
          && def.code !== DERIVED_ELECTRICITY_CODE
          && def.code !== DERIVED_WATER_CODE
          && isSalaryLikeAssumption(def),
      );

      const cltBase = salaryDefinitions.reduce(
        (acc, def) => acc + getStoredCellValue(def.code, period, def.periodicity).value,
        0,
      );

      return Math.round(cltBase * 100) / 100;
    },
    [categories, getStoredCellValue, visibleDefinitions],
  );

  const calculateDerivedCltCharges = useCallback(
    (period: string) => {
      const chargesRate = getStoredCellValue('encargos_folha_pct', period, definitionPeriodicityByCode.encargos_folha_pct).value;
      return Math.round(calculateDerivedCltBase(period) * chargesRate * 100) / 100;
    },
    [calculateDerivedCltBase, definitionPeriodicityByCode.encargos_folha_pct, getStoredCellValue],
  );

  const calculateDerivedRevenue = useCallback(
    (period: string) => {
      const avgTicket = getStoredCellValue('ticket_medio_plano_mensal', period, definitionPeriodicityByCode.ticket_medio_plano_mensal).value;
      const otherRevenue = getStoredCellValue('outras_receitas', period, definitionPeriodicityByCode.outras_receitas).value;
      const revenue = calculateDerivedEstimatedCapacity(period) * avgTicket + otherRevenue;
      return Math.round(revenue * 100) / 100;
    },
    [calculateDerivedEstimatedCapacity, definitionPeriodicityByCode, getStoredCellValue],
  );

  const calculateDerivedCardFeeCost = useCallback(
    (period: string) => {
      const cardFeeRate = getStoredCellValue('taxa_cartao_pct', period, definitionPeriodicityByCode.taxa_cartao_pct).value;
      return Math.round(calculateDerivedRevenue(period) * cardFeeRate * 100) / 100;
    },
    [calculateDerivedRevenue, definitionPeriodicityByCode.taxa_cartao_pct, getStoredCellValue],
  );

  const calculateDerivedHygieneKitProfessor = useCallback(
    (period: string) => {
      const perStudent = getStoredCellValue('kit_higiene_por_aluno', period, definitionPeriodicityByCode.kit_higiene_por_aluno).value;
      const monthlyCapacity = getStoredCellValue('capacidade_maxima_mes', period, definitionPeriodicityByCode.capacidade_maxima_mes).value;
      const occupancyRate = getStoredCellValue('taxa_ocupacao', period, definitionPeriodicityByCode.taxa_ocupacao).value;
      const activeStudents = Math.max(0, monthlyCapacity * occupancyRate);
      return Math.round(perStudent * activeStudents * 100) / 100;
    },
    [definitionPeriodicityByCode, getStoredCellValue],
  );

  const calculateDerivedTaxCost = useCallback(
    (period: string) => {
      const taxRate = getStoredCellValue('aliquota_imposto_receita', period, definitionPeriodicityByCode.aliquota_imposto_receita).value;
      return Math.round(calculateDerivedRevenue(period) * taxRate * 100) / 100;
    },
    [calculateDerivedRevenue, definitionPeriodicityByCode.aliquota_imposto_receita, getStoredCellValue],
  );

  const getCellValue = useCallback(
    (code: string, period: string, periodicity?: string): CellInfo => {
      if (code === DERIVED_CAPACITY_CODE) {
        return { value: calculateDerivedCapacity(period), isAuto: true };
      }
      if (code === DERIVED_ESTIMATED_CAPACITY_CODE) {
        return { value: calculateDerivedEstimatedCapacity(period), isAuto: true };
      }
      if (code === DERIVED_REVENUE_CODE) {
        return { value: calculateDerivedRevenue(period), isAuto: true };
      }
      if (code === DERIVED_TAXES_CODE) {
        return { value: calculateDerivedTaxCost(period), isAuto: true };
      }
      if (code === DERIVED_CARD_FEE_CODE) {
        return { value: calculateDerivedCardFeeCost(period), isAuto: true };
      }
      if (code === DERIVED_HYGIENE_KIT_CODE) {
        const periodKey = `${code}::${period}`;
        const staticKey = `${code}::static`;
        const hasStoredValue = periodKey in pendingChanges
          || periodKey in valueMap
          || staticKey in pendingChanges
          || staticKey in valueMap;

        if (hasStoredValue) {
          return getStoredCellValue(code, period, periodicity ?? definitionPeriodicityByCode[code]);
        }

        return { value: calculateDerivedHygieneKitProfessor(period), isAuto: true };
      }
      if (code === DERIVED_ELECTRICITY_CODE) {
        return { value: calculateDerivedElectricityCost(period), isAuto: true };
      }
      if (code === DERIVED_UTILITIES_OCCUPANCY_CODE) {
        const occupancy = getStoredCellValue('taxa_ocupacao', period, definitionPeriodicityByCode.taxa_ocupacao).value;
        return { value: Math.round(occupancy * 10000) / 10000, isAuto: true };
      }
      if (code === DERIVED_WATER_CODE) {
        return { value: calculateDerivedWaterCost(period), isAuto: true };
      }
      if (code === DERIVED_CLT_BASE_CODE) {
        return { value: calculateDerivedCltBase(period), isAuto: true };
      }
      if (code === DERIVED_CLT_CHARGES_CODE) {
        return { value: calculateDerivedCltCharges(period), isAuto: true };
      }
      if (code === DERIVED_CLT_TOTAL_CODE) {
        return { value: Math.round((calculateDerivedCltBase(period) + calculateDerivedCltCharges(period)) * 100) / 100, isAuto: true };
      }
      return getStoredCellValue(code, period, periodicity);
    },
    [
      calculateDerivedCapacity,
      calculateDerivedCardFeeCost,
      calculateDerivedCltBase,
      calculateDerivedCltCharges,
      calculateDerivedElectricityCost,
      calculateDerivedEstimatedCapacity,
      calculateDerivedHygieneKitProfessor,
      calculateDerivedRevenue,
      calculateDerivedTaxCost,
      calculateDerivedWaterCost,
      definitionPeriodicityByCode,
      getStoredCellValue,
      pendingChanges,
      valueMap,
    ],
  );

  // Agrega valores mensais em totais/médias anuais para a vista "Anual"
  const getAnnualCellValue = useCallback(
    (code: string, year: string, periodicity?: string): CellInfo => {
      const monthsOfYear = allPeriods.filter((p) => p.startsWith(year));
      if (!monthsOfYear.length) return { value: 0, isAuto: false };
      const def = definitionByCode[code];
      const isPct = def?.data_type === 'percentage';
      const vals = monthsOfYear.map((p) => getCellValue(code, p, periodicity).value);
      const aggregated = isPct
        ? vals.reduce((a, v) => a + v, 0) / vals.length  // média para percentuais
        : vals.reduce((a, v) => a + v, 0);               // soma para moeda/numérico
      return { value: Math.round(aggregated * 100) / 100, isAuto: false };
    },
    [allPeriods, getCellValue, definitionByCode],
  );

  const parseEditableNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let normalized = trimmed.replace(/\s+/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }

    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  };

  const formatEditableValue = (value: number): string => {
    if (!Number.isFinite(value)) return '';
    return `${value}`.replace('.', ',');
  };

  const resolveEditableKey = (code: string, period: string, periodicity?: string) => {
    const definition = definitionByCode[code];
    // Para premissas com curva ativa, permitir override manual por coluna
    // mesmo quando a periodicidade-base é static.
    if (periodicity === 'static' && !hasActiveGrowthRule(definition)) return `${code}::static`;
    return `${code}::${period}`;
  };

  // Em "Editar todos", espalha o mesmo valor para todos os meses da linha.
  const handleCellChange = (code: string, period: string, raw: string, periodicity?: string) => {
    const key = resolveEditableKey(code, period, periodicity);
    const draftKey = `${code}::${period}`;
    setCellDrafts((prev) => ({ ...prev, [draftKey]: raw }));

    const parsed = parseEditableNumber(raw);

    const hasGrowthRule = hasActiveGrowthRule(definitionByCode[code]);

    if (editMode === 'all' && (periodicity !== 'static' || hasGrowthRule)) {
      if (parsed === null) {
        if (raw.trim() === '') {
          setPendingChanges((prev) => {
            const next = { ...prev };
            delete next[`${code}::static`];
            allPeriods.forEach((p) => {
              delete next[`${code}::${p}`];
            });
            return next;
          });
        }
        return;
      }

      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[`${code}::static`];
        allPeriods.forEach((p) => {
          next[`${code}::${p}`] = parsed;
        });
        return next;
      });
      return;
    }

    if (parsed === null) {
      if (raw.trim() === '') {
        setPendingChanges((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      return;
    }

    setPendingChanges((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleCellBlur = (code: string, period: string, periodicity?: string) => {
    const key = `${code}::${period}`;
    setCellDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const openRuleEditor = (def: AssumptionDefinition) => {
    const currentRule = def.growth_rule;
    const type: RuleTypeOption = (currentRule?.type as RuleTypeOption) || 'flat';
    setEditingRuleDef(def);
    setRuleForm({
      type,
      ratePct: typeof currentRule?.rate === 'number' ? Number((currentRule.rate * 100).toFixed(2)) : 0,
      curveValues: Array.isArray(currentRule?.values) ? currentRule.values.join(', ') : '',
    });
  };

  const openMetaEditor = (def: AssumptionDefinition) => {
    const currentCategoryCode = def.code === 'encargos_folha_pct' || isSalaryLikeAssumption(def)
      ? 'SALARIO'
      : uiCategories.find((cat) => cat.id === def.category_id)?.code
        ?? categories?.find((cat) => cat.id === def.category_id)?.code
        ?? 'CUSTO_FIXO';
    const separatorStyle = getSeparatorStyleConfig(def.ui_config);

    setEditingMetaDef(def);
    setMetaForm({
      name: def.name,
      category_code: currentCategoryCode,
      include_in_dre: def.include_in_dre !== false,
      dre_bucket: def.ui_config?.dre_bucket ?? '',
      separator_tone: separatorStyle.tone,
      separator_font_size: separatorStyle.font_size,
      separator_bold: separatorStyle.bold,
      separator_italic: separatorStyle.italic,
    });
  };

  const saveRuleEdit = () => {
    if (!editingRuleDef) return;
    let growthRule: AssumptionDefinitionUpdateInput['growth_rule'] = null;

    if (ruleForm.type === 'compound_growth') {
      growthRule = { type: 'compound_growth', rate: ruleForm.ratePct / 100 };
    } else if (ruleForm.type === 'curve') {
      growthRule = {
        type: 'curve',
        values: ruleForm.curveValues
          .split(',')
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !Number.isNaN(v)),
      };
    } else {
      growthRule = { type: 'flat' };
    }

    updateRuleMutation.mutate({ definitionId: editingRuleDef.id, growthRule });
  };

  const saveMetaEdit = () => {
    if (!editingMetaDef) return;

    const rawName = metaForm.name.trim();
    if (!rawName) {
      setToast('O nome da premissa não pode ficar vazio.');
      return;
    }

    const fixedCostCategoryId = categories?.find((cat) => cat.code === 'CUSTO_FIXO')?.id;
    const resolvedCategoryId = metaForm.category_code === 'SALARIO'
      ? (fixedCostCategoryId ?? editingMetaDef.category_id)
      : (uiCategories.find((cat) => cat.code === metaForm.category_code)?.id
        ?? categories?.find((cat) => cat.code === metaForm.category_code)?.id
        ?? editingMetaDef.category_id);

    const normalizedName = metaForm.category_code === 'SALARIO'
      ? (/^\s*sal[aá]rio/i.test(rawName) ? rawName : `Salário - ${rawName}`)
      : rawName.replace(/^\s*sal[aá]rio\s*-\s*/i, '').trim();

    const isSeparator = isSeparatorAssumption(editingMetaDef);
    // Constrói ui_config preservando campos existentes e atualizando dre_bucket
    const uiConfigBase: Record<string, unknown> = { ...(editingMetaDef.ui_config ?? {}) };
    let nextUiConfig: typeof editingMetaDef.ui_config;
    if (isSeparator) {
      nextUiConfig = {
          ...uiConfigBase,
          is_separator: true,
          separator_style: {
            tone: metaForm.separator_tone,
            font_size: metaForm.separator_font_size,
            bold: metaForm.separator_bold,
            italic: metaForm.separator_italic,
          },
        } as typeof editingMetaDef.ui_config;
    } else {
      if (metaForm.dre_bucket) {
        uiConfigBase.dre_bucket = metaForm.dre_bucket;
      } else {
        delete uiConfigBase.dre_bucket;
      }
      nextUiConfig = Object.keys(uiConfigBase).length ? uiConfigBase as typeof editingMetaDef.ui_config : null;
    }

    updateDefinitionMetaMutation.mutate({
      definitionId: editingMetaDef.id,
      payload: {
        name: normalizedName,
        category_id: resolvedCategoryId,
        include_in_dre: isSeparator ? false : metaForm.include_in_dre,
        ui_config: nextUiConfig,
      },
    });
  };

  const reorderDefinitions = async (
    categoryId: string,
    categoryDefs: AssumptionDefinition[],
    draggedDef: AssumptionDefinition,
    targetDef: AssumptionDefinition,
  ) => {
    if (draggedDef.id === targetDef.id) return;

    const orderedDefs = [...categoryDefs]
      .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0));

    const fromIndex = orderedDefs.findIndex((item) => item.id === draggedDef.id);
    const toIndex = orderedDefs.findIndex((item) => item.id === targetDef.id);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const reordered = [...orderedDefs];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);

    setCategoryOrderOverrides((prev) => ({
      ...prev,
      [categoryId]: reordered.map((item) => item.id),
    }));

    const persistedDefs = orderedDefs.filter((item) => isPersistedDefinitionId(item.id));
    const reorderedPersisted = reordered.filter((item) => isPersistedDefinitionId(item.id));
    if (!persistedDefs.length || !reorderedPersisted.length) {
      setToast('Ordem visual atualizada.');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    const orderSlots = persistedDefs.map((item, index) => Number(item.sort_order ?? item.display_order ?? index));
    const updates = reorderedPersisted
      .map((item, index) => ({
        definitionId: item.id,
        nextSortOrder: orderSlots[index],
        currentSortOrder: Number(item.sort_order ?? item.display_order ?? index),
      }))
      .filter((item) => item.currentSortOrder !== item.nextSortOrder);

    if (!updates.length) {
      setToast('Ordem visual atualizada.');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    await Promise.all(
      updates.map((item) =>
        assumptionsApi.updateDefinition(item.definitionId, { sort_order: item.nextSortOrder }),
      ),
    );

    queryClient.invalidateQueries({ queryKey: ['assumption-definitions'] });
    setToast('Ordem da premissa atualizada.');
    setTimeout(() => setToast(''), 3000);
  };

  const moveDefinition = async (
    categoryId: string,
    categoryDefs: AssumptionDefinition[],
    definition: AssumptionDefinition,
    swapWith: AssumptionDefinition | undefined,
  ) => {
    if (!swapWith) return;
    try {
      await reorderDefinitions(categoryId, categoryDefs, definition, swapWith);
    } catch (err) {
      setToast(`Erro ao reordenar premissa: ${getErrorMessage(err)}`);
    }
  };

  const dropDefinition = async (
    categoryId: string,
    categoryDefs: AssumptionDefinition[],
    targetDef: AssumptionDefinition,
  ) => {
    const draggedDef = categoryDefs.find((item) => item.id === draggingDefId);
    setDragOverDefId(null);
    setDraggingDefId(null);

    if (!draggedDef || draggedDef.id === targetDef.id) {
      return;
    }

    try {
      await reorderDefinitions(categoryId, categoryDefs, draggedDef, targetDef);
    } catch (err) {
      setToast(`Erro ao reordenar premissa: ${getErrorMessage(err)}`);
    }
  };

  const applyBulkEdit = () => {
    if (!bulkEditDef) return;
    const code = bulkEditDef.code;
    const growthDriven = hasActiveGrowthRule(bulkEditDef);

    if (bulkMode === 'zero') {
      const entries: Record<string, number> = {};
      entries[`${code}::static`] = 0;
      allPeriods.forEach((p) => {
        entries[`${code}::${p}`] = 0;
      });
      setPendingChanges((prev) => ({ ...prev, ...entries }));
      setBulkEditDef(null);
      return;
    }

    let periodsToUpdate: string[] = [];
    if (bulkMode === 'range_months') {
      if (!bulkFromPeriod || !bulkToPeriod) return;
      periodsToUpdate = generatePeriods(bulkFromPeriod, bulkToPeriod);
    } else {
      if (!bulkFromYear || !bulkToYear) return;
      periodsToUpdate = generatePeriods(`${bulkFromYear}-01`, `${bulkToYear}-12`);
    }

    const filteredPeriods = periodsToUpdate.filter((p) => allPeriods.includes(p));
    const entries: Record<string, number> = {};

    if (growthDriven && filteredPeriods.length > 0) {
      const growthBaseYear = bulkMode === 'range_years'
        ? parseInt(bulkFromYear || filteredPeriods[0].slice(0, 4), 10)
        : parseInt(filteredPeriods[0].slice(0, 4), 10);
      const defForPreview: AssumptionDefinition = {
        ...bulkEditDef,
        growth_rule: bulkEditDef.growth_rule
          ? { ...bulkEditDef.growth_rule, base_year: growthBaseYear }
          : bulkEditDef.growth_rule,
      };

      entries[`${code}::static`] = bulkValue;
      filteredPeriods.forEach((p) => {
        entries[`${code}::${p}`] = computeAutoValue(defForPreview, bulkValue, p, allPeriods);
      });
    } else {
      filteredPeriods.forEach((p) => {
        entries[`${code}::${p}`] = bulkValue;
      });
      if (bulkEditDef.periodicity === 'static') {
        entries[`${code}::static`] = bulkValue;
      }
    }

    setPendingChanges((prev) => ({ ...prev, ...entries }));
    setBulkEditDef(null);
  };

  // Bulk upsert — salva apenas mudanças pendentes
  const handleSave = async (): Promise<boolean> => {
    if (!definitions) return false;
    setSaving(true);
    try {
      const touchedCodes = [...new Set(Object.keys(pendingChanges).map((key) => key.split('::')[0]))];
      const updates: Partial<AssumptionValue>[] = [];

      touchedCodes.forEach((code) => {
        const def = definitions.find((d) => d.code === code);
        if (!def) return;

        if (hasActiveGrowthRule(def) && allPeriods.length > 0) {
          const existingManualPeriods = new Set(
            (values ?? [])
              .filter((item) => item.code === code && item.period_date && item.source_type === 'manual')
              .map((item) => item.period_date as string),
          );

          const nonStaticPendingPeriods = Object.keys(pendingChanges)
            .filter((key) => key.startsWith(`${code}::`) && !key.endsWith('::static'))
            .map((key) => key.split('::')[1])
            .sort();
          const pendingManualPeriods = new Set(nonStaticPendingPeriods);
          const manualPeriodOverrides = new Set([...existingManualPeriods, ...nonStaticPendingPeriods]);
          const growthBaseYear = def.growth_rule?.base_year
            ?? (nonStaticPendingPeriods[0] ? parseInt(nonStaticPendingPeriods[0].slice(0, 4), 10) : parseInt(allPeriods[0].slice(0, 4), 10));
          const firstPeriod = allPeriods[0];
          const baseValue = pendingChanges[`${code}::static`]
            ?? valueMap[`${code}::static`]
            ?? (firstPeriod ? valueMap[`${code}::${firstPeriod}`] : undefined)
            ?? (typeof def.default_value === 'number' ? def.default_value : 0);
          const defForSave: AssumptionDefinition = {
            ...def,
            growth_rule: def.growth_rule
              ? { ...def.growth_rule, base_year: growthBaseYear }
              : def.growth_rule,
          };

          updates.push({
            assumption_definition_id: def.id,
            code,
            period_date: undefined,
            numeric_value: baseValue,
            source_type: 'manual' as const,
          });

          allPeriods.forEach((period) => {
            const hasPendingManualOverride = pendingManualPeriods.has(period);
            const hasExistingManualOverride = existingManualPeriods.has(period);
            const hasManualOverride = manualPeriodOverrides.has(period);
            const manualValue = hasPendingManualOverride
              ? pendingChanges[`${code}::${period}`]
              : hasExistingManualOverride
                ? valueMap[`${code}::${period}`]
                : undefined;

            updates.push({
              assumption_definition_id: def.id,
              code,
              period_date: period,
              numeric_value: hasManualOverride
                ? (manualValue ?? computeAutoValue(defForSave, baseValue, period, allPeriods))
                : computeAutoValue(defForSave, baseValue, period, allPeriods),
              source_type: hasManualOverride ? ('manual' as const) : ('derived' as const),
            });
          });
          return;
        }

        Object.entries(pendingChanges)
          .filter(([key]) => key.startsWith(`${code}::`))
          .forEach(([key, num]) => {
            const [, period] = key.split('::');
            updates.push({
              assumption_definition_id: def.id,
              code,
              period_date: period === 'static' ? undefined : period,
              numeric_value: num,
              source_type: 'manual' as const,
            });
          });
      });

      await assumptionsApi.bulkUpsert(versionId, updates);
      setPendingChanges({});
      setCellDrafts({});
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      setToast('Premissas salvas!');
      setTimeout(() => setToast(''), 3000);
      return true;
    } catch (err) {
      setToast(`Erro: ${getErrorMessage(err)}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (saving || recalcMutation.isPending) return;

    if (Object.keys(pendingChanges).length > 0) {
      const saved = await handleSave();
      if (!saved) return;
    }

    recalcMutation.mutate();
  };

  // Recalcular
  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(versionId),
    onSuccess: (data) => {
      setToast(`Calculado: ${data.periods_calculated} períodos`);
      setTimeout(() => setToast(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['dre'] });
      queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
      router.push(`/results/${versionId}`);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  // Copiloto NLP (Sprint 6)
  const [nlpCommand, setNlpCommand] = useState('');
  const [copilotResult, setCopilotResult] = useState<CopilotScenarioResponse | null>(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const copilotMutation = useMutation({
    mutationFn: () =>
      aiApi.scenarioCopilot({ budget_version_id: versionId, command: nlpCommand, dry_run: true }),
    onSuccess: (data) => {
      setCopilotResult(data);
      setShowCopilot(true);
    },
    onError: (err) => setToast(`Erro Copiloto: ${getErrorMessage(err)}`),
  });

  if (loadingVersion || loadingValues) return <LoadingScreen />;
  if (!version) return <div className="p-8 text-red-500">Versão não encontrada</div>;

  const hasChanges = Object.keys(pendingChanges).length > 0;
  const newAssumptionValueLabel = getNewAssumptionValueLabel(newAssumption.data_type);
  const newAssumptionCurvePlaceholder = getNewAssumptionCurvePlaceholder(newAssumption.data_type);
  const newAssumptionHelperText = newAssumption.data_type === 'percentage'
    ? 'Para percentuais, digite 3,5 = 3,5% ou 0,035 se preferir o formato decimal. Em Custos Variáveis/Fiscal, o cálculo será aplicado sobre a receita.'
    : 'Use Moeda para valores fixos em R$/mês e Percentual para regras como cartão, comissão ou imposto sobre receita.';
  const newSeparatorPreviewStyle = getSeparatorStyleConfig({
    separator_style: {
      tone: newSeparator.tone,
      font_size: newSeparator.font_size,
      bold: newSeparator.bold,
      italic: newSeparator.italic,
    },
  });
  const newSeparatorToneClasses = getSeparatorToneClasses(newSeparatorPreviewStyle.tone);
  const isCompactDensity = densityMode === 'compact';
  const headerCellY = isCompactDensity ? 'py-2' : 'py-3';
  const rowCellY = isCompactDensity ? 'py-1.5' : 'py-2';
  const valueTextSize = isCompactDensity ? 'text-[11px]' : 'text-xs';
  const inputPaddingY = isCompactDensity ? 'py-0.5' : 'py-1';

  return (
    <>
      <Topbar title={`Orçamento — ${version.name}`} />
      <div className="flex-1 flex flex-col p-6">
        {/* Header da versão */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={version.status} />
            <span className="text-sm text-gray-500">
              {version.horizon_start} → {version.horizon_end}
              <span className="ml-2 text-gray-400">({availableYears.length} anos · {allPeriods.length} meses)</span>
            </span>
            {hasChanges && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {Object.keys(pendingChanges).length} alteração(ões) não salvas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="h-4 w-4" /> Histórico
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button size="sm" onClick={() => { void handleRecalculate(); }} loading={recalcMutation.isPending} disabled={saving}>
              <PlayCircle className="h-4 w-4" /> Recalcular
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
            {toast}
          </div>
        )}

        {/* Multiplicador de Ocupação — visível apenas para cenários não-base */}
        {scenario && scenario.scenario_type !== 'base' && (
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-900">
                  Multiplicador de Ocupação — Cenário {scenario.name}
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  Define quanto deste cenário usa da <span className="font-medium">taxa de ocupação do cenário base</span>.
                  Ex: 115% = agressivo, 80% = conservador. O valor salvo aqui é aplicado automaticamente no próximo Recalcular.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="300"
                    className="w-20 rounded border border-indigo-300 bg-white px-2 py-1.5 text-sm text-center font-semibold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={occMultiplierInput !== '' ? occMultiplierInput : String(Math.round((scenario.occupancy_multiplier ?? 1) * 100))}
                    onChange={(e) => setOccMultiplierInput(e.target.value)}
                    onFocus={() => setOccMultiplierInput(String(Math.round((scenario.occupancy_multiplier ?? 1) * 100)))}
                  />
                  <span className="text-sm font-semibold text-indigo-700">%</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const pct = parseFloat(occMultiplierInput);
                    if (!isNaN(pct) && pct > 0) {
                      saveMultiplierMutation.mutate(pct);
                      setOccMultiplierInput('');
                    }
                  }}
                  loading={saveMultiplierMutation.isPending}
                  disabled={occMultiplierInput === ''}
                >
                  Salvar
                </Button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-indigo-500">
              <span>
                Atual: <span className="font-semibold text-indigo-700">{Math.round((scenario.occupancy_multiplier ?? 1) * 100)}%</span> da taxa do cenário base
              </span>
              {scenario.scenario_type === 'aggressive' && (
                <span className="text-emerald-600 font-medium">↑ Cenário Agressivo</span>
              )}
              {scenario.scenario_type === 'conservative' && (
                <span className="text-amber-600 font-medium">↓ Cenário Conservador</span>
              )}
            </div>
          </div>
        )}

        {/* Contratos de Financiamento */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Contratos de Financiamento</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowAddContract(!showAddContract)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {showAddContract && (
            <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50 grid grid-cols-3 gap-3">
              <input
                className="col-span-3 rounded border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Nome do contrato (ex: Imóvel FINAME)"
                value={newContract.name}
                onChange={(e) => setNewContract((p) => ({ ...p, name: e.target.value }))}
              />
              <label className="text-xs text-gray-500">
                Valor financiado (R$)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.financed_amount}
                  onChange={(e) => setNewContract((p) => ({ ...p, financed_amount: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Taxa mensal (ex: 0.012)
                <input type="number" step="0.001" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.monthly_rate}
                  onChange={(e) => setNewContract((p) => ({ ...p, monthly_rate: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Prazo (meses)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.term_months}
                  onChange={(e) => setNewContract((p) => ({ ...p, term_months: parseInt(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Carência (meses)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.grace_period_months}
                  onChange={(e) => setNewContract((p) => ({ ...p, grace_period_months: parseInt(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Entrada (% — ex: 0.20)
                <input type="number" step="0.01" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.down_payment_pct}
                  onChange={(e) => setNewContract((p) => ({ ...p, down_payment_pct: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <div className="col-span-3 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddContract(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => addContractMutation.mutate()} loading={addContractMutation.isPending}
                  disabled={!newContract.name}>
                  Salvar contrato
                </Button>
              </div>
            </div>
          )}

          {contracts && contracts.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nome</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Valor Financiado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Taxa Mensal</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Prazo</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Carência</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Entrada</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c: FinancingContract) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {c.financed_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.term_months === 0 ? '—' : `${(c.monthly_rate * 100).toFixed(2)}% a.m.`}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.term_months === 0 ? 'Pagamento único' : `${c.term_months} meses`}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{c.grace_period_months}m</td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.down_payment_pct > 0 ? `${(c.down_payment_pct * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteContractMutation.mutate(c.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Nenhum contrato cadastrado. O motor usará as premissas de financiamento legadas.
            </p>
          )}
        </div>

        {/* Copiloto NLP (Sprint 6) */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder='Copiloto IA — ex: "Atrasar obra em 3 meses e subir aluguel 15%"'
            value={nlpCommand}
            onChange={(e) => setNlpCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && nlpCommand.trim()) copilotMutation.mutate(); }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copilotMutation.mutate()}
            loading={copilotMutation.isPending}
            disabled={!nlpCommand.trim()}
          >
            Executar
          </Button>
        </div>
        {showCopilot && copilotResult && (
          <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-800">
                Copiloto IA — {copilotResult.planned_actions.length} ação(ões) planejada(s)
              </span>
              <button onClick={() => setShowCopilot(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-xs text-indigo-600 mb-2">{copilotResult.summary}</p>
            <ul className="space-y-1">
              {copilotResult.planned_actions.map((action, i) => (
                <li key={i} className="text-xs text-gray-700">
                  <span className="font-mono font-semibold text-indigo-700">{action.function}</span>
                  {action.description && ` — ${action.description}`}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-indigo-500 italic">Dry run ativo — nenhuma alteração foi feita. Confirmação manual pendente.</p>
          </div>
        )}

        {/* Legenda */}
        <div className="mb-2 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            Editado manualmente
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
            <Zap className="h-2.5 w-2.5 text-blue-400" />
            Auto-expandido (growth_rule)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-sky-100 border border-sky-300" />
            Pré-calculado de receita
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-rose-100 border border-rose-300" />
            Pré-calculado de despesa
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Regra de crescimento ativa
          </span>
            <span className="flex items-center gap-1">
              <GripVertical className="h-3 w-3 text-slate-500" />
              Arraste qualquer linha para reordenar
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">💰 Receita</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">⚡ Energia</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">💧 Água</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">🧾 Impostos</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">💳 Cartão</span>
          </div>
        </div>

        {/* Navegação por ano */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {/* Toggle Mensal / Anual */}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                viewMode === 'monthly'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                viewMode === 'annual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              Anual
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
            <span className="px-2 text-gray-500">Densidade</span>
            <button
              type="button"
              onClick={() => setDensityMode('compact')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                densityMode === 'compact'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              Compacta
            </button>
            <button
              type="button"
              onClick={() => setDensityMode('comfortable')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                densityMode === 'comfortable'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              Confortável
            </button>
          </div>
          {/* Toggle de modo de edição */}
          <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setEditMode('single')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                editMode === 'single'
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600',
              )}
              title="Editar apenas o mês clicado"
            >
              Editar 1 mês
            </button>
            <button
              type="button"
              onClick={() => setEditMode('all')}
              className={cn(
                'px-2.5 py-1 rounded font-medium transition-colors',
                editMode === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
              title="Editar altera o valor base — todos os meses são atualizados"
            >
              Editar todos
            </button>
          </div>
          {viewMode === 'monthly' && availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                yr === activeYear
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Toolbar de premissas */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Premissas</span>
          {effectiveBusinessId && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddSeparator((prev) => !prev);
                  setShowAddAssumption(false);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar separador
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddAssumption((prev) => !prev);
                  setShowAddSeparator(false);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Nova Premissa
              </Button>
            </div>
          )}
        </div>

        {showAddSeparator && (
          <div className="mb-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
              <label className="text-xs text-gray-500 md:col-span-2">
                Nome do separador
                <input
                  type="text"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="Ex: Equipe, Tributos, Observações"
                  value={newSeparator.name}
                  onChange={(e) => setNewSeparator((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Categoria
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newSeparator.category_code}
                  onChange={(e) => setNewSeparator((prev) => ({ ...prev, category_code: e.target.value }))}
                >
                  {uiCategories
                    .slice()
                    .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                    .map((cat) => (
                      <option key={cat.id} value={cat.code}>
                        {cat.code === 'SALARIO' ? 'Salário' : cat.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Cor
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newSeparator.tone}
                  onChange={(e) => setNewSeparator((prev) => ({ ...prev, tone: e.target.value as SeparatorTone }))}
                >
                  <option value="slate">Cinza</option>
                  <option value="blue">Azul</option>
                  <option value="rose">Vermelho suave</option>
                  <option value="emerald">Verde</option>
                  <option value="amber">Âmbar</option>
                  <option value="violet">Roxo</option>
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Fonte
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newSeparator.font_size}
                  onChange={(e) => setNewSeparator((prev) => ({ ...prev, font_size: e.target.value as SeparatorFontSize }))}
                >
                  <option value="xs">Pequena</option>
                  <option value="sm">Normal</option>
                  <option value="base">Média</option>
                  <option value="lg">Grande</option>
                </select>
              </label>
              <div className="flex gap-2 md:justify-end">
                <Button
                  size="sm"
                  onClick={() => addSeparatorMutation.mutate()}
                  loading={addSeparatorMutation.isPending}
                  disabled={!newSeparator.name.trim()}
                >
                  Criar separador
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAddSeparator(false)}>
                  Cancelar
                </Button>
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSeparator.bold}
                    onChange={(e) => setNewSeparator((prev) => ({ ...prev, bold: e.target.checked }))}
                  />
                  Negrito
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSeparator.italic}
                    onChange={(e) => setNewSeparator((prev) => ({ ...prev, italic: e.target.checked }))}
                  />
                  Itálico
                </label>
              </div>
              <div className="md:col-span-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Prévia:
                <div className="mt-2 flex items-center gap-3">
                  <div className={cn('h-px flex-1', newSeparatorToneClasses.line)} />
                  <span className={cn('rounded-full border px-3 py-1 uppercase tracking-[0.16em]', newSeparatorToneClasses.badge, getSeparatorTextClasses(newSeparatorPreviewStyle))}>
                    {newSeparator.name.trim() || 'Separador'}
                  </span>
                  <div className={cn('h-px flex-1', newSeparatorToneClasses.line)} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Depois de criar, você pode <strong>arrastar o separador</strong> para posicionar dentro da categoria do seu jeito. Ele serve só para organização visual.
            </p>
          </div>
        )}

        {showAddAssumption && (
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                className="md:col-span-5 rounded border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Nome da premissa (aceita emoji, ex: 💧 Água, ⚡ Energia, Taxa de Cartão)"
                value={newAssumption.name}
                onChange={(e) => setNewAssumption((p) => ({ ...p, name: e.target.value }))}
              />
              <label className="text-xs text-gray-500">
                {newAssumptionValueLabel}
                <input
                  type="number"
                  step="any"
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  value={newAssumption.value}
                  onChange={(e) => setNewAssumption((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Tipo do valor
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newAssumption.data_type}
                  onChange={(e) => setNewAssumption((p) => ({ ...p, data_type: e.target.value as AssumptionDefinition['data_type'] }))}
                >
                  <option value="currency">Moeda (R$)</option>
                  <option value="percentage">Percentual (%)</option>
                  <option value="numeric">Número</option>
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Categoria
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newAssumption.category_code}
                  onChange={(e) => setNewAssumption((p) => ({ ...p, category_code: e.target.value }))}
                >
                  {uiCategories
                    .slice()
                    .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                    .map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code === 'SALARIO' ? 'Salário' : c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Regra
                <select
                  className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  value={newAssumption.growth_type}
                  onChange={(e) => setNewAssumption((p) => ({ ...p, growth_type: e.target.value as RuleTypeOption }))}
                >
                  <option value="flat">Sem crescimento</option>
                  <option value="compound_growth">Crescimento composto anual</option>
                  <option value="curve">Curva anual</option>
                </select>
              </label>
              {newAssumption.growth_type === 'compound_growth' ? (
                <label className="text-xs text-gray-500">
                  Taxa anual (%)
                  <input
                    type="number"
                    step="0.1"
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    value={newAssumption.growth_rate_pct}
                    onChange={(e) => setNewAssumption((p) => ({ ...p, growth_rate_pct: parseFloat(e.target.value) || 0 }))}
                  />
                </label>
              ) : (
                <label className="text-xs text-gray-500">
                  Curva (valores por ano)
                  <input
                    type="text"
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    value={newAssumption.curve_values}
                    onChange={(e) => setNewAssumption((p) => ({ ...p, curve_values: e.target.value }))}
                    placeholder={newAssumptionCurvePlaceholder}
                    disabled={newAssumption.growth_type !== 'curve'}
                  />
                </label>
              )}
              <div className="md:col-span-5 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                {newAssumptionHelperText}
              </div>
              <label className="md:col-span-5 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={newAssumption.include_in_dre}
                  onChange={(e) => setNewAssumption((p) => ({ ...p, include_in_dre: e.target.checked }))}
                />
                <span>Entrar no cálculo do DRE</span>
              </label>
              <div className="md:col-span-5 flex items-end gap-2">
                <Button
                  size="sm"
                  onClick={() => addAssumptionMutation.mutate()}
                  loading={addAssumptionMutation.isPending}
                  disabled={!newAssumption.name.trim()}
                >
                  Adicionar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAddAssumption(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {editingRuleDef && (
          <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Regra de crescimento</p>
                  <p className="text-xs text-gray-500 mt-0.5">{editingRuleDef.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRuleDef(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <label className="text-xs text-gray-600 block">
                  Tipo de regra
                  <select
                    value={ruleForm.type}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, type: e.target.value as RuleTypeOption }))}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                  >
                    <option value="flat">Sem crescimento</option>
                    <option value="compound_growth">Crescimento composto anual</option>
                    <option value="curve">Curva anual</option>
                  </select>
                </label>
                {ruleForm.type === 'compound_growth' && (
                  <label className="text-xs text-gray-600 block">
                    Taxa anual (%)
                    <input
                      type="number"
                      step="0.1"
                      value={ruleForm.ratePct}
                      onChange={(e) => setRuleForm((prev) => ({ ...prev, ratePct: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                )}
                {ruleForm.type === 'curve' && (
                  <label className="text-xs text-gray-600 block">
                    Valores por ano (separados por vírgula)
                    <input
                      type="text"
                      value={ruleForm.curveValues}
                      onChange={(e) => setRuleForm((prev) => ({ ...prev, curveValues: e.target.value }))}
                      placeholder="Ex: 12000, 14000, 16500"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingRuleDef(null)}>Cancelar</Button>
                <Button size="sm" onClick={saveRuleEdit} loading={updateRuleMutation.isPending}>Salvar regra</Button>
              </div>
            </div>
          </div>
        )}

        {editingMetaDef && (
          <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Editar premissa</p>
                  <p className="text-xs text-gray-500 mt-0.5">Altere o nome e a categoria da premissa.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMetaDef(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <label className="text-xs text-gray-600 block">
                  Nome da premissa
                  <input
                    type="text"
                    value={metaForm.name}
                    onChange={(e) => setMetaForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                    placeholder="Ex: ⚡ Energia Operacional"
                  />
                </label>
                <label className="text-xs text-gray-600 block">
                  Categoria
                  <select
                    value={metaForm.category_code}
                    onChange={(e) => setMetaForm((prev) => ({ ...prev, category_code: e.target.value }))}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                  >
                    {uiCategories
                      .slice()
                      .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                      .map((cat) => (
                        <option key={cat.id} value={cat.code}>
                          {cat.code === 'SALARIO' ? 'Salário' : cat.name}
                        </option>
                      ))}
                  </select>
                </label>

                {editingMetaDef && isSeparatorAssumption(editingMetaDef) ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-gray-600 block">
                        Cor do separador
                        <select
                          value={metaForm.separator_tone}
                          onChange={(e) => setMetaForm((prev) => ({ ...prev, separator_tone: e.target.value as SeparatorTone }))}
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                        >
                          <option value="slate">Cinza</option>
                          <option value="blue">Azul</option>
                          <option value="rose">Vermelho suave</option>
                          <option value="emerald">Verde</option>
                          <option value="amber">Âmbar</option>
                          <option value="violet">Roxo</option>
                        </select>
                      </label>
                      <label className="text-xs text-gray-600 block">
                        Tamanho da fonte
                        <select
                          value={metaForm.separator_font_size}
                          onChange={(e) => setMetaForm((prev) => ({ ...prev, separator_font_size: e.target.value as SeparatorFontSize }))}
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                        >
                          <option value="xs">Pequena</option>
                          <option value="sm">Normal</option>
                          <option value="base">Média</option>
                          <option value="lg">Grande</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={metaForm.separator_bold}
                          onChange={(e) => setMetaForm((prev) => ({ ...prev, separator_bold: e.target.checked }))}
                        />
                        Negrito
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={metaForm.separator_italic}
                          onChange={(e) => setMetaForm((prev) => ({ ...prev, separator_italic: e.target.checked }))}
                        />
                        Itálico
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500">Separadores são apenas visuais e não entram no DRE.</p>
                  </>
                ) : (
                  <>
                    <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={metaForm.include_in_dre}
                        onChange={(e) => setMetaForm((prev) => ({ ...prev, include_in_dre: e.target.checked }))}
                      />
                      <span>Entrar no cálculo do DRE</span>
                    </label>
                    <label className="text-xs text-gray-600 block">
                      Linha do DRE
                      <select
                        value={metaForm.dre_bucket}
                        onChange={(e) => setMetaForm((prev) => ({ ...prev, dre_bucket: e.target.value }))}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                      >
                        <option value="">(sem roteamento / padrão do motor)</option>
                        <option value="rent_total">Aluguel / Encargos do imóvel</option>
                        <option value="staff_costs">Folha de pagamento</option>
                        <option value="utility_costs">Utilidades</option>
                        <option value="admin_costs">Adm + Contabilidade</option>
                        <option value="marketing_costs">Marketing</option>
                        <option value="equipment_costs">Equipamentos / Depreciação</option>
                        <option value="insurance_costs">Seguros</option>
                        <option value="other_fixed_costs">Outros custos fixos</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingMetaDef(null)}>Cancelar</Button>
                <Button size="sm" onClick={saveMetaEdit} loading={updateDefinitionMetaMutation.isPending}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edição em bloco */}
        {bulkEditDef && (
          <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Editar linha em bloco</p>
                  <p className="text-xs text-gray-500 mt-0.5">{bulkEditDef.name}</p>
                </div>
                <button type="button" onClick={() => setBulkEditDef(null)} className="text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-4 space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkMode('zero')}
                    className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors', bulkMode === 'zero' ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                  >
                    Zerar toda a linha
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('range_months')}
                    className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors', bulkMode === 'range_months' ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                  >
                    Por meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('range_years')}
                    className={cn('flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors', bulkMode === 'range_years' ? 'bg-sky-50 border-sky-400 text-sky-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                  >
                    Por anos
                  </button>
                </div>

                {bulkMode === 'zero' && (
                  <p className="text-xs text-gray-500">
                    {bulkEditDef.periodicity === 'static'
                      ? 'O valor base estático e os períodos visíveis desta linha serão zerados.'
                      : `Todos os ${allPeriods.length} períodos serão zerados.`}
                  </p>
                )}

                {bulkEditDef.periodicity === 'static' && bulkMode !== 'zero' && (
                  <p className="text-xs text-gray-500">
                    Para premissas fixas, a edição por meses/anos cria ajustes apenas no intervalo selecionado.
                  </p>
                )}

                {bulkMode !== 'zero' && (
                  <label className="text-xs text-gray-600 block">
                    Valor
                    <input
                      type="number"
                      step="any"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                )}

                {bulkMode === 'range_months' && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-gray-600 block">
                      De (mês)
                      <select
                        value={bulkFromPeriod}
                        onChange={(e) => setBulkFromPeriod(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                      >
                        {allPeriods.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600 block">
                      Até (mês)
                      <select
                        value={bulkToPeriod}
                        onChange={(e) => setBulkToPeriod(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                      >
                        {allPeriods.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {bulkMode === 'range_years' && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-gray-600 block">
                      De (ano)
                      <select
                        value={bulkFromYear}
                        onChange={(e) => setBulkFromYear(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                      >
                        {availableYears.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600 block">
                      Até (ano)
                      <select
                        value={bulkToYear}
                        onChange={(e) => setBulkToYear(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm bg-white"
                      >
                        {availableYears.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBulkEditDef(null)}>Cancelar</Button>
                <Button size="sm" onClick={applyBulkEdit}>Aplicar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de premissas para o ano selecionado */}
        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={cn('px-4 text-left text-xs font-semibold text-gray-600 sticky left-0 z-20 bg-gray-50 min-w-[240px] shadow-[2px_0_6px_-1px_rgba(0,0,0,0.08)] border-r border-gray-200', headerCellY)}>
                  Premissa
                </th>
                <th className={cn('px-2 text-center text-xs font-semibold text-gray-400 min-w-[50px] whitespace-nowrap', headerCellY)}>
                  {viewMode === 'annual' ? '' : 'Regra'}
                </th>
                {displayPeriods.map((p) => (
                  <th key={p} className={cn('px-2 text-center text-xs font-semibold text-gray-500 min-w-[90px] whitespace-nowrap', headerCellY)}>
                    {viewMode === 'annual' ? p : formatPeriod(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uiCategories
                .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                .map((cat) => {
                  const tone = categoryTone(cat.code);
                  const sortedDefs = visibleDefinitions
                    .filter((d) => d.category_id === cat.id)
                    .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0));
                  const overrideOrder = categoryOrderOverrides[cat.id];
                  const catDefs = overrideOrder?.length
                    ? [
                        ...sortedDefs
                          .filter((item) => overrideOrder.includes(item.id))
                          .sort((a, b) => overrideOrder.indexOf(a.id) - overrideOrder.indexOf(b.id)),
                        ...sortedDefs.filter((item) => !overrideOrder.includes(item.id)),
                      ]
                    : sortedDefs;

                  if (catDefs.length === 0) return null;
                  const collapsed = collapsedCategories.has(cat.id);

                  return [
                    <tr
                      key={`cat-${cat.id}`}
                      className={`${tone.header} cursor-pointer transition-colors`}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <td className="px-4 py-2 sticky left-0 z-10 bg-inherit shadow-[2px_0_6px_-1px_rgba(0,0,0,0.06)] border-r border-gray-200" colSpan={displayPeriods.length + 2}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                          {collapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{cat.name}</span>
                        </div>
                      </td>
                    </tr>,
                    ...(collapsed ? [] : catDefs.map((def) => {
                      const isSeparator = isSeparatorAssumption(def);
                      const isReadonly = def.editable === false;
                      const isDerivedField = isReadonly;
                      const includeInDre = def.include_in_dre !== false;
                      const canToggleDre = !isSeparator && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(def.id);
                      const showDreStatus = !isSeparator;
                      const dreStatusTone = includeInDre
                        ? canToggleDre
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-emerald-100 bg-emerald-50/80 text-emerald-700'
                        : canToggleDre
                          ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'border-slate-200 bg-slate-100 text-slate-600';
                      const dreStatusTitle = canToggleDre
                        ? (includeInDre
                            ? 'Clique para tirar esta premissa do cálculo do DRE'
                            : 'Clique para recolocar esta premissa no cálculo do DRE')
                        : (isReadonly
                            ? 'Status informativo: esta linha é sincronizada ou pré-calculada automaticamente.'
                            : 'Status informativo desta premissa no cálculo do DRE.');
                      const derivedStyleVariant = getDerivedStyleVariant(def.code);
                      const isRevenueDerivedField = isDerivedField && derivedStyleVariant === 'revenue';
                      const isExpenseDerivedField = isDerivedField && derivedStyleVariant === 'expense';
                      const isHighlightedRevenue = HIGHLIGHTED_REVENUE_CODES.has(def.code);
                      const movableDefs = catDefs;
                      const moveIndex = movableDefs.findIndex((item) => item.id === def.id);
                      const previousMovableDef = moveIndex > 0 ? movableDefs[moveIndex - 1] : undefined;
                      const nextMovableDef = moveIndex >= 0 && moveIndex < movableDefs.length - 1 ? movableDefs[moveIndex + 1] : undefined;
                      const canReorderThis = true;
                      const assumptionEmoji = getAssumptionVisualEmoji(def);
                      const isDraggingThis = draggingDefId === def.id;
                      const isDropTarget = dragOverDefId === def.id && draggingDefId !== def.id;
                      const separatorStyle = getSeparatorStyleConfig(def.ui_config);
                      const separatorTone = getSeparatorToneClasses(separatorStyle.tone);

                      const rowTone = isRevenueDerivedField
                        ? 'bg-sky-50/80 hover:bg-sky-100/70'
                        : isExpenseDerivedField
                          ? 'bg-rose-50/80 hover:bg-rose-100/70'
                          : isHighlightedRevenue
                            ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                            : !includeInDre
                              ? 'bg-slate-50/70 hover:bg-slate-100/80'
                              : 'hover:bg-slate-50';
                      const stickyTone = isRevenueDerivedField
                        ? 'bg-sky-50/95 group-hover:bg-sky-100/80 border-sky-100'
                        : isExpenseDerivedField
                          ? 'bg-rose-50/95 group-hover:bg-rose-100/80 border-rose-100'
                          : isHighlightedRevenue
                            ? 'bg-indigo-50/70 group-hover:bg-indigo-50'
                            : !includeInDre
                              ? 'bg-slate-50/85 group-hover:bg-slate-100 border-slate-200'
                              : 'bg-white group-hover:bg-slate-50';
                      const derivedCellTone = isExpenseDerivedField
                        ? 'bg-rose-50/70'
                        : isRevenueDerivedField
                          ? 'bg-sky-50/70'
                          : isDerivedField
                            ? 'bg-slate-50/70'
                            : '';
                      const readonlyTone = isExpenseDerivedField
                        ? 'border-rose-200 bg-rose-100 text-rose-800'
                        : isRevenueDerivedField
                          ? 'border-sky-200 bg-sky-100 text-sky-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700';
                      const readonlyBadgeTone = isExpenseDerivedField
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : isRevenueDerivedField
                          ? 'bg-sky-100 text-sky-700 border-sky-200'
                          : 'bg-indigo-100 text-indigo-700 border-indigo-200';

                      if (isSeparator) {
                        return (
                          <tr
                            key={def.id}
                            className={cn(
                              'border-b border-gray-100 bg-white transition-colors focus-within:bg-sky-50/60',
                              isDraggingThis && 'opacity-60',
                              isDropTarget && 'ring-1 ring-inset ring-sky-300 bg-sky-50 border-t-2 border-sky-400',
                            )}
                            onDragOver={(e) => {
                              if (!draggingDefId || draggingDefId === def.id) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverDefId(def.id);
                            }}
                            onDragLeave={() => {
                              if (dragOverDefId === def.id) setDragOverDefId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              void dropDefinition(cat.id, catDefs, def);
                            }}
                          >
                              <td colSpan={displayPeriods.length + 2} className={cn('px-4', isCompactDensity ? 'py-2' : 'py-3', isDropTarget && 'bg-sky-50')}>
                              <div className="flex items-center gap-3">
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', def.id);
                                    setDraggingDefId(def.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingDefId(null);
                                    setDragOverDefId(null);
                                  }}
                                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-1 text-slate-500 shadow-sm cursor-grab select-none hover:border-indigo-300 hover:text-indigo-600 active:cursor-grabbing"
                                  title="Arrastar separador"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </span>
                                <div className={cn('h-px flex-1', separatorTone.line)} />
                                <span className={cn('rounded-full border px-3 py-1 uppercase tracking-[0.16em]', separatorTone.badge, getSeparatorTextClasses(separatorStyle))}>
                                  {getSeparatorDisplayName(def.name)}
                                </span>
                                <div className={cn('h-px flex-1', separatorTone.line)} />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-sky-600 rounded px-1 py-0.5 shrink-0"
                                    title="Editar separador"
                                    onClick={() => openMetaEditor(def)}
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-red-600 rounded px-1 py-0.5 shrink-0"
                                    title="Excluir separador"
                                    onClick={() => {
                                      if (window.confirm(`Excluir o separador "${getSeparatorDisplayName(def.name)}"?`)) {
                                        deleteAssumptionMutation.mutate(def);
                                      }
                                    }}
                                    disabled={deleteAssumptionMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={def.id}
                          className={cn(
                            'border-b border-gray-100 group transition-colors focus-within:bg-indigo-50/40',
                            rowTone,
                            isDraggingThis && 'opacity-60',
                            isDropTarget && 'ring-1 ring-inset ring-sky-300 bg-sky-50 border-t-2 border-sky-400',
                          )}
                          onDragOver={(e) => {
                            if (!draggingDefId || draggingDefId === def.id) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverDefId(def.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverDefId === def.id) setDragOverDefId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            void dropDefinition(cat.id, catDefs, def);
                          }}
                        >
                          <td className={cn('px-4 sticky left-0 z-10 hover:z-30 focus-within:z-30 transition-colors border-r border-gray-200 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.07)]', rowCellY, stickyTone, isDropTarget && 'bg-sky-50')}>
                            <div className="flex items-center gap-2">
                              {canReorderThis && (
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', def.id);
                                    setDraggingDefId(def.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingDefId(null);
                                    setDragOverDefId(null);
                                  }}
                                  className="inline-flex items-center rounded-md border border-slate-200 bg-white/90 px-1.5 py-1 text-slate-500 shadow-sm cursor-grab select-none hover:border-indigo-300 hover:text-indigo-600 active:cursor-grabbing"
                                  title="Arrastar para reordenar"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {assumptionEmoji && (
                                <span className="text-sm leading-none" aria-hidden="true">{assumptionEmoji}</span>
                              )}
                              <span className={cn('font-semibold text-gray-800', valueTextSize)}>{def.name}</span>
                              {def.unit_of_measure && (
                                <span className="text-xs text-gray-400">({def.unit_of_measure})</span>
                              )}
                              {def.periodicity === 'static' && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">fixo</span>
                              )}
                              {showDreStatus && (
                                canToggleDre ? (
                                  <button
                                    type="button"
                                    onClick={() => updateDefinitionMetaMutation.mutate({
                                      definitionId: def.id,
                                      payload: { include_in_dre: !includeInDre },
                                    })}
                                    disabled={updateDefinitionMetaMutation.isPending}
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                                      dreStatusTone,
                                    )}
                                    title={dreStatusTitle}
                                  >
                                    {includeInDre ? 'No DRE' : 'Fora DRE'}
                                  </button>
                                ) : (
                                  <span
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                      dreStatusTone,
                                    )}
                                    title={dreStatusTitle}
                                  >
                                    {includeInDre ? 'No DRE' : 'Fora DRE'}
                                  </span>
                                )
                              )}
                              {isReadonly && (
                                <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', readonlyBadgeTone)}>auto</span>
                              )}
                              {def.description && (
                                <div className="relative inline-flex group/info">
                                  <button
                                    type="button"
                                    className="inline-flex shrink-0 text-gray-400 hover:text-brand-700"
                                    title={def.description}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Explicação de ${def.name}`}
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                  <div className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-[min(24rem,calc(100vw-3rem))] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-xl opacity-0 transition-opacity duration-150 whitespace-normal break-words group-hover/info:opacity-100 group-focus-within/info:opacity-100 sm:w-80">
                                    {def.description}
                                  </div>
                                </div>
                              )}
                              {!isReadonly && (
                                <div className="ml-auto flex items-center gap-1 opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-sky-600 rounded px-1 py-0.5 shrink-0"
                                    title="Editar nome da premissa"
                                    onClick={() => openMetaEditor(def)}
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-indigo-600 rounded px-1 py-0.5 shrink-0 disabled:opacity-30"
                                    title="Mover para cima"
                                    onClick={() => void moveDefinition(cat.id, catDefs, def, previousMovableDef)}
                                    disabled={!previousMovableDef}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-indigo-600 rounded px-1 py-0.5 shrink-0 disabled:opacity-30"
                                    title="Mover para baixo"
                                    onClick={() => void moveDefinition(cat.id, catDefs, def, nextMovableDef)}
                                    disabled={!nextMovableDef}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-indigo-600 rounded px-1 py-0.5 shrink-0"
                                    title="Editar linha em bloco"
                                    onClick={() => {
                                      setBulkEditDef(def);
                                      setBulkMode('zero');
                                      setBulkValue(0);
                                      setBulkFromPeriod(allPeriods[0] ?? '');
                                      setBulkToPeriod(allPeriods[allPeriods.length - 1] ?? '');
                                      setBulkFromYear(availableYears[0] ?? '');
                                      setBulkToYear(availableYears[availableYears.length - 1] ?? '');
                                    }}
                                  >
                                    <SlidersHorizontal className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-red-600 rounded px-1 py-0.5 shrink-0"
                                    title="Excluir premissa"
                                    onClick={() => {
                                      if (window.confirm(`Excluir a premissa "${def.name}"? Essa ação remove os valores ligados a ela.`)) {
                                        deleteAssumptionMutation.mutate(def);
                                      }
                                    }}
                                    disabled={deleteAssumptionMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className={cn('px-1 text-center', isCompactDensity ? 'py-0.5' : 'py-1', derivedCellTone)}>
                            {isReadonly ? (
                              <span className="text-xs font-medium text-indigo-600">Auto</span>
                            ) : (
                              <button
                                type="button"
                                className={cn('inline-flex items-center gap-1 text-gray-600 hover:text-brand-700 rounded px-1 hover:bg-brand-50', valueTextSize, isCompactDensity ? 'py-0.5' : 'py-1')}
                                onClick={() => openRuleEditor(def)}
                                title="Criar ou adaptar regra de crescimento"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                {def.growth_rule ? (
                                  <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 font-medium whitespace-nowrap">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    {growthRuleLabel(def.growth_rule) ?? 'Regra'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Definir</span>
                                )}
                              </button>
                            )}
                          </td>
                          {displayPeriods.map((period) => {
                            const isAnnual = viewMode === 'annual';
                            const { value: val, isAuto } = isAnnual
                              ? getAnnualCellValue(def.code, period, def.periodicity)
                              : getCellValue(def.code, period, def.periodicity);
                            const pendKey = def.periodicity === 'static'
                              ? `${def.code}::static`
                              : `${def.code}::${period}`;
                            const readOnlyValue = Number.isFinite(val)
                              ? def.data_type === 'percentage'
                                ? `${formatNumber(val * 100, Number.isInteger(val * 100) ? 0 : 2)}%`
                                : formatNumber(val, Number.isInteger(val) ? 0 : 2)
                              : '—';
                            // Em modo anual a célula é sempre somente leitura
                            const effectiveReadonly = isReadonly || isAnnual;

                            return (
                              <td key={period} className={cn('px-1 text-center', isCompactDensity ? 'py-0.5' : 'py-1', derivedCellTone)}>
                                {effectiveReadonly ? (
                                  <div
                                    title={def.description ?? undefined}
                                    className={cn(
                                      'w-full rounded border px-2 text-right font-semibold shadow-sm',
                                      valueTextSize,
                                      inputPaddingY,
                                      isDerivedField ? readonlyTone : 'border-slate-200 bg-slate-50 text-slate-700',
                                    )}
                                  >
                                    {readOnlyValue}
                                  </div>
                                ) : (
                                  (() => {
                                    const activeEditKey = editMode === 'all' && def.periodicity !== 'static'
                                      ? `${def.code}::${allPeriods[0] ?? period}`
                                      : pendKey;

                                    const displayValue = cellDrafts[activeEditKey] ?? formatEditableValue(val);
                                    const changed = editMode === 'all' && def.periodicity !== 'static'
                                      ? allPeriods.some((p) => `${def.code}::${p}` in pendingChanges)
                                      : pendKey in pendingChanges;

                                    return (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={displayValue}
                                    onChange={(e) => handleCellChange(def.code, period, e.target.value, def.periodicity)}
                                    onBlur={() => handleCellBlur(def.code, period, def.periodicity)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setCellQuickMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        code: def.code,
                                        period,
                                        periodicity: def.periodicity,
                                      });
                                    }}
                                    title={isAuto && def.growth_rule ? `Auto: ${growthRuleLabel(def.growth_rule)}` : def.description ?? undefined}
                                    className={cn(
                                      'w-full text-right font-medium px-2 rounded border',
                                      valueTextSize,
                                      inputPaddingY,
                                      'focus:outline-none focus:ring-1 focus:ring-brand-400',
                                      changed
                                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                                        : isAuto
                                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                                          : 'bg-white border-transparent hover:border-gray-300 text-gray-700',
                                    )}
                                  />
                                      );
                                    })()
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })),
                  ];
                })}
            </tbody>
          </table>
        </div>

        {/* Dock flutuante de ações rápidas */}
        <div className="fixed bottom-4 right-4 z-40">
          <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditMode('single')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  editMode === 'single'
                    ? 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:text-gray-700',
                )}
                title="Editar apenas o mês clicado"
              >
                1 mês
              </button>
              <button
                type="button"
                onClick={() => setEditMode('all')}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  editMode === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:text-gray-700',
                )}
                title="Editar altera o valor base e recalcula os meses"
              >
                todos
              </button>

              <div className="mx-0.5 h-6 w-px bg-gray-200" />

              <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
              <Button size="sm" onClick={() => { void handleRecalculate(); }} loading={recalcMutation.isPending} disabled={saving}>
                <PlayCircle className="h-3.5 w-3.5" /> Recalcular
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDockCreateMenuOpen((prev) => {
                    const next = !prev;
                    if (next && !dockQuickCreateType) setDockQuickCreateType('assumption');
                    return next;
                  });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Nova <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {dockCreateMenuOpen && (
              <div className="mt-2 w-[440px] max-w-[88vw] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setDockQuickCreateType('assumption')}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors text-left',
                      dockQuickCreateType === 'assumption'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    Nova premissa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockQuickCreateType('separator')}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors text-left',
                      dockQuickCreateType === 'separator'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    Novo separador
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockQuickCreateType('contract')}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors text-left',
                      dockQuickCreateType === 'contract'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    Contrato financiamento
                  </button>
                </div>

                {dockQuickCreateType === 'assumption' && (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="text-[11px] font-semibold text-gray-600">Criar premissa</div>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      placeholder="Nome da premissa"
                      value={newAssumption.name}
                      onChange={(e) => setNewAssumption((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                        placeholder={newAssumptionValueLabel}
                        value={newAssumption.value}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      />
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                        value={newAssumption.data_type}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, data_type: e.target.value as AssumptionDefinition['data_type'] }))}
                      >
                        <option value="currency">Moeda (R$)</option>
                        <option value="percentage">Percentual (%)</option>
                        <option value="numeric">Número</option>
                      </select>
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                        value={newAssumption.category_code}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, category_code: e.target.value }))}
                      >
                        {uiCategories
                          .slice()
                          .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                          .map((cat) => (
                            <option key={cat.id} value={cat.code}>
                              {cat.code === 'SALARIO' ? 'Salário' : cat.name}
                            </option>
                          ))}
                      </select>
                      <select
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                        value={newAssumption.growth_type}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, growth_type: e.target.value as RuleTypeOption }))}
                      >
                        <option value="flat">Sem crescimento</option>
                        <option value="compound_growth">Crescimento composto anual</option>
                        <option value="curve">Curva anual</option>
                      </select>
                    </div>

                    {newAssumption.growth_type === 'compound_growth' ? (
                      <input
                        type="number"
                        step="0.1"
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                        placeholder="Taxa anual (%)"
                        value={newAssumption.growth_rate_pct}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, growth_rate_pct: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                        placeholder={newAssumptionCurvePlaceholder}
                        value={newAssumption.curve_values}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, curve_values: e.target.value }))}
                        disabled={newAssumption.growth_type !== 'curve'}
                      />
                    )}

                    <label className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={newAssumption.include_in_dre}
                        onChange={(e) => setNewAssumption((prev) => ({ ...prev, include_in_dre: e.target.checked }))}
                      />
                      Entrar no cálculo do DRE
                    </label>

                    <div className="rounded border border-sky-100 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-700">
                      {newAssumptionHelperText}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDockQuickCreateType(null);
                          setDockCreateMenuOpen(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          addAssumptionMutation.mutate(undefined, {
                            onSuccess: () => {
                              setDockQuickCreateType(null);
                              setDockCreateMenuOpen(false);
                            },
                          });
                        }}
                        loading={addAssumptionMutation.isPending}
                        disabled={!newAssumption.name.trim()}
                      >
                        Criar
                      </Button>
                    </div>
                  </div>
                )}

                {dockQuickCreateType === 'separator' && (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="text-[11px] font-semibold text-gray-600">Criar separador</div>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      placeholder="Ex: Equipe, Tributos"
                      value={newSeparator.name}
                      onChange={(e) => setNewSeparator((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                      value={newSeparator.category_code}
                      onChange={(e) => setNewSeparator((prev) => ({ ...prev, category_code: e.target.value }))}
                    >
                      {uiCategories
                        .slice()
                        .sort((a, b) => (a.sort_order ?? a.display_order ?? 0) - (b.sort_order ?? b.display_order ?? 0))
                        .map((cat) => (
                          <option key={cat.id} value={cat.code}>
                            {cat.code === 'SALARIO' ? 'Salário' : cat.name}
                          </option>
                        ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-gray-500">
                        Cor
                        <select
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                          value={newSeparator.tone}
                          onChange={(e) => setNewSeparator((prev) => ({ ...prev, tone: e.target.value as SeparatorTone }))}
                        >
                          <option value="slate">Cinza</option>
                          <option value="blue">Azul</option>
                          <option value="rose">Vermelho suave</option>
                          <option value="emerald">Verde</option>
                          <option value="amber">Âmbar</option>
                          <option value="violet">Roxo</option>
                        </select>
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Fonte
                        <select
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs bg-white"
                          value={newSeparator.font_size}
                          onChange={(e) => setNewSeparator((prev) => ({ ...prev, font_size: e.target.value as SeparatorFontSize }))}
                        >
                          <option value="xs">Pequena</option>
                          <option value="sm">Normal</option>
                          <option value="base">Média</option>
                          <option value="lg">Grande</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={newSeparator.bold}
                          onChange={(e) => setNewSeparator((prev) => ({ ...prev, bold: e.target.checked }))}
                        />
                        Negrito
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={newSeparator.italic}
                          onChange={(e) => setNewSeparator((prev) => ({ ...prev, italic: e.target.checked }))}
                        />
                        Itálico
                      </label>
                    </div>

                    <div className="rounded border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-500">
                      Prévia
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className={cn('h-px flex-1', newSeparatorToneClasses.line)} />
                        <span className={cn('rounded-full border px-2.5 py-0.5 uppercase tracking-[0.14em]', newSeparatorToneClasses.badge, getSeparatorTextClasses(newSeparatorPreviewStyle))}>
                          {newSeparator.name.trim() || 'Separador'}
                        </span>
                        <div className={cn('h-px flex-1', newSeparatorToneClasses.line)} />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDockQuickCreateType(null);
                          setDockCreateMenuOpen(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          addSeparatorMutation.mutate(undefined, {
                            onSuccess: () => {
                              setDockQuickCreateType(null);
                              setDockCreateMenuOpen(false);
                            },
                          });
                        }}
                        loading={addSeparatorMutation.isPending}
                        disabled={!newSeparator.name.trim()}
                      >
                        Criar
                      </Button>
                    </div>
                  </div>
                )}

                {dockQuickCreateType === 'contract' && (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="text-[11px] font-semibold text-gray-600">Criar contrato</div>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      placeholder="Nome do contrato"
                      value={newContract.name}
                      onChange={(e) => setNewContract((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-gray-500">
                        Valor financiado (R$)
                        <input
                          type="number"
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                          value={newContract.financed_amount}
                          onChange={(e) => setNewContract((prev) => ({ ...prev, financed_amount: parseFloat(e.target.value) || 0 }))}
                        />
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Taxa mensal (ex: 0.012)
                        <input
                          type="number"
                          step="0.001"
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                          value={newContract.monthly_rate}
                          onChange={(e) => setNewContract((prev) => ({ ...prev, monthly_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Prazo (meses)
                        <input
                          type="number"
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                          value={newContract.term_months}
                          onChange={(e) => setNewContract((prev) => ({ ...prev, term_months: parseInt(e.target.value) || 0 }))}
                        />
                      </label>
                      <label className="text-[11px] text-gray-500">
                        Carência (meses)
                        <input
                          type="number"
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                          value={newContract.grace_period_months}
                          onChange={(e) => setNewContract((prev) => ({ ...prev, grace_period_months: parseInt(e.target.value) || 0 }))}
                        />
                      </label>
                      <label className="text-[11px] text-gray-500 col-span-2">
                        Entrada (% em decimal, ex: 0.20)
                        <input
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                          value={newContract.down_payment_pct}
                          onChange={(e) => setNewContract((prev) => ({ ...prev, down_payment_pct: parseFloat(e.target.value) || 0 }))}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDockQuickCreateType(null);
                          setDockCreateMenuOpen(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          addContractMutation.mutate(undefined, {
                            onSuccess: () => {
                              setDockQuickCreateType(null);
                              setDockCreateMenuOpen(false);
                            },
                          });
                        }}
                        loading={addContractMutation.isPending}
                        disabled={!newContract.name.trim()}
                      >
                        Criar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu rápido por célula (clique direito) */}
        {cellQuickMenu && (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setCellQuickMenu(null)}
          >
            <div
              className="absolute min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-2xl p-1.5"
              style={{
                left: cellQuickMenu.x,
                top: cellQuickMenu.y,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[11px] font-semibold text-gray-500">
                Ações rápidas da célula
              </div>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setEditMode('single');
                  setCellQuickMenu(null);
                }}
              >
                Editar só este mês
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setEditMode('all');
                  setCellQuickMenu(null);
                }}
              >
                Editar todos os meses
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100"
                onClick={() => {
                  handleSave();
                  setCellQuickMenu(null);
                }}
              >
                Salvar alterações
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setShowAddAssumption(true);
                  setShowAddSeparator(false);
                  setCellQuickMenu(null);
                }}
              >
                Nova premissa
              </button>
            </div>
          </div>
        )}

        {/* Painel de histórico de auditoria */}
        {showHistory && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <History className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold">Histórico de Alterações de Premissas</span>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Fechar
              </button>
            </div>
            {auditLogs.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-gray-400">
                Nenhuma alteração registrada ainda. Salve premissas para gerar histórico.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-indigo-400 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold text-indigo-700 capitalize">{log.action}</span>
                        {' '}—{' '}
                        {log.notes ?? `${log.entity_type} ${log.entity_id.slice(0, 8)}`}
                      </p>
                      {log.new_value && Object.keys(log.new_value).length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                          {JSON.stringify(log.new_value)}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
