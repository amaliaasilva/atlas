'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { dashboardApi, scenariosApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard, ProgressCard } from '@/components/dashboard/MetricCard';
import { BulletChartItem, ScenarioBarChart } from '@/components/charts/UnitsBarChart';
import { CostsLineChart } from '@/components/charts/LineCharts';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { Card } from '@/components/ui/Card';
import {
  Target, TrendingUp, TrendingDown, Zap, BarChart2,
  CheckCircle2, AlertCircle, XCircle, Activity, DollarSign,
  Pencil, Check, X,
} from 'lucide-react';
import { aggregateByYear, resolveAnnualData } from '@/lib/utils/dashboard';
import { PortfolioTable } from '@/components/tables/PortfolioTable';
import { UnitRevSparkline } from '@/components/charts/UnitRevSparkline';
import { UnitDateChip, UnitOpeningProgress } from '@/components/ui/UnitLifecycleBadge';
import type { Unit } from '@/types/api';

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Pessimista',
  base: 'Moderado',
  aggressive: 'Otimista',
  custom: 'Personalizado',
};

// ── StatusPill ─────────────────────────────────────────────────────────────────

function StatusPill({
  status,
}: {
  status: 'ok' | 'warning' | 'danger';
}) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold">
        <CheckCircle2 className="h-3 w-3" />
        Saudável
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold">
        <AlertCircle className="h-3 w-3" />
        Atenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold">
      <XCircle className="h-3 w-3" />
      Crítico
    </span>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function EstrategicoPage() {
  const { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const queryClient = useQueryClient();
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editDateValue, setEditDateValue] = useState('');

  const updateDateMutation = useMutation({
    mutationFn: ({ id, opening_date }: { id: string; opening_date: string | undefined }) =>
      unitsApi.update(id, { opening_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', businessId] });
      setEditingUnit(null);
    },
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  // Multi-cenário para comparação
  const { data: allScenarioData = [] } = useQuery({
    queryKey: ['multi-scenario-estrategico', businessId, scenarios.map((s) => s.id).join(','), unitScopeKey],
    queryFn: () =>
      Promise.all(
        scenarios.map(async (s) => {
          const data = await dashboardApi.consolidated(businessId!, s.id, unitScope);
          return { scenario: s, data };
        }),
      ),
    enabled: !!businessId && scenarios.length > 0,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio', businessId, scenarioId],
    queryFn: () => dashboardApi.portfolio(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: unitsCompData } = useQuery({
    queryKey: ['units-comparison', businessId, scenarioId, 'revenue_total'],
    queryFn: () => dashboardApi.unitsComparison(businessId!, scenarioId!, 'revenue_total'),
    enabled: !!businessId && !!scenarioId,
  });

  const unitSeriesMap = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const u of unitsCompData?.units ?? []) m.set(u.unit_id, u.series);
    return m;
  }, [unitsCompData]);

  const ts = dashboard?.time_series ?? [];
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // ── Métricas derivadas ────────────────────────────────────────────────────
  const totalRevenue = filteredTs.reduce((acc, d) => acc + getRevenue(d), 0);
  const totalProfit = filteredTs.reduce((acc, d) => acc + d.net_result, 0);
  const totalEbitda = filteredTs.reduce((acc, d) => acc + d.ebitda, 0);
  const totalFixedCosts = filteredTs.reduce((acc, d) => acc + (d.total_fixed_costs ?? 0), 0);
  const totalVarCosts = filteredTs.reduce((acc, d) => acc + (d.total_variable_costs ?? 0), 0);
  const totalCosts = totalFixedCosts + totalVarCosts;

  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const ebitdaMargin = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;
  const operationalEfficiency = totalCosts > 0 ? totalRevenue / totalCosts : 0;

  // Capacidade máxima estimada (base real): capacidade_horas × preço_médio_hora por período.
  const totalActiveHours = filteredTs.reduce((acc, d) => acc + (d.active_hours_month ?? 0), 0);
  const fallbackAvgPrice = totalActiveHours > 0 ? totalRevenue / totalActiveHours : 0;
  const estimatedMaxRevenue = filteredTs.reduce((acc, d) => {
    const cap = d.capacity_hours_month ?? 0;
    const rev = getRevenue(d);
    const active = d.active_hours_month ?? 0;
    const avgPrice = active > 0 ? rev / active : fallbackAvgPrice;
    return acc + cap * avgPrice;
  }, 0);
  const utilizationRate = estimatedMaxRevenue > 0 ? totalRevenue / estimatedMaxRevenue : 0;
  const capacityGap = Math.max(estimatedMaxRevenue - totalRevenue, 0);

  // Breakeven: mês em que resultado ≥ 0
  const breakevenPeriod = filteredTs.find((d) => d.net_result >= 0);
  const avgBreakevenStudents =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.break_even_students ?? 0), 0) / filteredTs.length
      : 0;
  const latestStudents = filteredTs[filteredTs.length - 1]?.active_students ?? 0;
  const gapToBreakeven = Math.max(avgBreakevenStudents - latestStudents, 0);

  // Revenue gap to breakeven (estimado)
  const revenueGapToBreakeven = Math.max(-totalProfit, 0);

  // Status operacional geral
  const overallStatus: 'ok' | 'warning' | 'danger' =
    totalProfit > 0 && margin > 0.05 && utilizationRate > 0.5
      ? 'ok'
      : totalProfit >= 0 || operationalEfficiency > 0.8
      ? 'warning'
      : 'danger';

  // FIX B11: prefere annual_summaries do backend ao invés de re-agregar
  const annualData = resolveAnnualData(dashboard?.annual_summaries, filteredTs);
  const lastYear = annualData[annualData.length - 1];
  const prevYear = annualData[annualData.length - 2];
  const yoyGrowth =
    prevYear && prevYear.revenue > 0
      ? (lastYear.revenue - prevYear.revenue) / prevYear.revenue
      : 0;

  // Comparação de cenários (último ano)
  const scenarioComparison = allScenarioData
    .map((sd) => {
      const yts = sd.data.time_series;
      const lastYr = yts.length > 0 ? yts[yts.length - 1]?.period?.split('-')[0] : null;
      if (!lastYr) return null;
      const yData = aggregateByYear(
        yts.map((d) => ({ period: d.period, revenue: getRevenue(d), profit: d.net_result })),
      );
      const last = yData[yData.length - 1];
      return {
        scenario: sd.scenario,
        revenue: last?.revenue ?? 0,
        profit: last?.profit ?? 0,
        margin: last?.margin ?? 0,
      };
    })
    .filter(Boolean) as {
      scenario: (typeof allScenarioData)[0]['scenario'];
      revenue: number;
      profit: number;
      margin: number;
    }[];

  // Dados para ScenarioBarChart
  const scenarioBarData = (() => {
    if (scenarioComparison.length < 2) return [];
    const groups = [
      { metric: 'Receita', key: 'revenue' },
      { metric: 'Lucro', key: 'profit' },
    ] as const;
    return groups.map(({ metric, key }) => {
      const point: Record<string, number | string> = { metric };
      for (const s of scenarioComparison) {
        const t = s.scenario.scenario_type;
        if (t === 'conservative') point.pessimista = s[key];
        else if (t === 'base') point.moderado = s[key];
        else if (t === 'aggressive') point.otimista = s[key];
      }
      return point as { metric: string; pessimista?: number; moderado?: number; otimista?: number };
    });
  })();

  // Indicadores de saúde
  const indicators = [
    {
      key: 'lucratividade',
      label: 'Lucratividade',
      value: formatPercent(margin),
      sub: margin > 0.1 ? 'Margem saudável' : margin > 0 ? 'Margem baixa' : 'Operação no prejuízo',
      status: margin > 0.1 ? 'ok' : margin > 0 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
    {
      key: 'eficiencia',
      label: 'Eficiência Operacional',
      value: `${operationalEfficiency.toFixed(2)}x`,
      sub: operationalEfficiency > 1.2 ? 'Alta eficiência' : operationalEfficiency > 1 ? 'Eficiência mínima' : 'Custos superam receita',
      status: operationalEfficiency > 1.2 ? 'ok' : operationalEfficiency > 1 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
    {
      key: 'utilizacao',
      label: 'Utilização da Capacidade',
      value: formatPercent(utilizationRate),
      sub: utilizationRate > 0.7 ? 'Alta utilização' : utilizationRate > 0.4 ? 'Capacidade parcial' : 'Subutilizado',
      status: utilizationRate > 0.7 ? 'ok' : utilizationRate > 0.4 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
    {
      key: 'crescimento',
      label: 'Crescimento YoY',
      value: formatPercent(yoyGrowth),
      sub: yoyGrowth > 0.1 ? 'Crescimento sólido' : yoyGrowth > 0 ? 'Crescimento baixo' : 'Queda de receita',
      status: yoyGrowth > 0.1 ? 'ok' : yoyGrowth > 0 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
    {
      key: 'breakeven',
      label: 'Posição vs Breakeven',
      value: totalProfit >= 0 ? 'Acima' : 'Abaixo',
      sub: totalProfit >= 0
        ? `Superávit de ${formatCurrency(totalProfit)}`
        : `Gap de ${formatCurrency(Math.abs(totalProfit))}`,
      status: totalProfit > 0 ? 'ok' : totalProfit === 0 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
    {
      key: 'ebitda',
      label: 'Margem EBITDA',
      value: formatPercent(ebitdaMargin),
      sub: ebitdaMargin > 0.15 ? 'EBITDA saudável' : ebitdaMargin > 0 ? 'EBITDA positivo' : 'EBITDA negativo',
      status: ebitdaMargin > 0.15 ? 'ok' : ebitdaMargin > 0 ? 'warning' : ('danger' as 'ok' | 'warning' | 'danger'),
    },
  ];

  const activeUnits = units.filter((u) => u.status === 'active').length;

  // Unidades com abertura futura — seção "Próximas Aberturas"
  const upcomingUnits = units
    .filter((u) => u.opening_phase === 'future' && u.days_to_opening != null)
    .sort((a, b) => (a.days_to_opening ?? 0) - (b.days_to_opening ?? 0));

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Indicadores Estratégicos" />
        <div className="p-6">
          <NoFiltersState />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Indicadores Estratégicos" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Header com status geral */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Indicadores Estratégicos da Rede</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Resumo executivo · {year ? `Ano ${year}` : 'Período completo'} · {activeUnits} unidades ativas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">Status geral:</span>
            <StatusPill status={overallStatus} />
          </div>
        </div>

        {/* Hero KPIs estratégicos */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Receita Total"
                value={formatCurrency(totalRevenue)}
                trend={totalRevenue > 0 ? 'up' : 'neutral'}
                icon={<DollarSign className="h-4 w-4" />}
                accentColor="indigo"
                sub={`vs Capacidade máx: ${formatCurrency(estimatedMaxRevenue)}`}
                tooltip="Receita bruta somada de todas as unidades no cenário selecionado"
                size="lg"
              />
              <MetricCard
                label="Gap para Breakeven"
                value={revenueGapToBreakeven > 0 ? formatCurrency(revenueGapToBreakeven) : '✓ Atingido'}
                trend={revenueGapToBreakeven <= 0 ? 'up' : 'down'}
                icon={<Target className="h-4 w-4" />}
                accentColor={revenueGapToBreakeven <= 0 ? 'emerald' : 'amber'}
                sub={
                  revenueGapToBreakeven <= 0
                    ? `Lucro: ${formatCurrency(totalProfit)}`
                    : 'Receita adicional necessária'
                }
                tooltip="Quanto de receita adicional é necessário para atingir o equilíbrio operacional"
                size="lg"
              />
              <ProgressCard
                label="Utilização da Capacidade"
                value={formatPercent(utilizationRate)}
                progress={utilizationRate}
                progressLabel="da capacidade teórica máxima"
                icon={<Activity className="h-4 w-4" />}
                accentColor={utilizationRate > 0.7 ? 'emerald' : utilizationRate > 0.4 ? 'amber' : 'rose'}
                tooltip="Receita atual como proporção da capacidade máxima estimada"
              />
              <ProgressCard
                label="Eficiência Operacional"
                value={`${operationalEfficiency.toFixed(2)}x`}
                progress={Math.min(Math.max((operationalEfficiency - 0.5) / 1.0, 0), 1)}
                progressLabel={operationalEfficiency > 1 ? 'acima dos custos totais' : 'abaixo dos custos totais'}
                icon={<Zap className="h-4 w-4" />}
                accentColor={operationalEfficiency > 1.2 ? 'emerald' : operationalEfficiency > 1 ? 'amber' : 'rose'}
                tooltip="Receita dividida pelos custos totais (fixos + variáveis). Acima de 1x = lucrativo"
              />
            </>
          )}
        </section>

        {/* Painel de saúde estratégica */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Painel de Saúde Estratégica</h3>
            <p className="text-xs text-gray-400 mt-0.5">Os 6 sinais mais importantes para a tomada de decisão</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-5 border-b border-r border-gray-50">
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-6 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))
              : indicators.map((ind, idx) => (
                  <div
                    key={ind.key}
                    className={`p-5 border-gray-50 ${
                      idx < 3 ? 'border-b' : ''
                    } ${
                      idx % 3 < 2 ? 'border-r' : ''
                    } hover:bg-gray-50/50 transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {ind.label}
                      </span>
                      <StatusPill status={ind.status} />
                    </div>
                    <p
                      className={`text-2xl font-bold mb-1 ${
                        ind.status === 'ok'
                          ? 'text-emerald-600'
                          : ind.status === 'warning'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {ind.value}
                    </p>
                    <p className="text-xs text-gray-400">{ind.sub}</p>
                  </div>
                ))}
          </div>
        </section>

        {/* Bullet Charts — Receita vs Breakeven vs Capacidade */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Receita vs Breakeven vs Capacidade Máxima">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : filteredTs.length > 0 ? (
              <div className="space-y-4">
                <BulletChartItem
                  label="Receita vs Capacidade"
                  current={totalRevenue}
                  target={estimatedMaxRevenue * 0.85}
                  max={estimatedMaxRevenue}
                  formatter={formatCurrency}
                />
                <BulletChartItem
                  label="Lucro vs Breakeven (zero)"
                  current={Math.max(totalProfit, 0)}
                  breakeven={Math.abs(Math.min(totalProfit, 0))}
                  max={Math.max(Math.abs(totalProfit) * 2, totalRevenue * 0.2, 1)}
                  formatter={formatCurrency}
                />
                <BulletChartItem
                  label="Horas Vendidas vs Breakeven"
                  current={latestStudents}
                  breakeven={Math.round(avgBreakevenStudents)}
                  max={Math.max(latestStudents * 1.5, avgBreakevenStudents * 1.3, 1)}
                  formatter={(v) => `${Math.round(v)} horas/slots`}
                />

                {/* Caption */}
                <div className="pt-4 mt-2 border-t border-gray-100 grid grid-cols-3 gap-3 text-xs text-center">
                  <div>
                    <p className="font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                    <p className="text-gray-400">Receita atual</p>
                  </div>
                  <div>
                    <p className={`font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(totalProfit)}
                    </p>
                    <p className="text-gray-400">Resultado</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500">{formatCurrency(capacityGap)}</p>
                    <p className="text-gray-400">Gap de capacidade</p>
                  </div>
                </div>
              </div>
            ) : (
              <NoFiltersState compact message="Sem dados calculados para esta seleção." />
            )}
          </Card>

          {/* Estrutura de custos */}
          {isLoading ? (
            <ChartSkeleton />
          ) : filteredTs.length > 0 ? (
            <CostsLineChart data={filteredTs} title="Receita vs Custos — Evolução" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <NoFiltersState compact />
            </div>
          )}
        </section>

        {/* Comparação de cenários */}
        {scenarioBarData.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Comparação Estratégica: Pessimista × Moderado × Otimista
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScenarioBarChart
                data={scenarioBarData}
                title="Receita e Lucro por Cenário — Último Ano"
              />

              {/* Cards de cenário */}
              <div className="grid grid-cols-1 gap-4 content-start">
                {scenarioComparison
                  .sort((a, b) => {
                    const order = ['conservative', 'base', 'aggressive', 'custom'];
                    return (
                      order.indexOf(a.scenario.scenario_type) -
                      order.indexOf(b.scenario.scenario_type)
                    );
                  })
                  .map((s) => {
                    const t = s.scenario.scenario_type;
                    const colors = {
                      conservative: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
                      base: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
                      aggressive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                      custom: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
                    }[t] ?? { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' };

                    return (
                      <div
                        key={s.scenario.id}
                        className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                            {SCENARIO_LABELS[t] ?? s.scenario.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className={`text-xs opacity-60 ${colors.text}`}>Receita</p>
                            <p className={`font-bold ${colors.text}`}>{formatCurrency(s.revenue)}</p>
                          </div>
                          <div>
                            <p className={`text-xs opacity-60 ${colors.text}`}>Lucro</p>
                            <p className={`font-bold ${colors.text}`}>{formatCurrency(s.profit)}</p>
                          </div>
                          <div>
                            <p className={`text-xs opacity-60 ${colors.text}`}>Margem</p>
                            <p className={`font-bold ${colors.text}`}>{formatPercent(s.margin)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* Resumo executivo — decisões prioritárias */}
        {!isLoading && filteredTs.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Diagnóstico Executivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Forças */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Pontos Positivos</span>
                </div>
                <ul className="space-y-2 text-xs text-emerald-700">
                  {totalProfit >= 0 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      Rede acima do breakeven com margem de {formatPercent(margin)}
                    </li>
                  )}
                  {yoyGrowth > 0 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      Crescimento de receita de {formatPercent(yoyGrowth)} no último ano
                    </li>
                  )}
                  {utilizationRate > 0.5 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      Utilização da capacidade acima de {formatPercent(utilizationRate)}
                    </li>
                  )}
                  {operationalEfficiency > 1 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      Eficiência operacional de {operationalEfficiency.toFixed(2)}× (positivo)
                    </li>
                  )}
                  {ebitdaMargin > 0 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      EBITDA positivo: {formatPercent(ebitdaMargin)} de margem
                    </li>
                  )}
                  {activeUnits > 0 && (
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      {activeUnits} {activeUnits === 1 ? 'unidade ativa' : 'unidades ativas'} na rede
                    </li>
                  )}
                  {totalProfit < 0 && yoyGrowth <= 0 && utilizationRate <= 0.5 && operationalEfficiency <= 1 && (
                    <li className="text-emerald-500 italic">Nenhum ponto positivo relevante identificado no período.</li>
                  )}
                </ul>
              </div>

              {/* Riscos */}
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                  <span className="text-sm font-bold text-rose-800">Pontos de Atenção</span>
                </div>
                <ul className="space-y-2 text-xs text-rose-700">
                  {totalProfit < 0 && (
                    <li className="flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Rede abaixo do breakeven: gap de {formatCurrency(Math.abs(totalProfit))}
                    </li>
                  )}
                  {yoyGrowth < 0 && (
                    <li className="flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Queda de receita de {formatPercent(Math.abs(yoyGrowth))} em relação ao ano anterior
                    </li>
                  )}
                  {utilizationRate < 0.4 && (
                    <li className="flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Capacidade ociosa elevada: {formatCurrency(capacityGap)} não capturado
                    </li>
                  )}
                  {operationalEfficiency < 1 && (
                    <li className="flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Custos superam a receita: eficiência {operationalEfficiency.toFixed(2)}×
                    </li>
                  )}
                  {gapToBreakeven > 0 && (
                    <li className="flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Faltam {formatNumber(Math.ceil(gapToBreakeven))} horas/slots para atingir o breakeven
                    </li>
                  )}
                  {margin < 0.05 && margin >= 0 && (
                    <li className="flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      Margem líquida muito baixa ({formatPercent(margin)}) — vulnerável a variações
                    </li>
                  )}
                  {totalProfit >= 0 && yoyGrowth >= 0 && utilizationRate >= 0.4 && operationalEfficiency >= 1 && gapToBreakeven <= 0 && (
                    <li className="text-rose-400 italic">Nenhum risco crítico identificado no período.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Métricas de referência */}
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Receita Total', value: formatCurrency(totalRevenue), color: 'text-indigo-600' },
                { label: 'Lucro Acumulado', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { label: 'Gap Capacidade', value: formatCurrency(capacityGap), color: 'text-amber-600' },
                { label: 'EBITDA', value: formatCurrency(totalEbitda), color: totalEbitda >= 0 ? 'text-violet-600' : 'text-rose-600' },
              ].map((item) => (
                <div key={item.label}>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Perguntas estratégicas respondidas */}
        {!isLoading && filteredTs.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-gray-400" />
              As 8 Perguntas Estratégicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  q: 'A rede está crescendo?',
                  a: yoyGrowth > 0
                    ? `Sim — crescimento de ${formatPercent(yoyGrowth)} no último ano`
                    : yoyGrowth === 0
                    ? 'Estável — sem crescimento ou queda significativa'
                    : `Não — queda de ${formatPercent(Math.abs(yoyGrowth))} no último ano`,
                  ok: yoyGrowth > 0,
                },
                {
                  q: 'A lucratividade acompanha o crescimento?',
                  a:
                    totalProfit >= 0 && yoyGrowth > 0
                      ? `Sim — margem de ${formatPercent(margin)} com crescimento de receita`
                      : totalProfit >= 0
                      ? `Parcialmente — lucro positivo (${formatPercent(margin)}) mas crescimento lento`
                      : `Não — prejuízo de ${formatCurrency(Math.abs(totalProfit))}`,
                  ok: totalProfit >= 0 && margin > 0.05,
                },
                {
                  q: 'A operação está acima ou abaixo do breakeven?',
                  a:
                    totalProfit > 0
                      ? `Acima — superávit de ${formatCurrency(totalProfit)}`
                      : totalProfit === 0
                      ? 'No exato ponto de equilíbrio'
                      : `Abaixo — gap de ${formatCurrency(Math.abs(totalProfit))} para o equilíbrio`,
                  ok: totalProfit >= 0,
                },
                {
                  q: 'Quanto da capacidade máxima está sendo capturada?',
                  a: `${formatPercent(utilizationRate)} — ${
                    utilizationRate > 0.7
                      ? 'alta utilização'
                      : utilizationRate > 0.4
                      ? 'utilização parcial'
                      : 'subutilização significativa'
                  }. Gap: ${formatCurrency(capacityGap)}`,
                  ok: utilizationRate > 0.5,
                },
                {
                  q: 'Qual o gap real para atingir equilíbrio?',
                  a:
                    totalProfit >= 0
                      ? `Já atingido — operação com ${formatCurrency(totalProfit)} de superávit`
                      : `${formatCurrency(revenueGapToBreakeven)} de receita adicional necessária (${formatNumber(Math.ceil(gapToBreakeven))} horas/slots)`,
                  ok: totalProfit >= 0,
                },
                {
                  q: 'Como os cenários alteram receita e lucro?',
                  a:
                    scenarioComparison.length >= 2
                      ? `${scenarioComparison.length} cenários: variação de receita de ${formatCurrency(
                          Math.min(...scenarioComparison.map((s) => s.revenue)),
                        )} a ${formatCurrency(Math.max(...scenarioComparison.map((s) => s.revenue)))}`
                      : 'Configure cenários pessimista, moderado e otimista para comparação',
                  ok: scenarioComparison.length >= 2,
                },
                {
                  q: 'A eficiência operacional é positiva?',
                  a: `${operationalEfficiency.toFixed(2)}× — ${
                    operationalEfficiency > 1.2
                      ? 'alta eficiência'
                      : operationalEfficiency > 1
                      ? 'eficiência mínima positiva'
                      : 'custos superam a receita'
                  }`,
                  ok: operationalEfficiency > 1,
                },
                {
                  q: 'Quais unidades performam melhor e pior?',
                  a:
                    activeUnits > 1
                      ? `${activeUnits} unidades ativas — acesse "Unidades" para ranking completo`
                      : activeUnits === 1
                      ? '1 unidade ativa — sem comparação disponível'
                      : 'Nenhuma unidade ativa configurada',
                  ok: activeUnits > 0,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-4 border ${
                    item.ok
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : 'bg-rose-50/60 border-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                        item.ok ? 'bg-emerald-200' : 'bg-rose-200'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          item.ok ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold mb-1 ${
                          item.ok ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {item.q}
                      </p>
                      <p
                        className={`text-xs leading-relaxed ${
                          item.ok ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ScenarioColumns — comparação lado a lado dos cenários configurados */}
        {!isLoading && scenarioComparison.length >= 2 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Comparação de Cenários</h3>
              <p className="text-xs text-gray-400 mt-0.5">Receita e lucro projetados por cenário — último ano disponível</p>
            </div>
            <div
              className="grid divide-x divide-gray-100"
              style={{ gridTemplateColumns: `repeat(${scenarioComparison.length}, 1fr)` }}
            >
              {scenarioComparison.map((s) => {
                const isActive = s.scenario.id === scenarioId;
                const scenarioLabel =
                  s.scenario.scenario_type === 'conservative' ? 'Pessimista'
                  : s.scenario.scenario_type === 'base' ? 'Moderado'
                  : s.scenario.scenario_type === 'aggressive' ? 'Otimista'
                  : s.scenario.name;
                const accentClass =
                  s.scenario.scenario_type === 'conservative' ? 'border-rose-300 bg-rose-50'
                  : s.scenario.scenario_type === 'base' ? 'border-indigo-300 bg-indigo-50'
                  : 'border-emerald-300 bg-emerald-50';
                const textClass =
                  s.scenario.scenario_type === 'conservative' ? 'text-rose-700'
                  : s.scenario.scenario_type === 'base' ? 'text-indigo-700'
                  : 'text-emerald-700';
                return (
                  <div key={s.scenario.id} className={`p-5 ${isActive ? 'bg-slate-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${accentClass} ${textClass}`}>
                        {scenarioLabel}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 rounded-full px-2 py-0.5">atual</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Receita</p>
                        <p className="text-xl font-bold text-gray-800 tabular-nums">{formatCurrency(s.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Lucro</p>
                        <p className={`text-xl font-bold tabular-nums ${s.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(s.profit)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Margem</p>
                        <p className={`text-base font-semibold tabular-nums ${s.margin > 0.1 ? 'text-emerald-600' : s.margin > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                          {formatPercent(s.margin)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Barra comparativa de receita */}
            {(() => {
              const maxRev = Math.max(...scenarioComparison.map((s) => s.revenue), 1);
              return (
                <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Receita relativa</p>
                  {scenarioComparison.map((s) => {
                    const pct = maxRev > 0 ? s.revenue / maxRev : 0;
                    const barColor = s.scenario.scenario_type === 'conservative' ? 'bg-rose-400' : s.scenario.scenario_type === 'base' ? 'bg-indigo-400' : 'bg-emerald-400';
                    const label = s.scenario.scenario_type === 'conservative' ? 'Pessimista' : s.scenario.scenario_type === 'base' ? 'Moderado' : 'Otimista';
                    return (
                      <div key={s.scenario.id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-10 text-right tabular-nums">{(pct * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        )}

        {/* Próximas Aberturas */}
        {!isLoading && upcomingUnits.length > 0 && (
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-900">Próximas Aberturas</h3>
              <p className="text-xs text-gray-400 mt-0.5">{upcomingUnits.length} {upcomingUnits.length === 1 ? 'unidade' : 'unidades'} com abertura prevista</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcomingUnits.map((unit) => {
                const days = unit.days_to_opening ?? 0;
                const urgency = days <= 30 ? 'rose' : days <= 90 ? 'amber' : 'indigo';
                const colors = {
                  rose: { card: 'border-rose-200 bg-rose-50', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500 animate-pulse', label: 'text-rose-800' },
                  amber: { card: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500 animate-pulse', label: 'text-amber-800' },
                  indigo: { card: 'border-indigo-100 bg-indigo-50/60', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', label: 'text-indigo-800' },
                }[urgency];
                const openingFormatted = unit.opening_date
                  ? new Date(unit.opening_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '';
                return (
                  <div key={unit.id} className={`shrink-0 rounded-2xl border p-4 min-w-[200px] max-w-[220px] ${colors.card}`}>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <p className={`text-xs font-bold leading-tight ${colors.label}`}>{unit.name}</p>
                      <button
                        onClick={() => { setEditingUnit(unit); setEditDateValue(unit.opening_date ?? ''); }}
                        className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                        title="Editar data de abertura"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      <span className={`text-xl font-black tabular-nums ${colors.label}`}>{days}</span>
                      <span className={`text-xs ${colors.label} opacity-70`}>dias</span>
                    </div>
                    <p className={`text-[10px] ${colors.label} opacity-60`}>{openingFormatted}</p>
                    {unit.city && <p className={`text-[10px] ${colors.label} opacity-50 mt-0.5`}>{unit.city}{unit.state ? `, ${unit.state}` : ''}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* UnitStatusCard grid */}
        {!isLoading && units.length > 0 && (
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Status por Unidade</h3>
              <p className="text-xs text-gray-400 mt-0.5">Situação operacional e financeira de cada unidade</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {units.map((unit) => {
                const portfolioUnit = portfolioData?.units.find((u) => u.unit_id === unit.id);
                const statusColor = unit.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : unit.status === 'pre_opening' ? 'bg-sky-100 text-sky-700 border-sky-200' : unit.status === 'planning' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-500 border-gray-200';
                const statusLabel = unit.status === 'active' ? 'Ativa' : unit.status === 'pre_opening' ? 'Pré-abertura' : unit.status === 'planning' ? 'Planejamento' : 'Encerrada';
                const statusDot = unit.status === 'active' ? 'bg-emerald-500' : unit.status === 'pre_opening' ? 'bg-sky-400' : unit.status === 'planning' ? 'bg-indigo-400' : 'bg-gray-300';
                return (
                  <div key={unit.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-bold text-gray-800 leading-tight">{unit.name}</h4>
                        <span className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                          {statusLabel}
                        </span>
                      </div>
                      {unit.city && <p className="text-xs text-gray-400">{unit.city}{unit.state ? `, ${unit.state}` : ''}</p>}
                      <div className="mt-1.5">
                        <UnitDateChip
                          unit={unit}
                          onEdit={() => { setEditingUnit(unit); setEditDateValue(unit.opening_date ?? ''); }}
                        />
                      </div>
                    </div>
                    {unitSeriesMap.has(unit.id) && (
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <p className="text-[10px] text-gray-400 mb-1">Receita — últimos 6 meses</p>
                        <UnitRevSparkline series={unitSeriesMap.get(unit.id)!} />
                      </div>
                    )}
                    {portfolioUnit ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">CAPEX</p>
                            <p className="text-sm font-bold text-gray-800 tabular-nums">{formatCurrency(portfolioUnit.capex)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Resultado</p>
                            <p className={`text-sm font-bold tabular-nums ${portfolioUnit.net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(portfolioUnit.net_result)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">ROI</p>
                            <p className={`text-sm font-semibold tabular-nums ${portfolioUnit.roi_pct === null ? 'text-gray-400' : portfolioUnit.roi_pct >= 0.15 ? 'text-emerald-600' : portfolioUnit.roi_pct >= 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                              {portfolioUnit.roi_pct !== null ? formatPercent(portfolioUnit.roi_pct) : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Payback</p>
                            <p className="text-sm font-semibold text-gray-700 tabular-nums">
                              {portfolioUnit.payback_months === null ? '—' : portfolioUnit.payback_months < 12 ? `${Math.round(portfolioUnit.payback_months)}m` : `${(portfolioUnit.payback_months / 12).toFixed(1)}a`}
                            </p>
                          </div>
                        </div>
                        {unit.opening_phase === 'operating' && unit.months_since_opening != null && portfolioUnit.payback_months != null && (
                          <UnitOpeningProgress unit={unit} targetMonths={Math.round(portfolioUnit.payback_months)} />
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300 pt-3 border-t border-gray-100 italic">
                        {unit.status === 'planning' ? 'Sem cálculo — em planejamento' : 'Execute o cálculo para ver KPIs'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Modal de edição de data de abertura */}
        {editingUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingUnit(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Data de Abertura</h3>
              <p className="text-xs text-gray-400 mb-4">{editingUnit.name}</p>
              <input
                type="date"
                value={editDateValue}
                onChange={(e) => setEditDateValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditingUnit(null)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                {editDateValue && (
                  <button
                    onClick={() => updateDateMutation.mutate({ id: editingUnit.id, opening_date: undefined })}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 hover:bg-rose-100 transition-colors"
                    title="Remover data"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => updateDateMutation.mutate({ id: editingUnit.id, opening_date: editDateValue || undefined })}
                  disabled={updateDateMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {updateDateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portfólio de Unidades */}
        {portfolioData && portfolioData.units.length > 0 && (
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Portfólio — ROI & Payback por Unidade</h3>
              <p className="text-xs text-gray-400 mt-0.5">CAPEX vs resultado líquido acumulado por unidade</p>
            </div>
            <PortfolioTable data={portfolioData} units={units} />
          </section>
        )}
      </div>
    </>
  );
}
