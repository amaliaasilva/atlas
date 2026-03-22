'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard, ProgressCard } from '@/components/dashboard/MetricCard';
import { OccupancyLineChart } from '@/components/charts/LineCharts';
import { BulletChartItem } from '@/components/charts/UnitsBarChart';
import { OccupancyGauge } from '@/components/charts/OccupancyGauge';
import { BreakevenBullet } from '@/components/charts/BreakevenBullet';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatPercent, formatNumber } from '@/lib/utils';
import { Users, Target, TrendingUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function OcupacaoPage() {
  const { businessId, scenarioId, year, periodStart, periodEnd } = useDashboardFilters();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  const ts = dashboard?.time_series ?? [];
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // Métricas de ocupação
  const latestPeriod = filteredTs[filteredTs.length - 1];
  const currentOccupancy = latestPeriod?.occupancy_rate ?? 0;
  const currentStudents = latestPeriod?.active_students ?? 0;
  const breakevenStudents = filteredTs.reduce((acc, d) => acc + (d.break_even_students ?? 0), 0) / Math.max(filteredTs.length, 1);

  // Ocupação média do período
  const avgOccupancy = filteredTs.length > 0
    ? filteredTs.reduce((acc, d) => acc + (d.occupancy_rate ?? 0), 0) / filteredTs.length
    : 0;

  // Break-even occupancy — usa diretamente o valor calculado pelo engine (P0.7)
  const breakevenOccupancyRate =
    latestPeriod?.break_even_occupancy_pct ??
    dashboard?.kpis?.break_even_occupancy_pct ??
    0;

  const gapToBreakeven = breakevenStudents - currentStudents;
  const occupancyGap = Math.max(breakevenOccupancyRate - currentOccupancy, 0);

  // Projeção simples: tendência dos 2 últimos períodos
  const prevOccupancy = filteredTs[filteredTs.length - 2]?.occupancy_rate ?? currentOccupancy;
  const projectedOccupancy = Math.min(Math.max(currentOccupancy + (currentOccupancy - prevOccupancy), 0), 1);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Ocupação" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Ocupação" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Ocupação da Rede</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Horas vendidas (slots ocupados) em relação à capacidade máxima da rede
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <ProgressCard
                label="Ocupação Atual"
                value={formatPercent(currentOccupancy)}
                progress={currentOccupancy}
                progressLabel="da capacidade"
                icon={<Users className="h-4 w-4" />}
                accentColor={currentOccupancy > 0.7 ? 'emerald' : currentOccupancy > 0.4 ? 'amber' : 'rose'}
                tooltip="Taxa de ocupação do último período calculado"
              />
              <ProgressCard
                label="Ocupação Média"
                value={formatPercent(avgOccupancy)}
                progress={avgOccupancy}
                progressLabel="média do período"
                icon={<Activity className="h-4 w-4" />}
                accentColor={avgOccupancy > 0.6 ? 'emerald' : avgOccupancy > 0.35 ? 'amber' : 'rose'}
              />
              <MetricCard
                label="Horas Vendidas"
                value={formatNumber(currentStudents)}
                trend={gapToBreakeven < 0 ? 'up' : 'down'}
                icon={<Users className="h-4 w-4" />}
                accentColor="sky"
                sub={`Breakeven: ${formatNumber(Math.round(breakevenStudents))} horas/slots`}
                tooltip="Horas/slots vendidos no último período calculado"
              />
              <MetricCard
                label="Gap para Breakeven"
                value={gapToBreakeven > 0 ? formatNumber(Math.ceil(gapToBreakeven)) : '✓ Atingido'}
                trend={gapToBreakeven <= 0 ? 'up' : 'down'}
                icon={<Target className="h-4 w-4" />}
                accentColor={gapToBreakeven <= 0 ? 'emerald' : 'amber'}
                sub={gapToBreakeven > 0 ? 'horas faltando para breakeven' : 'Operação no breakeven ou acima'}
                tooltip="Diferença entre horas vendidas e horas necessárias para break-even"
              />
            </>
          )}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {filteredTs.length > 0 ? (
                <OccupancyLineChart
                  data={filteredTs}
                  breakevenStudents={Math.round(breakevenStudents)}
                  title="Horas Vendidas e Ocupação — Evolução"
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <NoFiltersState compact />
                </div>
              )}

              {/* Gauge + Bullet breakeven */}
              <Card title="Ocupação vs Breakeven — Visão Visual">
                {filteredTs.length > 0 ? (
                  <div className="space-y-4">
                    {/* Gauge semicircular de ocupação */}
                    <div className="flex justify-center py-2">
                      <OccupancyGauge
                        occupancyRate={currentOccupancy}
                        breakEvenRate={breakevenOccupancyRate}
                        size={200}
                      />
                    </div>

                    {/* Bullet bar de ocupação vs BE */}
                    <BreakevenBullet
                      current={currentOccupancy}
                      breakEven={breakevenOccupancyRate}
                    />

                    <BulletChartItem
                      label="Horas Vendidas"
                      current={currentStudents}
                      breakeven={Math.round(breakevenStudents)}
                      max={Math.max(currentStudents * 1.5, breakevenStudents * 1.2, 1)}
                      formatter={(v) => `${Math.round(v)} horas/slots`}
                    />
                    <BulletChartItem
                      label="Ocupação Projetada (próx. mês)"
                      current={Math.min(projectedOccupancy * 100, 100)}
                      breakeven={breakevenOccupancyRate * 100}
                      max={100}
                      formatter={(v) => `${v.toFixed(1)}%`}
                    />

                    {/* Status visual */}
                    <div className={`mt-4 p-4 rounded-xl border ${gapToBreakeven <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${gapToBreakeven <= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <p className={`text-sm font-bold ${gapToBreakeven <= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {gapToBreakeven <= 0
                            ? 'Ocupação suficiente para breakeven'
                            : `Faltam ${formatNumber(Math.ceil(gapToBreakeven))} horas para breakeven`}
                        </p>
                      </div>
                      <p className={`text-xs ${gapToBreakeven <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {gapToBreakeven <= 0
                          ? `Superávit de ${formatNumber(Math.abs(Math.floor(gapToBreakeven)))} horas acima do ponto de equilíbrio`
                          : `Gap de ${formatPercent(occupancyGap)} na taxa de ocupação`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <NoFiltersState compact />
                )}
              </Card>
            </>
          )}
        </div>

        {/* Tabela periódica */}
        {!isLoading && filteredTs.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Evolução da Ocupação por Período</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Período</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Horas Vendidas</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Ocupação</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Breakeven</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTs.slice(-12).map((d) => {
                    const be = d.break_even_students ?? 0;
                    const students = d.active_students ?? 0;
                    const gap = be - students;
                    return (
                      <tr key={d.period} className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-gray-700">{d.period}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-900">
                          {formatNumber(students)} h
                        </td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums">
                          <span className={`font-semibold ${(d.occupancy_rate ?? 0) >= 0.7 ? 'text-emerald-600' : (d.occupancy_rate ?? 0) >= 0.4 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {formatPercent(d.occupancy_rate ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-500">
                          {be > 0 ? formatNumber(Math.round(be)) : '—'}
                        </td>
                        <td className={`px-6 py-3 text-sm text-right font-semibold tabular-nums ${gap <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {gap <= 0 ? `+${formatNumber(Math.abs(Math.floor(gap)))}` : `-${formatNumber(Math.ceil(gap))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
