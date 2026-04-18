'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { assumptionsApi, calculationsApi, servicePlansApi, versionsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { Topbar } from '@/components/layout/Topbar';
import { ChartSkeleton, NoFiltersState } from '@/components/dashboard/EmptyState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/Button';
import { Droplets, Banknote, TrendingUp, Info } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type HygieneParams = {
  aulasMinProfessorDiamante: number; // inferência principal
  custoSachesUnit: number; // C12
  custoLavagemToalha: number; // C13
  taxaReposicao: number; // C14
  custoReposicaoUnit: number; // C15
};

const DEFAULT_PARAMS: HygieneParams = {
  aulasMinProfessorDiamante: 110,
  custoSachesUnit: 0.8,
  custoLavagemToalha: 3,
  taxaReposicao: 0.05,
  custoReposicaoUnit: 20,
};

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };
const KIT_HIGIENE_POR_ALUNO_CODE = 'kit_higiene_por_aluno'; // driver legado (únidade por professor); usado só como intermediário interno
const KIT_HIGIENE_POR_PROFESSOR_NAME = 'Kit higiene por professor diamante ativo/mês';
const KIT_HIGIENE_PROFESSOR_MES_CODE = 'kit_higiene_professor_calculado_mes';
const KIT_HIGIENE_PROFESSOR_MES_NAME = 'Kit higiene professor/mês (pré-calculado)';
const KIT_HIGIENE_PROFESSOR_MES_DESCRIPTION = 'Total mensal de kit higiene para professores diamante ativos. Composição: (sachês × banhos/mês) + (lavagem de toalha × banhos/mês) + reposição de itens (5% × R$20/un.). O valor é a soma dos custos operacionais de higiene por período e entra diretamente na DRE como custo variável.';

// ── Helpers ────────────────────────────────────────────────────────────────────

function generatePeriods(start: string, end: string): string[] {
  const periods: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return periods;
}

function buildOperatingYearSeries(
  periods: string[],
  valuesByPeriod: Map<string, number>,
  fallback: number,
): number[] {
  const yearBuckets: number[][] = Array.from({ length: 9 }, () => []);
  periods.forEach((period, idx) => {
    const value = valuesByPeriod.get(period);
    if (typeof value !== 'number') return;
    const yearIndex = Math.min(Math.floor(idx / 12), 8);
    yearBuckets[yearIndex].push(value);
  });
  return yearBuckets.map((values) => (
    values.length ? values.reduce((acc, cur) => acc + cur, 0) / values.length : fallback
  ));
}

function buildOperatingYearStartSeries(
  periods: string[],
  valuesByPeriod: Map<string, number>,
  fallback: number,
): number[] {
  const yearStarts = Array.from({ length: 9 }, () => fallback);

  periods.forEach((period, idx) => {
    const yearIndex = Math.min(Math.floor(idx / 12), 8);
    if (yearStarts[yearIndex] !== fallback) return;

    const value = valuesByPeriod.get(period);
    if (typeof value !== 'number') return;
    yearStarts[yearIndex] = value;
  });

  return yearStarts;
}

function normalizeComputedValue(value: number, decimals = 10): number {
  return Number(value.toFixed(decimals));
}

