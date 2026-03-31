'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
import { PaybackCurveChart } from '@/components/charts/PaybackCurveChart';
import { UnitContributionTable } from '@/components/tables/UnitContributionTable';

export default function CapexPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', businessId, scenarioId],
    queryFn: () => dashboardApi.portfolio(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  // Série temporal consolidada (para a curva de payback)
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="CAPEX — Investimentos" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  // KPIs de CAPEX a partir do portfólio
  const totalCapex = portfolio?.total_capex ?? 0;
  const totalNet = portfolio?.total_net_result ?? 0;
  const roi = portfolio?.roi_pct;

  // Payback médio das unidades
  const unitsWithPayback = portfolio?.units.filter((u) => u.payback_months !== null) ?? [];
  const avgPayback =
    unitsWithPayback.length > 0
      ? unitsWithPayback.reduce((a, u) => a + (u.payback_months ?? 0), 0) / unitsWithPayback.length
      : null;

  // FIX B14: dados do gráfico CAPEX por unidade (não mais DRE waterfall)
  const capexChartData = (portfolio?.units ?? [])
    .map((u) => ({
      name: u.unit_name.length > 14 ? u.unit_name.slice(0, 12) + '…' : u.unit_name,
      capex: u.capex,
      resultado: u.net_result,
      roi: u.roi_pct !== null ? +(u.roi_pct * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.capex - a.capex);

  const hasCapexData = capexChartData.length > 0;

  return (
    <>
      <Topbar title="CAPEX — Investimentos" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">CAPEX e Retorno sobre Investimento</h2>
          <p className="text-sm text-gray-400 mt-0.5">Investimento inicial, payback e ROI por unidade</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="CAPEX Total"
                value={formatCurrency(totalCapex)}
                icon={<DollarSign className="h-4 w-4" />}
                accentColor="indigo"
                sub={`${portfolio?.units.length ?? 0} unidades`}
              />
              <MetricCard
                label="ROI da Carteira"
                value={roi !== null && roi !== undefined ? `${(roi * 100).toFixed(1)}%` : '—'}
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor={roi !== null && roi !== undefined && roi >= 0.15 ? 'emerald' : 'amber'}
                sub={`Resultado acumulado: ${formatCurrency(totalNet)}`}
              />
              <MetricCard
                label="Payback Médio"
                value={
                  avgPayback !== null
                    ? avgPayback < 12
                      ? `${Math.round(avgPayback)} meses`
                      : `${(avgPayback / 12).toFixed(1)} anos`
                    : '—'
                }
                icon={<Clock className="h-4 w-4" />}
                accentColor={avgPayback !== null && avgPayback <= 24 ? 'emerald' : 'amber'}
                sub="Média das unidades com payback calculado"
              />
            </>
          )}
        </div>

        {/* FIX B14: Gráfico de CAPEX por unidade (substituiu WaterfallChart DRE) */}
        {isLoading ? (
          <ChartSkeleton />
        ) : hasCapexData ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-1">CAPEX vs Resultado por Unidade</h3>
            <p className="text-xs text-gray-400 mb-5">Investimento inicial e resultado acumulado projetado</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={capexChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'capex' ? 'CAPEX' : 'Resultado',
                  ]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="capex" name="capex" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {capexChartData.map((_, i) => (
                    <Cell key={i} fill="#6366f1" fillOpacity={0.85} />
                  ))}
                </Bar>
                <Bar dataKey="resultado" name="resultado" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {capexChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.resultado >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />CAPEX</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Resultado positivo</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />Resultado negativo</span>
            </div>
          </section>
        ) : (
          <NoFiltersState message="Sem dados de CAPEX calculados para o portfólio." />
        )}

        {/* Tabela de payback por unidade */}
        {/* Curva de Payback — resultado acumulado ao longo do tempo */}
        {!isLoading && dashboard && dashboard.time_series.length > 0 && totalCapex > 0 && (
          <PaybackCurveChart
            timeSeries={dashboard.time_series}
            totalCapex={totalCapex}
            title="Curva de Payback — Resultado Acumulado"
          />
        )}

        {/* Contribuição por unidade — CAPEX, resultado, ROI e payback */}
        {!isLoading && portfolio && portfolio.units.length > 0 && (
          <UnitContributionTable
            units={portfolio.units}
            totalCapex={totalCapex}
            title="Detalhamento por Unidade — CAPEX, Resultado e ROI"
          />
        )}
      </div>
    </>
  );
}

