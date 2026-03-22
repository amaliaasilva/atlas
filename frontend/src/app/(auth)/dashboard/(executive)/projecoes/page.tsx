'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, scenariosApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AnnualAreaChart } from '@/components/charts/AreaGrowthChart';
import { ScenarioLineChart } from '@/components/charts/LineCharts';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { TrendingUp, BarChart2, Target, LineChart as LineChartIcon } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

import { aggregateByYear } from '@/lib/utils/dashboard';

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Pessimista',
  base: 'Moderado',
  aggressive: 'Otimista',
  custom: 'Personalizado',
};

const SCENARIO_STYLES: Record<string, {
  dot: string; text: string; border: string;
}> = {
  conservative: { dot: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200 bg-rose-50' },
  base: { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200 bg-amber-50' },
  aggressive: { dot: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50' },
  custom: { dot: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200 bg-indigo-50' },
};

// ── page ─────────────────────────────────────────────────────────────────────

export default function ProjecoesPage() {
  const { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');
  const [activeTab, setActiveTab] = useState<'receita' | 'lucro'>('receita');

  // Cenários disponíveis para o negócio
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios-projecoes', businessId],
    queryFn: () => scenariosApi.list(businessId!),
    enabled: !!businessId,
  });

  // Dados do cenário primário (selecionado nos filtros globais)
  const { data: primaryDashboard, isLoading: isLoadingPrimary } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  // Dados de todos os cenários para comparação multi-cenário
  const { data: allScenarioData = [] } = useQuery({
    queryKey: ['multi-scenario-data', businessId, scenarios.map((s) => s.id).join(','), unitScopeKey],
    queryFn: () =>
      Promise.all(
        scenarios.map(async (s) => {
          const data = await dashboardApi.consolidated(businessId!, s.id, unitScope);
          return { scenario: s, data };
        }),
      ),
    enabled: !!businessId && scenarios.length > 0,
  });

  const ts = primaryDashboard?.time_series ?? [];
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // Agrega por ano para o cenário primário
  const primaryAnnual = aggregateByYear(
    filteredTs.map((d) => ({ period: d.period, revenue: getRevenue(d), profit: d.net_result })),
  );

  // Todos os anos disponíveis em todos os cenários
  const allYears = [
    ...new Set(
      allScenarioData.flatMap((sd) => sd.data.time_series.map((d) => d.period.split('-')[0])),
    ),
  ].sort();

  // Séries de projeção por cenário (para ScenarioLineChart)
  const revenueProjectionData = allYears.map((yr) => {
    const point: Record<string, number | string> = { period: yr };
    for (const sd of allScenarioData) {
      const yts = sd.data.time_series.filter((d) => d.period.startsWith(yr));
      const total = yts.reduce((acc, d) => acc + getRevenue(d), 0);
      const t = sd.scenario.scenario_type;
      if (t === 'conservative') point.pessimista = total;
      else if (t === 'base') point.moderado = total;
      else if (t === 'aggressive') point.otimista = total;
    }
    return point as { period: string; pessimista?: number; moderado?: number; otimista?: number };
  });

  const profitProjectionData = allYears.map((yr) => {
    const point: Record<string, number | string> = { period: yr };
    for (const sd of allScenarioData) {
      const yts = sd.data.time_series.filter((d) => d.period.startsWith(yr));
      const total = yts.reduce((acc, d) => acc + d.net_result, 0);
      const t = sd.scenario.scenario_type;
      if (t === 'conservative') point.pessimista = total;
      else if (t === 'base') point.moderado = total;
      else if (t === 'aggressive') point.otimista = total;
    }
    return point as { period: string; pessimista?: number; moderado?: number; otimista?: number };
  });

  // KPIs sumários por cenário (último ano)
  const scenarioKPIs = allScenarioData.map((sd) => {
    const sdAnnual = aggregateByYear(
      sd.data.time_series.map((d) => ({ period: d.period, revenue: getRevenue(d), profit: d.net_result })),
    );
    const last = sdAnnual[sdAnnual.length - 1];
    return {
      scenario: sd.scenario,
      lastYearRevenue: last?.revenue ?? 0,
      lastYearProfit: last?.profit ?? 0,
      lastYearMargin: last?.margin ?? 0,
      years: sdAnnual.length,
    };
  }).sort((a, b) => {
    const order = ['conservative', 'base', 'aggressive'];
    return order.indexOf(a.scenario.scenario_type) - order.indexOf(b.scenario.scenario_type);
  });

  // KPIs do cenário primário
  const lastAnnual = primaryAnnual[primaryAnnual.length - 1];
  const prevAnnual = primaryAnnual[primaryAnnual.length - 2];
  const projectedGrowth =
    prevAnnual && prevAnnual.revenue > 0
      ? (lastAnnual.revenue - prevAnnual.revenue) / prevAnnual.revenue
      : 0;

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Projeções" />
        <div className="p-6">
          <NoFiltersState />
        </div>
      </>
    );
  }

  const projectionData = activeTab === 'receita' ? revenueProjectionData : profitProjectionData;

  return (
    <>
      <Topbar title="Dashboard — Projeções" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Projeções e Cenários</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Evolução anual projetada com comparação entre cenários pessimista, moderado e otimista
            </p>
          </div>
          {/* Toggle receita / lucro */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['receita', 'lucro'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'receita' ? 'Receita' : 'Lucro'}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs primários */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingPrimary ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Receita Projetada — Último Ano"
                value={formatCurrency(lastAnnual?.revenue ?? 0)}
                trend={projectedGrowth > 0 ? 'up' : projectedGrowth < 0 ? 'down' : 'neutral'}
                trendValue={
                  projectedGrowth !== 0
                    ? `${projectedGrowth > 0 ? '+' : ''}${formatPercent(projectedGrowth)}`
                    : undefined
                }
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor="indigo"
                size="lg"
                tooltip="Receita total projetada para o último ano do horizonte no cenário selecionado"
              />
              <MetricCard
                label="Lucro Projetado — Último Ano"
                value={formatCurrency(lastAnnual?.profit ?? 0)}
                trend={(lastAnnual?.profit ?? 0) >= 0 ? 'up' : 'down'}
                icon={<BarChart2 className="h-4 w-4" />}
                accentColor={(lastAnnual?.profit ?? 0) >= 0 ? 'emerald' : 'rose'}
                sub={`Margem: ${formatPercent(lastAnnual?.margin ?? 0)}`}
                size="lg"
              />
              <MetricCard
                label="Crescimento YoY Esperado"
                value={formatPercent(projectedGrowth)}
                trend={projectedGrowth > 0 ? 'up' : projectedGrowth < 0 ? 'down' : 'neutral'}
                icon={<LineChartIcon className="h-4 w-4" />}
                accentColor={
                  projectedGrowth > 0.1 ? 'emerald' : projectedGrowth > 0 ? 'amber' : 'rose'
                }
                sub="Crescimento do último vs penúltimo ano"
                size="lg"
              />
              <MetricCard
                label="Cenários Disponíveis"
                value={formatNumber(scenarios.length)}
                trend="neutral"
                icon={<Target className="h-4 w-4" />}
                accentColor="sky"
                sub={scenarios
                  .map((s) => SCENARIO_LABELS[s.scenario_type] ?? s.name)
                  .join(' · ')}
                size="lg"
              />
            </>
          )}
        </div>

        {/* Gráficos de projeção */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoadingPrimary ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {projectionData.length > 0 ? (
                <ScenarioLineChart
                  data={projectionData}
                  title={`${activeTab === 'receita' ? 'Receita' : 'Lucro'} Projetado — Comparação de Cenários`}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                  <NoFiltersState
                    compact
                    message="Sem múltiplos cenários para comparar. Crie cenários pessimista, moderado e otimista."
                  />
                </div>
              )}
              {primaryAnnual.length > 0 ? (
                <AnnualAreaChart
                  data={primaryAnnual}
                  title="Evolução Anual — Cenário Selecionado"
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <NoFiltersState compact message="Sem dados anuais para o cenário selecionado." />
                </div>
              )}
            </>
          )}
        </div>

        {/* Cards de comparação de cenários */}
        {scenarioKPIs.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Comparação de Cenários — Último Ano de Projeção
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarioKPIs.map((kpi) => {
                const t = kpi.scenario.scenario_type;
                const style = SCENARIO_STYLES[t] ?? SCENARIO_STYLES.custom;
                return (
                  <div
                    key={kpi.scenario.id}
                    className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${style.border}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                        {SCENARIO_LABELS[t] ?? kpi.scenario.name}
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${style.text}`}>
                      {formatCurrency(kpi.lastYearRevenue)}
                    </p>
                    <p className={`text-xs mt-0.5 opacity-70 ${style.text}`}>
                      Receita no último ano projetado
                    </p>
                    <div className="mt-4 pt-4 border-t border-current border-opacity-10 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={`opacity-70 ${style.text}`}>Lucro</span>
                        <span className={`font-bold ${style.text}`}>
                          {formatCurrency(kpi.lastYearProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={`opacity-70 ${style.text}`}>Margem</span>
                        <span className={`font-bold ${style.text}`}>
                          {formatPercent(kpi.lastYearMargin)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={`opacity-70 ${style.text}`}>Horizonte</span>
                        <span className={`font-bold ${style.text}`}>
                          {kpi.years} {kpi.years === 1 ? 'ano' : 'anos'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tabela anual do cenário primário */}
        {!isLoadingPrimary && primaryAnnual.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Projeção Anual — Cenário Selecionado</h3>
              <span className="text-xs text-gray-400">
                {primaryAnnual.length} {primaryAnnual.length === 1 ? 'ano' : 'anos'} de horizonte
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Ano</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Receita Projetada</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Lucro Projetado</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Margem</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Cresc. YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {primaryAnnual.map((row, idx) => {
                    const prev = primaryAnnual[idx - 1];
                    const growth =
                      prev && prev.revenue > 0
                        ? (row.revenue - prev.revenue) / prev.revenue
                        : null;
                    return (
                      <tr
                        key={row.year}
                        className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-sm font-bold text-gray-800">{row.year}</td>
                        <td className="px-6 py-3.5 text-sm text-right font-bold text-gray-900 tabular-nums">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td
                          className={`px-6 py-3.5 text-sm text-right font-bold tabular-nums ${
                            row.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-right text-gray-500 tabular-nums">
                          {formatPercent(row.margin)}
                        </td>
                        <td
                          className={`px-6 py-3.5 text-sm text-right font-semibold tabular-nums ${
                            growth === null
                              ? 'text-gray-400'
                              : growth > 0
                              ? 'text-emerald-600'
                              : 'text-rose-500'
                          }`}
                        >
                          {growth === null
                            ? '—'
                            : `${growth > 0 ? '+' : ''}${formatPercent(growth)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Estado vazio */}
        {!isLoadingPrimary && primaryAnnual.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <NoFiltersState message="Nenhum resultado calculado. Publique versões e consolide o negócio para ver projeções." />
          </div>
        )}
      </div>
    </>
  );
}