function resolveExpandedPeriodMap(
  code: string,
  periods: string[],
  assumptionValues: Array<{ code: string; period_date?: string; numeric_value?: number }>,
  assumptionDefinitions: Array<{
    code: string;
    default_value?: number | string;
    growth_rule?: {
      type: 'compound_growth' | 'curve' | 'flat';
      rate?: number;
      base_year?: number;
      values?: number[];
    } | null;
  }>,
  hardFallback: number,
): Map<string, number> {
  const resolved = new Map<string, number>();
  const explicitValues = assumptionValues.filter((v) => v.code === code && v.period_date);

  explicitValues.forEach((value) => {
    resolved.set(value.period_date!, value.numeric_value ?? 0);
  });

  const definition = assumptionDefinitions.find((item) => item.code === code);
  const staticValue = assumptionValues.find((v) => v.code === code && !v.period_date)?.numeric_value;
  const fallbackValueRaw = staticValue ?? definition?.default_value;
  const fallbackValue =
    typeof fallbackValueRaw === 'number'
      ? fallbackValueRaw
      : typeof fallbackValueRaw === 'string'
        ? Number(fallbackValueRaw)
        : hardFallback;

  const growthRule = definition?.growth_rule;
  if (growthRule?.type === 'curve' && growthRule.values?.length) {
    const baseYear = growthRule.base_year ?? Number(periods[0]?.slice(0, 4) ?? new Date().getFullYear());
    periods.forEach((period) => {
      if (resolved.has(period)) return;
      const year = Number(period.slice(0, 4));
      const yearIdx = Math.max(0, year - baseYear);
      const value = growthRule.values?.[Math.min(yearIdx, growthRule.values.length - 1)] ?? fallbackValue;
      resolved.set(period, normalizeComputedValue(value));
    });
    return resolved;
  }

  if (growthRule?.type === 'compound_growth') {
    const rate = growthRule.rate ?? 0;
    const baseYear = growthRule.base_year ?? Number(periods[0]?.slice(0, 4) ?? new Date().getFullYear());
    periods.forEach((period) => {
      if (resolved.has(period)) return;
      const year = Number(period.slice(0, 4));
      const value = fallbackValue * Math.pow(1 + rate, Math.max(0, year - baseYear));
      resolved.set(period, normalizeComputedValue(value));
    });
    return resolved;
  }

  periods.forEach((period) => {
    if (!resolved.has(period)) {
      resolved.set(period, Number.isFinite(fallbackValue) ? fallbackValue : hardFallback);
    }
  });

  return resolved;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderField({ label, hint, value, min, max, step, format, onChange }: SliderFieldProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-none">{label}</span>
        <span className="text-sm font-bold text-slate-800 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #0ea5e9 ${pct}%, #E5E7EB ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{format(min)}</span>
        {hint && <span className="italic text-center flex-1 px-1 truncate">{hint}</span>}
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function NumberField({
  label, hint, unit, value, step = 'any', onChange,
}: {
  label: string;
  hint?: string;
  unit?: string;
  value: number;
  step?: number | string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-none">{label}</span>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-9 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
      {hint && <span className="text-[10px] text-gray-400 leading-none">{hint}</span>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CalculoKitHigienePage() {
  const queryClient = useQueryClient();
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;
  const [params, setParams] = useState<HygieneParams>(DEFAULT_PARAMS);

  function set<K extends keyof HygieneParams>(key: K, value: HygieneParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  const { data: unitVersions = [], isLoading: loadingVersions } = useQuery({
    queryKey: ['unit-versions-hygiene-kit', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  const activeVersion = useMemo(
    () =>
      [...unitVersions]
        .filter((v) => v.is_active)
        .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0],
    [unitVersions],
  );

  const { data: assumptionValues = [], isLoading: loadingValues } = useQuery({
    queryKey: ['assumption-values-hygiene-kit', activeVersion?.id],
    queryFn: () => assumptionsApi.values(activeVersion!.id),
    enabled: !!activeVersion,
  });

  const { data: assumptionDefinitions = [] } = useQuery({
    queryKey: ['assumption-definitions-hygiene-kit', businessId],
    queryFn: () => assumptionsApi.definitions(undefined, businessId!),
    enabled: !!businessId,
  });

  const { data: assumptionCategories = [] } = useQuery({
    queryKey: ['assumption-categories-hygiene-kit', businessId],
    queryFn: () => assumptionsApi.categories(businessId!),
    enabled: !!businessId,
  });

  const { data: servicePlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['service-plans-hygiene-kit', businessId],
    queryFn: () => servicePlansApi.list(businessId!),
    enabled: !!businessId,
  });

  const diamondPlanMixPct = useMemo(() => {
    const diamante = servicePlans.find((p) => p.name.toLowerCase().includes('diamante') || p.code.toLowerCase().includes('diamante'));
    return Math.max(0, Math.min(1, diamante?.target_mix_pct ?? 0));
  }, [servicePlans]);

  const periods = useMemo(() => {
    if (!activeVersion?.horizon_start || !activeVersion?.horizon_end) return [];
    return generatePeriods(activeVersion.horizon_start, activeVersion.horizon_end);
  }, [activeVersion?.horizon_end, activeVersion?.horizon_start]);

  const occupancyByPeriod = useMemo(
    () => resolveExpandedPeriodMap('taxa_ocupacao', periods, assumptionValues, assumptionDefinitions, 0),
    [assumptionDefinitions, assumptionValues, periods],
  );

  const workingDaysByPeriod = useMemo(
    () => resolveExpandedPeriodMap('dias_uteis_mes', periods, assumptionValues, assumptionDefinitions, 22),
    [assumptionDefinitions, assumptionValues, periods],
  );

  const saturdaysByPeriod = useMemo(
    () => resolveExpandedPeriodMap('sabados_mes', periods, assumptionValues, assumptionDefinitions, 4),
    [assumptionDefinitions, assumptionValues, periods],
  );

  const capacityByPeriod = useMemo(() => {
    const m = new Map<string, number>();
    assumptionValues
      .filter((v) => v.code === 'capacidade_maxima_mes' && v.period_date)
      .forEach((v) => { m.set(v.period_date!, v.numeric_value ?? 0); });
    return m;
  }, [assumptionValues]);

  const occupancySeries = useMemo(() => {
    if (!periods.length) {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    const opYears = buildOperatingYearStartSeries(periods, occupancyByPeriod, 0);
    return [
      opYears[0] ?? 0,
      opYears[1] ?? 0,
      opYears[2] ?? 0,
      opYears[3] ?? 0,
      opYears[4] ?? 0,
      opYears[5] ?? 0,
      opYears[6] ?? 0,
      opYears[7] ?? 0,
      opYears[8] ?? 0,
    ];
  }, [occupancyByPeriod, periods]);

  const workingDaysSeries = useMemo(() => {
    if (!periods.length) return Array(9).fill(22);
    const opYears = buildOperatingYearSeries(periods, workingDaysByPeriod, 22);
    return [
      opYears[0] ?? 22,
      opYears[1] ?? 22,
      opYears[2] ?? 22,
      opYears[3] ?? 22,
      opYears[4] ?? 22,
      opYears[5] ?? 22,
      opYears[6] ?? 22,
      opYears[7] ?? 22,
      opYears[8] ?? 22,
    ];
  }, [periods, workingDaysByPeriod]);

  const saturdaysSeries = useMemo(() => {
    if (!periods.length) return Array(9).fill(4);
    const opYears = buildOperatingYearSeries(periods, saturdaysByPeriod, 4);
    return [
      opYears[0] ?? 4,
      opYears[1] ?? 4,
      opYears[2] ?? 4,
      opYears[3] ?? 4,
      opYears[4] ?? 4,
      opYears[5] ?? 4,
      opYears[6] ?? 4,
      opYears[7] ?? 4,
      opYears[8] ?? 4,
    ];
  }, [periods, saturdaysByPeriod]);



  const capacitySeries = useMemo(() => {
    const fallbackCapacity = assumptionValues.find((v) => v.code === 'capacidade_maxima_mes' && !v.period_date)?.numeric_value ?? 4020;
    if (!periods.length) {
      return Array(9).fill(fallbackCapacity);
    }
    const opYears = buildOperatingYearSeries(periods, capacityByPeriod, fallbackCapacity);
    return [
      opYears[0] ?? fallbackCapacity,
      opYears[1] ?? fallbackCapacity,
      opYears[2] ?? fallbackCapacity,
      opYears[3] ?? fallbackCapacity,
      opYears[4] ?? fallbackCapacity,
      opYears[5] ?? fallbackCapacity,
      opYears[6] ?? fallbackCapacity,
      opYears[7] ?? fallbackCapacity,
      opYears[8] ?? fallbackCapacity,
    ];
  }, [assumptionValues, capacityByPeriod, periods]);

  const baseCalc = useMemo(() => {
    const capacidadeMaxima = capacitySeries[0]
      || assumptionValues.find((v) => v.code === 'capacidade_maxima_mes' && v.period_date)?.numeric_value
      || assumptionValues.find((v) => v.code === 'capacidade_maxima_mes' && !v.period_date)?.numeric_value
      || 4020;

    return {
      capacidadeMaximaOriginal: capacidadeMaxima,
      capacidadeMaximaDiamante: capacidadeMaxima * diamondPlanMixPct,
    };
  }, [assumptionValues, capacitySeries, diamondPlanMixPct]);

  const rows = useMemo(() => {
    const labels = ['Ano 0', 'Ano 1', 'Ano 2', 'Ano 3', 'Ano 4', 'Ano 5', 'Ano 6', 'Ano 7', 'Ano 8'];
    return labels.map((label, index) => {
      const ocupacao = occupancySeries[index] ?? 0;
      const capacidadeAno = capacitySeries[index] ?? baseCalc.capacidadeMaximaOriginal;
      const capacidadeDiamanteAno = capacidadeAno * diamondPlanMixPct;
      const aulasDiamanteMes = capacidadeDiamanteAno * ocupacao;
      const professoresDiamanteBase = capacidadeDiamanteAno / Math.max(params.aulasMinProfessorDiamante, 1);
      const professoresDiamanteInferidos = Math.floor(aulasDiamanteMes / Math.max(params.aulasMinProfessorDiamante, 1));
      const diasUteisMes = workingDaysSeries[index] ?? 22;
      const sabadosMes = saturdaysSeries[index] ?? 4;
      const diasOperacaoMes = diasUteisMes + sabadosMes;
      const kitsMes = Math.max(0, professoresDiamanteInferidos);
      const banhosProfMes = professoresDiamanteBase * diasOperacaoMes * ocupacao;
      const banhosTotaisMes = Math.max(0, Math.round(banhosProfMes));
      const custoSachesMes = banhosTotaisMes * params.custoSachesUnit;
      const custoLavagemMes = banhosTotaisMes * params.custoLavagemToalha;
      const qtdReposicoes = Math.ceil(banhosTotaisMes * params.taxaReposicao);
      const custoReposicoes = qtdReposicoes * params.custoReposicaoUnit;
      const custoTotalMes = custoSachesMes + custoLavagemMes + custoReposicoes;
      const custoTotalAno = custoTotalMes * 12;
      return {
        label,
        ocupacao,
        capacidadeAno,
        capacidadeDiamanteAno,
        aulasDiamanteMes,
        professoresDiamanteBase,
        professoresDiamanteInferidos,
        diasUteisMes,
        sabadosMes,
        diasOperacaoMes,
        kitsMes,
        banhosProfMes,
        banhosTotaisMes,
        custoSachesMes,
        custoLavagemMes,
        qtdReposicoes,
        custoReposicoes,
        custoTotalMes,
        custoTotalAno,
      };
    });
  }, [baseCalc.capacidadeMaximaOriginal, capacitySeries, diamondPlanMixPct, occupancySeries, params, saturdaysSeries, workingDaysSeries]);

  const saveSimulationMutation = useMutation({
    mutationFn: async () => {
      if (!activeVersion || !periods.length) throw new Error('Versão ativa não encontrada.');

      let kitDefId =
        assumptionValues.find((v) => v.code === KIT_HIGIENE_POR_ALUNO_CODE)?.assumption_definition_id
        ?? assumptionDefinitions.find((d) => d.code === KIT_HIGIENE_POR_ALUNO_CODE)?.id;

      let kitProfessorMesDefId =
        assumptionValues.find((v) => v.code === KIT_HIGIENE_PROFESSOR_MES_CODE)?.assumption_definition_id
        ?? assumptionDefinitions.find((d) => d.code === KIT_HIGIENE_PROFESSOR_MES_CODE)?.id;

      // Se a premissa foi removida, cria automaticamente para não bloquear o fluxo.
      if (!kitDefId) {
        if (!businessId) throw new Error('Negócio não selecionado para criar premissa de kit higiene.');

        const quickAdded = await assumptionsApi.quickAdd({
          budget_version_id: activeVersion.id,
          business_id: businessId,
          name: KIT_HIGIENE_POR_PROFESSOR_NAME,
          value: 0,
          category_code: 'CUSTO_VARIAVEL',
          data_type: 'currency',
          include_in_dre: true,
          growth_rule: { type: 'flat' },
        });

        kitDefId = quickAdded.definition_id;
      }

      if (!kitProfessorMesDefId) {
        if (!businessId) throw new Error('Negócio não selecionado para criar premissa de kit higiene mensal.');

        const variableCostCategoryId =
          assumptionDefinitions.find((d) => d.code === KIT_HIGIENE_POR_ALUNO_CODE)?.category_id
          ?? assumptionCategories.find((c) => c.code === 'CUSTO_VARIAVEL')?.id;

        if (!variableCostCategoryId) {
          throw new Error('Categoria CUSTO_VARIAVEL não encontrada para criar premissa pré-calculada de kit higiene.');
        }

        const createdDefinition = await assumptionsApi.createDefinition({
          business_id: businessId,
          category_id: variableCostCategoryId,
          code: KIT_HIGIENE_PROFESSOR_MES_CODE,
          name: KIT_HIGIENE_PROFESSOR_MES_NAME,
          description: KIT_HIGIENE_PROFESSOR_MES_DESCRIPTION,
          data_type: 'currency',
          unit_of_measure: 'R$/mês',
          default_value: 0,
          editable: false,
          periodicity: 'monthly',
          applies_to: 'version',
          include_in_dre: true,
        });

        kitProfessorMesDefId = createdDefinition.id;
      }

      const payload = periods.flatMap((period) => {
        const cap = capacityByPeriod.get(period) ?? baseCalc.capacidadeMaximaOriginal;
        const ocup = occupancyByPeriod.get(period) ?? 0;
        const diasOperacaoMes = (workingDaysByPeriod.get(period) ?? 22) + (saturdaysByPeriod.get(period) ?? 4);

        const aulasDiamanteMes = cap * ocup * diamondPlanMixPct;
        const professoresDiamanteBase = (cap * diamondPlanMixPct) / Math.max(params.aulasMinProfessorDiamante, 1);
        const professoresDiamanteInferidos = Math.floor(aulasDiamanteMes / Math.max(params.aulasMinProfessorDiamante, 1));
        const kitsMes = Math.max(0, professoresDiamanteInferidos);
        const banhosTotaisMes = Math.max(0, Math.round(professoresDiamanteBase * diasOperacaoMes * ocup));

        const custoSachesMes = banhosTotaisMes * params.custoSachesUnit;
        const custoLavagemMes = banhosTotaisMes * params.custoLavagemToalha;
        const qtdReposicoes = Math.ceil(banhosTotaisMes * params.taxaReposicao);
        const custoReposicoes = qtdReposicoes * params.custoReposicaoUnit;
        const custoTotalMes = custoSachesMes + custoLavagemMes + custoReposicoes;

        const activeStudents = Math.max(1, Math.ceil(cap * ocup));
        const kitPorAluno = custoTotalMes / activeStudents;

        return [
          {
            assumption_definition_id: kitDefId,
            code: KIT_HIGIENE_POR_ALUNO_CODE,
            period_date: period,
            numeric_value: Number(kitPorAluno.toFixed(4)),
            source_type: 'manual' as const,
          },
          {
            assumption_definition_id: kitProfessorMesDefId,
            code: KIT_HIGIENE_PROFESSOR_MES_CODE,
            period_date: period,
            numeric_value: Number(custoTotalMes.toFixed(4)),
            source_type: 'derived' as const,
          },
        ];
      });

      await assumptionsApi.bulkUpsert(activeVersion.id, payload);
      await calculationsApi.recalculate(activeVersion.id);
    },
    onSuccess: async () => {
      if (!activeVersion) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assumption-values-hygiene-kit', activeVersion.id] }),
        queryClient.invalidateQueries({ queryKey: ['assumption-definitions-hygiene-kit', businessId] }),
        queryClient.invalidateQueries({ queryKey: ['assumption-values', activeVersion.id] }),
        queryClient.invalidateQueries({ queryKey: ['assumption-definitions', businessId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-consolidated'] }),
      ]);
    },
  });

  const avgWorkingDays = workingDaysSeries.reduce((acc, value) => acc + value, 0) / workingDaysSeries.length;
  const avgSaturdays = saturdaysSeries.reduce((acc, value) => acc + value, 0) / saturdaysSeries.length;
  const totalPeriodsToSave = periods.length;

  // ── Summary KPIs ─────────────────────────────────────────────────────────────
  const maxAnnualCost = Math.max(...rows.map((r) => r.custoTotalAno));
  const avgMonthlyCost = rows.reduce((acc, r) => acc + r.custoTotalMes, 0) / rows.length;
  const ano8Cost = rows[8]?.custoTotalAno ?? 0;
  const ano0Cost = rows[0]?.custoTotalAno ?? 0;
  const growthPct = ano0Cost > 0 ? (ano8Cost - ano0Cost) / ano0Cost : 0;

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Cálculo Kit Higiene" />
        <div className="p-6">
          <NoFiltersState message="Selecione negócio e cenário para visualizar o cálculo de kit higiene." />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Cálculo Kit Higiene" />
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 shrink-0">
              <Droplets className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cálculo Kit Higiene</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Custo mensal e anual de sachês, toalhas e reposições — por ano de operação
              </p>
            </div>
          </div>
          {activeVersion && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-1 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block shrink-0" />
              {activeVersion.name ?? `Versão ${activeVersion.id.slice(0, 8)}`}
            </span>
          )}
        </div>

        {/* ── Unidade não selecionada ──────────────────────────────────────── */}
        {!unitId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            Selecione exatamente uma unidade no filtro lateral para habilitar este cálculo.
          </div>
        ) : loadingVersions || loadingValues || loadingPlans ? (
          <ChartSkeleton />
        ) : !activeVersion ? (
          <NoFiltersState message="Nenhuma versão ativa encontrada para a unidade selecionada." />
        ) : (
          <>
            {/* ── KPI Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Kit Higiene — Maturidade (Ano 8)"
                value={formatCurrency(ano8Cost)}
                sub="custo anual projetado no Ano 8"
                icon={<Droplets className="h-4 w-4" />}
                accentColor="sky"
              />
              <MetricCard
                label="Custo Médio Mensal"
                value={formatCurrency(avgMonthlyCost)}
                sub="média entre Ano 0 e Ano 8"
                icon={<Banknote className="h-4 w-4" />}
                accentColor="indigo"
              />
              <MetricCard
                label="Pico de Custo Anual"
                value={formatCurrency(maxAnnualCost)}
                sub="maior custo anual ao longo do horizonte"
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor="amber"
              />
              <MetricCard
                label="Crescimento Ano 0 → 8"
                value={formatPercent(growthPct)}
                sub="variação total do custo anual"
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor={growthPct > 0 ? 'rose' : 'emerald'}
                trend={growthPct > 0.001 ? 'up' : growthPct < -0.001 ? 'down' : 'neutral'}
              />
            </div>

            {/* ── Parameter panels ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Panel 1 — Previsão do Sistema (DRE) */}
              <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900">Previsão do Sistema (DRE)</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <p className="text-gray-500 mb-1">Capacidade máxima de aulas/mês</p>
                    <p className="text-lg font-bold text-indigo-900">
                      {formatNumber(baseCalc.capacidadeMaximaOriginal, 2)} h
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Média mensal derivada da versão ativa da unidade no DRE.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-sky-100">
                    <p className="text-gray-500 mb-1">Mix Diamante (de Configuração de Planos)</p>
                    <p className="text-lg font-bold text-sky-900">
                      {(diamondPlanMixPct * 100).toFixed(1)}%
                    </p>
                  </div>
                  <SliderField
                    label="Mínimo de aulas por professor Diamante/mês"
                    hint="regra usada para inferir professores"
                    value={params.aulasMinProfessorDiamante}
                    min={80}
                    max={200}
                    step={1}
                    format={(v) => `${Math.round(v)} aulas`}
                    onChange={(v) => set('aulasMinProfessorDiamante', v)}
                  />
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-gray-500 mb-1">Capacidade disponível para Diamante</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {formatNumber(baseCalc.capacidadeMaximaDiamante, 2)} h
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      = {formatNumber(baseCalc.capacidadeMaximaOriginal, 2)} × {(diamondPlanMixPct * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-cyan-100">
                      <p className="text-gray-500 mb-1">Dias úteis/mês (DRE)</p>
                      <p className="text-lg font-bold text-cyan-900">{formatNumber(avgWorkingDays, 1)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-cyan-100">
                      <p className="text-gray-500 mb-1">Sábados/mês (DRE)</p>
                      <p className="text-lg font-bold text-cyan-900">{formatNumber(avgSaturdays, 1)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-indigo-100 border border-indigo-300 px-3 py-2 text-xs text-indigo-800">
                  <p className="font-semibold mb-1">📌 Fórmula do Cálculo</p>
                  <p>Aulas Diamante = Capacidade × Mix Diamante × Ocupação · Professores Diamante = FLOOR(Aulas Diamante / mínimo de aulas por professor)</p>
                  <p>Banhos/mês = ((Capacidade × Mix Diamante) / mínimo de aulas por professor) × (dias úteis + sábados) × ocupação</p>
                </div>
              </section>

              {/* Panel 2 — Custos de Insumos */}
              <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900">Custos de Insumos</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <NumberField
                    label="Custo sachê/unidade"
                    hint="custo unitário do sachê (shampoo/condicionador)"
                    unit="R$"
                    value={params.custoSachesUnit}
                    step={0.01}
                    onChange={(v) => set('custoSachesUnit', v)}
                  />
                  <NumberField
                    label="Custo lavagem toalha"
                    hint="custo unitário por lavagem de toalha"
                    unit="R$"
                    value={params.custoLavagemToalha}
                    step={0.1}
                    onChange={(v) => set('custoLavagemToalha', v)}
                  />
                  <NumberField
                    label="Custo reposição/unidade"
                    hint="custo de substituição de toalha danificada"
                    unit="R$"
                    value={params.custoReposicaoUnit}
                    step={1}
                    onChange={(v) => set('custoReposicaoUnit', v)}
                  />
                </div>
                <SliderField
                  label="Taxa de reposição"
                  hint="% de banhos que geram reposição"
                  value={params.taxaReposicao}
                  min={0} max={0.3} step={0.01}
                  format={(v) => `${(v * 100).toFixed(0)}%`}
                  onChange={(v) => set('taxaReposicao', v)}
                />
              </section>
            </div>

            {/* ── Taxa de Ocupação (Read-only, from DRE) ──────────────────────────────── */}
            <section className="bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-200 rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-bold text-gray-900">Taxa de Ocupação (DRE)</h3>
              </div>
              <p className="text-xs text-gray-500">
                Taxa de ocupação carregada do DRE. Não é editável nesta tela — é leitura apenas.
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Ano 0', index: 0 },
                  { label: 'Ano 1', index: 1 },
                  { label: 'Ano 2', index: 2 },
                  { label: 'Ano 3', index: 3 },
                  { label: 'Ano 4', index: 4 },
                  { label: 'Ano 5', index: 5 },
                  { label: 'Ano 6', index: 6 },
                  { label: 'Ano 7', index: 7 },
                  { label: 'Ano 8', index: 8 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium w-14 shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min((occupancySeries[item.index] ?? 0) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 w-16 text-right tabular-nums shrink-0">
                      {formatPercent(occupancySeries[item.index] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Persistência no DRE ───────────────────────────────────────────── */}
            <section className="bg-white border border-sky-100 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">Salvar cálculo do kit no DRE</h3>
                  <p className="text-sm text-gray-600 max-w-3xl">
                    Este botão envia o cálculo atual do kit higiene para a versão ativa e atualiza o DRE em todo o horizonte da projeção.
                  </p>
                  <p className="text-xs text-gray-500">
                    Serão atualizados <span className="font-semibold">{totalPeriodsToSave} meses</span>, do período inicial ao final da projeção da versão ativa.
                  </p>
                  <p className="text-xs text-gray-500">
                    O DRE passa a refletir o resultado desta aba na linha de kit higiene após o recálculo.
                  </p>
                </div>
                <Button
                  onClick={() => saveSimulationMutation.mutate()}
                  disabled={saveSimulationMutation.isPending || !activeVersion}
                  className="bg-sky-600 hover:bg-sky-700 shrink-0"
                >
                  {saveSimulationMutation.isPending ? 'Salvando cálculo no DRE...' : 'Salvar cálculo do kit no DRE'}
                </Button>
              </div>
            </section>
            {saveSimulationMutation.isError && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
                Erro ao salvar: {(saveSimulationMutation.error as Error)?.message ?? 'erro desconhecido'}
              </div>
            )}
            {saveSimulationMutation.isSuccess && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                Custos de insumos salvos com sucesso. DRE recalculado.
              </div>
            )}

            {/* ── Results table ────────────────────────────────────────────── */}
            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-bold text-gray-900">Projeção por Ano</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { label: 'Ano', align: 'left' },
                        { label: 'Ocupação', align: 'right' },
                        { label: 'Dias úteis', align: 'right' },
                        { label: 'Sábados', align: 'right' },
                        { label: 'Aulas Diamante/mês', align: 'right' },
                        { label: 'Prof. base', align: 'right' },
                        { label: 'Prof. completos (110+)', align: 'right' },
                        { label: 'Banhos totais/mês', align: 'right' },
                        { label: 'Sachês/mês', align: 'right' },
                        { label: 'Lavagem/mês', align: 'right' },
                        { label: 'Qtd. repos.', align: 'right' },
                        { label: 'Custo repos.', align: 'right' },
                        { label: 'Total/mês', align: 'right' },
                        { label: 'Total/ano', align: 'right' },
                      ].map(({ label, align }) => (
                        <th
                          key={label}
                          className={cn(
                            'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap',
                            align === 'left' ? 'text-left' : 'text-right',
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => {
                      const isFuture = i >= 6;
                      const isMax = row.custoTotalAno === maxAnnualCost && maxAnnualCost > 0;
                      return (
                        <tr
                          key={row.label}
                          className={cn(
                            'hover:bg-sky-50/40 transition-colors',
                            isFuture && 'bg-slate-50/50',
                          )}
                        >
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center justify-center text-xs font-bold rounded-full px-2.5 py-0.5',
                              isFuture
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-sky-100 text-sky-700',
                            )}>
                              {row.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                                {formatPercent(row.ocupacao)}
                              </span>
                              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-400 rounded-full"
                                  style={{ width: `${Math.min(row.ocupacao * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatNumber(row.diasUteisMes, 1)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatNumber(row.sabadosMes, 1)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatNumber(row.aulasDiamanteMes, 1)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatNumber(row.professoresDiamanteBase, 2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.professoresDiamanteInferidos}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.banhosTotaisMes}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{formatCurrency(row.custoSachesMes)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{formatCurrency(row.custoLavagemMes)}</td>
                          <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{row.qtdReposicoes}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{formatCurrency(row.custoReposicoes)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                            {formatCurrency(row.custoTotalMes)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={cn(
                                'text-sm font-bold tabular-nums',
                                isMax ? 'text-amber-600' : 'text-sky-700',
                              )}>
                                {formatCurrency(row.custoTotalAno)}
                              </span>
                              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', isMax ? 'bg-amber-400' : 'bg-sky-400')}
                                  style={{ width: `${maxAnnualCost > 0 ? (row.custoTotalAno / maxAnnualCost) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-[11px] text-gray-400 italic">
                        Prof. base = (Capacidade × Mix Diamante) / mínimo de aulas · Prof. completos (110+) = FLOOR((Capacidade × Mix Diamante × Ocupação) / mínimo de aulas) · Banhos/mês = Prof. base × (dias úteis + sábados) × ocupação · Custo/mês = sachês + lavagem + reposições · Custo/ano = × 12
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] font-bold text-gray-600 whitespace-nowrap">
                        Média/mês
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-sky-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(avgMonthlyCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* ── Cost composition callout ─────────────────────────────────── */}
            {rows[8] && rows[8].custoTotalMes > 0 && (
              <section className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div className="space-y-3 text-sm flex-1">
                    <p className="font-semibold text-sky-900">Composição do custo mensal no Ano 8</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {[
                        { label: 'Sachês', value: rows[8].custoSachesMes, color: 'bg-sky-500' },
                        { label: 'Lavagem de toalhas', value: rows[8].custoLavagemMes, color: 'bg-indigo-400' },
                        { label: 'Reposições', value: rows[8].custoReposicoes, color: 'bg-violet-400' },
                      ].map(({ label, value, color }) => {
                        const total = rows[8].custoTotalMes;
                        const pct = total > 0 ? (value / total) * 100 : 0;
                        return (
                          <div key={label} className="flex items-center gap-2">
                            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', color)} />
                            <span className="text-gray-600">{label}:</span>
                            <span className="font-semibold text-gray-800">{formatCurrency(value)}</span>
                            <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Stacked bar */}
                    <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
                      {[
                        { value: rows[8].custoSachesMes, color: 'bg-sky-500' },
                        { value: rows[8].custoLavagemMes, color: 'bg-indigo-400' },
                        { value: rows[8].custoReposicoes, color: 'bg-violet-400' },
                      ].map(({ value, color }, idx) => (
                        <div
                          key={idx}
                          className={cn('h-full transition-all duration-500', color)}
                          style={{ width: `${(value / rows[8].custoTotalMes) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
