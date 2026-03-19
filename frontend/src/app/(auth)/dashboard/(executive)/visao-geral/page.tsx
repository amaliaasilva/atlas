'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, businessesApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AreaGrowthChart } from '@/components/charts/AreaGrowthChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { DollarSign, TrendingUp, Target, Building2, BarChart2, TrendingDown } from 'lucide-react';

export default function VisaoGeralPage() {
  const { businessId, scenarioId, year } = useDashboardFilters();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  const ts = dashboard?.time_series ?? [];

  // Filtra por ano se selecionado
  const filteredTs = year
    ? ts.filter((d) => d.period.startsWith(year))
    : ts;

  // Calcula métricas derivadas
  const totalRevenue = filteredTs.reduce((acc, d) => acc + getRevenue(d), 0);
  const totalProfit = filteredTs.reduce((acc, d) => acc + d.net_result, 0);
  const totalEbitda = filteredTs.reduce((acc, d) => acc + d.ebitda, 0);
  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const ebitdaMargin = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

  const activeUnits = units.filter((u) => u.status === 'active').length;
  const totalUnits = units.length;

  // Comparação com metade do período (trend simplificado)
  const half = Math.floor(filteredTs.length / 2);
  const firstHalfRevenue = filteredTs.slice(0, half).reduce((acc, d) => acc + getRevenue(d), 0);
  const secondHalfRevenue = filteredTs.slice(half).reduce((acc, d) => acc + getRevenue(d), 0);
  const revenueTrend = firstHalfRevenue > 0
    ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue)
    : 0;

  const firstHalfProfit = filteredTs.slice(0, half).reduce((acc, d) => acc + d.net_result, 0);
  const secondHalfProfit = filteredTs.slice(half).reduce((acc, d) => acc + d.net_result, 0);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Visão Geral" />
        <div className="flex-1 p-6">
          <NoFiltersState />
        </div>
      </>
    );
  }

  const isLoadingSkeleton = isLoading;

  return (
    <>
      <Topbar title="Dashboard — Visão Geral" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Hero KPIs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Visão Geral da Rede</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {year ? `Ano ${year}` : 'Período completo'} · {filteredTs.length} meses calculados
              </p>
            </div>
            {totalProfit >= 0 ? (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" />
                Rede lucrativa
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-200">
                <TrendingDown className="h-3.5 w-3.5" />
                Abaixo do breakeven
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoadingSkeleton ? (
              Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              <>
                <MetricCard
                  label="Receita Total da Rede"
                  value={formatCurrency(totalRevenue)}
                  trendValue={revenueTrend !== 0 ? `${revenueTrend > 0 ? '+' : ''}${formatPercent(revenueTrend)}` : undefined}
                  trend={revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'neutral'}
                  icon={<DollarSign className="h-4 w-4" />}
                  accentColor="indigo"
                  tooltip="Receita bruta somada de todas as unidades publicadas para o cenário selecionado"
                  size="lg"
                />
                <MetricCard
                  label="Lucro Total da Rede"
                  value={formatCurrency(totalProfit)}
                  trend={totalProfit >= 0 ? 'up' : 'down'}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accentColor={totalProfit >= 0 ? 'emerald' : 'rose'}
                  sub={`EBITDA: ${formatCurrency(totalEbitda)}`}
                  tooltip="Resultado líquido acumulado do período selecionado"
                  size="lg"
                />
                <MetricCard
                  label="Margem Líquida"
                  value={formatPercent(margin)}
                  trend={margin > 0.1 ? 'up' : margin > 0 ? 'neutral' : 'down'}
                  icon={<Target className="h-4 w-4" />}
                  accentColor={margin > 0.15 ? 'emerald' : margin > 0 ? 'amber' : 'rose'}
                  sub={`EBITDA Margin: ${formatPercent(ebitdaMargin)}`}
                  tooltip="Lucro líquido dividido pela receita bruta total"
                  size="lg"
                />
                <MetricCard
                  label="Unidades Ativas"
                  value={formatNumber(activeUnits)}
                  trend={activeUnits > 0 ? 'up' : 'neutral'}
                  icon={<Building2 className="h-4 w-4" />}
                  accentColor="sky"
                  sub={`${totalUnits} no total · ${totalUnits - activeUnits} em planejamento`}
                  size="lg"
                />
              </>
            )}
          </div>
        </section>

        {/* Gráfico de evolução */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoadingSkeleton ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : filteredTs.length > 0 ? (
            <>
              <AreaGrowthChart
                data={filteredTs}
                title="Receita vs Lucro — Evolução"
              />
              {/* Métricas secundárias */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-800 mb-5">Destaques do Período</h3>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Receita Média Mensal',
                      value: formatCurrency(filteredTs.length > 0 ? totalRevenue / filteredTs.length : 0),
                      color: 'bg-indigo-500',
                    },
                    {
                      label: 'Lucro Médio Mensal',
                      value: formatCurrency(filteredTs.length > 0 ? totalProfit / filteredTs.length : 0),
                      color: totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
                    },
                    {
                      label: 'Melhor Mês (Receita)',
                      value: formatCurrency(Math.max(...filteredTs.map((d) => getRevenue(d)), 0)),
                      color: 'bg-sky-500',
                    },
                    {
                      label: 'EBITDA Acumulado',
                      value: formatCurrency(totalEbitda),
                      color: totalEbitda >= 0 ? 'bg-violet-500' : 'bg-rose-400',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                      <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Status operacional */}
                <div className={`mt-6 p-4 rounded-xl border ${totalProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-start gap-3">
                    <BarChart2 className={`h-5 w-5 mt-0.5 shrink-0 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${totalProfit >= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {totalProfit >= 0 ? 'Rede acima do breakeven' : 'Rede abaixo do breakeven'}
                      </p>
                      <p className={`text-xs mt-0.5 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {totalProfit >= 0
                          ? `Margem positiva de ${formatPercent(margin)} no período`
                          : `Gap de ${formatCurrency(Math.abs(totalProfit))} para equilíbrio`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <NoFiltersState message="Nenhum resultado calculado. Publique versões e consolide o negócio." />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
