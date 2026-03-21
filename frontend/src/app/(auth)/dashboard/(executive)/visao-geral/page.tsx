'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, unitsApi, versionsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AreaGrowthChart } from '@/components/charts/AreaGrowthChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { DollarSign, TrendingUp, Target, Building2, BarChart2, TrendingDown, Clock, Activity, Percent } from 'lucide-react';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

export default function VisaoGeralPage() {
  const { businessId, scenarioId, selectedUnitIds, periodStart, periodEnd, year } = useDashboardFilters();
  // single-unit: quando exatamente 1 unidade selecionada
  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  // Dashboard consolidado (rede inteira)
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  // Versões da unidade selecionada
  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-dashboard', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  // Melhor versão da unidade (publicada > rascunho > planejamento)
  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  // Dashboard da unidade selecionada
  const { data: unitDashboard, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['dashboard-unit', activeVersion?.id],
    queryFn: () => dashboardApi.unit(activeVersion!.id),
    enabled: !!activeVersion,
  });

  // Unidades do negócio (para contagem)
  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  // Dashboard ativo (unidade específica ou consolidado)
  const effectiveDashboard = unitId ? unitDashboard : dashboard;
  const isLoadingSkeleton = unitId ? isLoadingUnit : isLoading;

  const ts = effectiveDashboard?.time_series ?? [];

  // Filtro por intervalo de período
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // Métricas financeiras
  const totalRevenue = filteredTs.reduce((acc, d) => acc + getRevenue(d), 0);
  const totalProfit = filteredTs.reduce((acc, d) => acc + d.net_result, 0);
  const totalEbitda = filteredTs.reduce((acc, d) => acc + d.ebitda, 0);
  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const ebitdaMargin = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

  // KPIs B2B Coworking
  const avgOccupancy =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.occupancy_rate ?? 0), 0) / filteredTs.length
      : 0;
  const totalCapacityHours = filteredTs.reduce((acc, d) => acc + (d.capacity_hours_month ?? 0), 0);
  const totalActiveHours = filteredTs.reduce((acc, d) => acc + (d.active_hours_month ?? 0), 0);
  const lastTs = filteredTs[filteredTs.length - 1];
  const breakEvenOccupancy = lastTs?.break_even_occupancy_pct ?? effectiveDashboard?.kpis?.break_even_occupancy_pct ?? 0;
  const contributionMargin = lastTs?.contribution_margin_pct ?? effectiveDashboard?.kpis?.contribution_margin_pct ?? 0;
  const hasB2BData = totalCapacityHours > 0 || avgOccupancy > 0;

  // Tendência de receita (primeira vs segunda metade)
  const half = Math.floor(filteredTs.length / 2);
  const firstHalfRevenue = filteredTs.slice(0, half).reduce((acc, d) => acc + getRevenue(d), 0);
  const secondHalfRevenue = filteredTs.slice(half).reduce((acc, d) => acc + getRevenue(d), 0);
  const revenueTrend =
    firstHalfRevenue > 0 ? (secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue : 0;

  // Label do período exibido
  const periodLabel = (() => {
    if (unitId && activeVersion) {
      const unitInfo = units.find((u) => u.id === unitId);
      return `${unitInfo?.name ?? 'Unidade selecionada'} · ${filteredTs.length} meses`;
    }
    if (periodStart && periodEnd) {
      return `${periodStart.slice(0, 4)}–${periodEnd.slice(0, 4)} · ${filteredTs.length} meses`;
    }
    if (periodStart) return `A partir de ${periodStart.slice(0, 4)} · ${filteredTs.length} meses`;
    if (year) return `Ano ${year} · ${filteredTs.length} meses calculados`;
    return `Período completo · ${filteredTs.length} meses calculados`;
  })();

  const totalUnits = units.length;
  const nonClosedUnits = units.filter((u) => u.status !== 'closed').length;

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

  return (
    <>
      <Topbar title="Dashboard — Visão Geral" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Hero KPIs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {unitId ? 'Visão da Unidade' : 'Visão Geral da Rede'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            {totalProfit >= 0 ? (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" />
                {unitId ? 'Unidade lucrativa' : 'Rede lucrativa'}
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
                  label={unitId ? 'Receita Total' : 'Receita Total da Rede'}
                  value={formatCurrency(totalRevenue)}
                  trendValue={revenueTrend !== 0 ? `${revenueTrend > 0 ? '+' : ''}${formatPercent(revenueTrend)}` : undefined}
                  trend={revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'neutral'}
                  icon={<DollarSign className="h-4 w-4" />}
                  accentColor="indigo"
                  tooltip="Receita bruta acumulada no período selecionado"
                  size="lg"
                />
                <MetricCard
                  label={unitId ? 'Lucro Total' : 'Lucro Total da Rede'}
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
                {unitId ? (
                  <MetricCard
                    label="Status da Versão"
                    value={activeVersion ? activeVersion.status.charAt(0).toUpperCase() + activeVersion.status.slice(1) : '—'}
                    trend={activeVersion?.status === 'published' ? 'up' : 'neutral'}
                    icon={<Building2 className="h-4 w-4" />}
                    accentColor={activeVersion?.status === 'published' ? 'emerald' : 'amber'}
                    sub={activeVersion ? activeVersion.name : 'Sem versão calculada'}
                    size="lg"
                  />
                ) : (
                  <MetricCard
                    label="Unidades no Negócio"
                    value={formatNumber(nonClosedUnits)}
                    trend={nonClosedUnits > 0 ? 'up' : 'neutral'}
                    icon={<Building2 className="h-4 w-4" />}
                    accentColor="sky"
                    sub={`${totalUnits} no total · ${units.filter(u => u.status === 'planning').length} em planejamento`}
                    size="lg"
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* KPIs B2B Coworking */}
        {hasB2BData && (
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-700">Indicadores B2B Coworking</h3>
              <p className="text-xs text-gray-400 mt-0.5">Capacidade, ocupação e breakeven do período</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoadingSkeleton ? (
                Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    label="Capacidade Total (h)"
                    value={formatNumber(totalCapacityHours, 0)}
                    trend="neutral"
                    icon={<Clock className="h-4 w-4" />}
                    accentColor="sky"
                    sub={`Média: ${formatNumber(totalCapacityHours / Math.max(filteredTs.length, 1), 0)} h/mês`}
                    tooltip="Total de horas disponíveis no período (slots × horas/dia × dias)"
                  />
                  <MetricCard
                    label="Horas Vendidas (h)"
                    value={formatNumber(totalActiveHours, 0)}
                    trend={totalActiveHours > 0 ? 'up' : 'neutral'}
                    icon={<Activity className="h-4 w-4" />}
                    accentColor="violet"
                    sub={`Média: ${formatNumber(totalActiveHours / Math.max(filteredTs.length, 1), 0)} h/mês`}
                    tooltip="Total de horas efetivamente ocupadas no período"
                  />
                  <MetricCard
                    label="Taxa de Ocupação Média"
                    value={formatPercent(avgOccupancy)}
                    trend={avgOccupancy > 0.4 ? 'up' : avgOccupancy > 0.2 ? 'neutral' : 'down'}
                    icon={<Percent className="h-4 w-4" />}
                    accentColor={avgOccupancy > 0.5 ? 'emerald' : avgOccupancy > 0.25 ? 'amber' : 'rose'}
                    sub={`Breakeven: ${formatPercent(breakEvenOccupancy)}`}
                    tooltip="Taxa de ocupação média do período (horas vendidas / capacidade)"
                  />
                  <MetricCard
                    label="Margem de Contribuição"
                    value={contributionMargin > 0 ? formatPercent(contributionMargin) : '—'}
                    trend={contributionMargin > 0.4 ? 'up' : contributionMargin > 0.2 ? 'neutral' : 'down'}
                    icon={<BarChart2 className="h-4 w-4" />}
                    accentColor={contributionMargin > 0.4 ? 'emerald' : contributionMargin > 0.2 ? 'amber' : 'rose'}
                    sub="Receita − Custos Variáveis"
                    tooltip="Percentual da receita disponível para cobrir custos fixos"
                  />
                </>
              )}
            </div>
          </section>
        )}

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
                        {totalProfit >= 0 ? (unitId ? 'Unidade acima do breakeven' : 'Rede acima do breakeven') : (unitId ? 'Unidade abaixo do breakeven' : 'Rede abaixo do breakeven')}
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
              <NoFiltersState message="Nenhum resultado calculado. Execute o cálculo nas versões e consolide o negócio." />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

