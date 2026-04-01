'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AnnualAreaChart } from '@/components/charts/AreaGrowthChart';
import { AreaGrowthChart } from '@/components/charts/AreaGrowthChart';
import { AnnualSummaryChart } from '@/components/charts/AnnualSummaryChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { aggregateByYear, resolveAnnualData } from '@/lib/utils/dashboard';
import { TrendingUp, Building2, BarChart2 } from 'lucide-react';
import { StackedContributionChart } from '@/components/charts/StackedContributionChart';

export default function CrescimentoPage() {
  const { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  // FE-C-03: consome endpoint /annual do backend (agora utilizado)
  const { data: annualResponse } = useQuery({
    queryKey: ['dashboard-annual', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.annual(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
    staleTime: 5 * 60 * 1000,
  });

  // FE-B-02: dados por unidade para Stacked Bar (revenue por unidade por ano)
  const { data: unitsComparison } = useQuery({
    queryKey: ['units-comparison-revenue', businessId, scenarioId, 'revenue_total'],
    queryFn: () => dashboardApi.unitsComparison(businessId!, scenarioId!, 'revenue_total'),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units-list', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  const ts = dashboard?.time_series ?? [];

  const seriesData = ts.map((d) => ({
    period: d.period,
    revenue: getRevenue(d),
    profit: d.net_result,
  }));

  // FIX B11: prefere annual_summaries do backend (calculado com precisão) antes de re-agregar
  const annualData = resolveAnnualData(dashboard?.annual_summaries, ts);

  // Filtra por intervalo de período ou ano
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // CAGR de receita (se houver pelo menos 2 anos)
  const revenueCAGR =
    annualData.length >= 2
      ? Math.pow(
          annualData[annualData.length - 1].revenue / (annualData[0].revenue || 1),
          1 / (annualData.length - 1),
        ) - 1
      : 0;

  const singleYear = annualData.length < 2;

  // Crescimento YoY do último vs penúltimo ano
  const lastYear = annualData[annualData.length - 1];
  const prevYear = annualData[annualData.length - 2];
  const yoyGrowth = prevYear && prevYear.revenue > 0
    ? (lastYear.revenue - prevYear.revenue) / prevYear.revenue
    : 0;

  // Monta dados para o StackedContributionChart: por unidade, receita anual
  const stackedUnits = (unitsComparison?.units ?? []).map((u) => {
    // series é Record<period, value> onde period = "YYYY-MM" e value = receita mensal
    const byYear = new Map<string, number>();
    for (const [period, value] of Object.entries(u.series)) {
      const yr = String(period).slice(0, 4);
      byYear.set(yr, (byYear.get(yr) ?? 0) + (value as number));
    }
    return {
      unit_name: u.unit_name,
      annual: Array.from(byYear.entries()).map(([year, revenue]) => ({ year, revenue })),
    };
  });

  const unitsByStatus = {
    active: units.filter((u) => u.status === 'active').length,
    planning: units.filter((u) => u.status === 'planning').length,
    preOpening: units.filter((u) => u.status === 'pre_opening').length,
    closed: units.filter((u) => u.status === 'closed').length,
  };

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Crescimento" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Crescimento" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* KPIs de Crescimento */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Crescimento da Rede</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              <>
                <MetricCard
                  label="Crescimento YoY"
                  value={singleYear ? '—' : formatPercent(yoyGrowth)}
                  trend={singleYear ? 'neutral' : yoyGrowth > 0 ? 'up' : yoyGrowth < 0 ? 'down' : 'neutral'}
                  trendValue={!singleYear && yoyGrowth !== 0 ? `${yoyGrowth > 0 ? '+' : ''}${formatPercent(yoyGrowth)}` : undefined}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accentColor={singleYear ? 'sky' : yoyGrowth > 0.1 ? 'emerald' : yoyGrowth > 0 ? 'amber' : 'rose'}
                  sub={singleYear ? 'Primeiro ano — sem base de comparação' : undefined}
                  tooltip="Crescimento de receita do último ano em relação ao anterior"
                  size="lg"
                />
                <MetricCard
                  label="CAGR de Receita"
                  value={singleYear ? '—' : formatPercent(revenueCAGR)}
                  trend={singleYear ? 'neutral' : revenueCAGR > 0 ? 'up' : 'neutral'}
                  icon={<BarChart2 className="h-4 w-4" />}
                  accentColor="indigo"
                  sub={singleYear ? 'Dados insuficientes (< 2 anos)' : `${annualData.length} anos de dados`}
                  tooltip="Taxa de crescimento composta anual da receita"
                  size="lg"
                />
                <MetricCard
                  label="Unidades Ativas"
                  value={formatNumber(unitsByStatus.active)}
                  trend={unitsByStatus.active > 0 ? 'up' : 'neutral'}
                  icon={<Building2 className="h-4 w-4" />}
                  accentColor="sky"
                  sub={`${unitsByStatus.planning} em planejamento · ${unitsByStatus.preOpening} pré-abertura`}
                  size="lg"
                />
                <MetricCard
                  label="Expansão Planejada"
                  value={formatNumber(unitsByStatus.planning + unitsByStatus.preOpening)}
                  trend={unitsByStatus.planning > 0 ? 'up' : 'neutral'}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accentColor="violet"
                  sub="Unidades em abertura ou planejamento"
                  size="lg"
                />
              </>
            )}
          </div>
        </section>

        {/* Gráficos de evolução */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {annualData.length > 0 ? (
                <AnnualSummaryChart
                  data={annualData}
                  title="Resumo Anual — Receita, Lucro e Margem"
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <NoFiltersState compact message="Sem dados anuais para exibir." />
                </div>
              )}

              {filteredTs.length > 0 ? (
                <AreaGrowthChart
                  data={filteredTs}
                  title={year ? `Evolução Mensal ${year}` : 'Evolução Mensal'}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <NoFiltersState compact message="Sem dados mensais para exibir." />
                </div>
              )}
            </>
          )}
        </section>

        {/* FE-B-02: Stacked bar de receita por unidade */}
        {!isLoading && stackedUnits.length > 1 && (
          <section>
            <StackedContributionChart
              units={stackedUnits}
              title="Expansão da Receita por Unidade — Evolução Anual"
            />
          </section>
        )}

        {/* Tabela de evolução anual */}
        {!isLoading && annualData.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Resumo por Ano</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Ano</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Receita</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Lucro</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Margem</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">ΔYoY</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">CAGR acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {annualData.map((row, idx) => {
                    const prev = annualData[idx - 1];
                    const first = annualData[0];
                    const growth = prev && prev.revenue > 0
                      ? (row.revenue - prev.revenue) / prev.revenue
                      : null;
                    // CAGR acumulado: do primeiro ano até o ano atual
                    const cagrAccum =
                      idx > 0 && first.revenue > 0
                        ? Math.pow(row.revenue / first.revenue, 1 / idx) - 1
                        : null;
                    return (
                      <tr key={row.year} className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-bold text-gray-800">{row.year}</td>
                        <td className="px-6 py-3.5 text-sm text-right font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className={`px-6 py-3.5 text-sm text-right font-semibold tabular-nums ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {formatCurrency(row.profit)}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-right text-gray-600 tabular-nums">
                          {formatPercent(row.margin)}
                        </td>
                        {/* ΔYoY com badge colorido */}
                        <td className="px-6 py-3.5 text-right">
                          {growth !== null ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                              growth > 0.1 ? 'bg-emerald-100 text-emerald-700'
                              : growth > 0 ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                            }`}>
                              {growth >= 0 ? '+' : ''}{formatPercent(growth)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        {/* CAGR acumulado */}
                        <td className="px-6 py-3.5 text-right">
                          {cagrAccum !== null ? (
                            <span className={`text-xs font-semibold tabular-nums ${cagrAccum > 0.1 ? 'text-emerald-600' : cagrAccum > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                              {formatPercent(cagrAccum)} a.a.
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Rodapé com CAGR global */}
                {annualData.length >= 2 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs">
                      <td className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wide" colSpan={4}>
                        CAGR global ({annualData[0].year}–{annualData[annualData.length - 1].year})
                      </td>
                      <td className="px-6 py-3" />
                      <td className="px-6 py-3 text-right">
                        <span className={`font-bold text-sm tabular-nums ${revenueCAGR > 0.1 ? 'text-emerald-600' : revenueCAGR > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                          {singleYear ? '—' : `${formatPercent(revenueCAGR)} a.a.`}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        )}

        {/* Expansão de unidades */}
        {!isLoading && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Ativas', count: unitsByStatus.active, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              { label: 'Pré-abertura', count: unitsByStatus.preOpening, color: 'bg-sky-100 text-sky-700 border-sky-200' },
              { label: 'Planejamento', count: unitsByStatus.planning, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
              { label: 'Encerradas', count: unitsByStatus.closed, color: 'bg-gray-100 text-gray-500 border-gray-200' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl border p-5 ${item.color}`}>
                <p className="text-3xl font-bold mb-1">{item.count}</p>
                <p className="text-sm font-semibold">{item.label}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
