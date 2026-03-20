'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatRow } from '@/components/dashboard/MetricCard';
import { UnitsBarChart } from '@/components/charts/UnitsBarChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { Building2, Trophy, TrendingDown, Minus } from 'lucide-react';

const METRICS = [
  { key: 'net_result', label: 'Lucro Líquido', formatter: formatCurrency },
  { key: 'revenue_total', label: 'Faturamento', formatter: formatCurrency },
  { key: 'ebitda', label: 'EBITDA', formatter: formatCurrency },
  { key: 'occupancy_rate', label: 'Ocupação Média', formatter: (v: number) => formatPercent(v) },
  { key: 'capacity_hours_month', label: 'Capacidade (h/mês)', formatter: (v: number) => formatNumber(v, 0) },
];

export default function UnidadesPage() {
  const { businessId, scenarioId, year, periodStart, periodEnd } = useDashboardFilters();
  const [selectedMetric, setSelectedMetric] = useState<string>('net_result');

  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['units-comparison', businessId, scenarioId, selectedMetric],
    queryFn: () => dashboardApi.unitsComparison(businessId!, scenarioId!, selectedMetric),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units-info', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  const unitData = comparisonData?.units ?? [];

  // Filtra por intervalo de período ou ano
  const filteredUnitData = unitData.map((u) => ({
    ...u,
    total: Object.entries(u.series)
      .filter(([period]) => {
        if (periodStart && period < periodStart) return false;
        if (periodEnd && period > periodEnd) return false;
        if (!periodStart && !periodEnd && year) return period.startsWith(year);
        return true;
      })
      .reduce((acc, [, v]) => acc + v, 0),
  }));

  const sortedUnits = [...filteredUnitData].sort((a, b) => b.total - a.total);
  const bestUnit = sortedUnits[0];
  const worstUnit = sortedUnits[sortedUnits.length - 1];

  const metricFormatter = METRICS.find((m) => m.key === selectedMetric)?.formatter ?? formatCurrency;
  const maxAbsValue = Math.max(...sortedUnits.map((u) => Math.abs(u.total)), 1);

  const barData = sortedUnits.map((u) => ({
    name: u.unit_name,
    value: Math.round(u.total),
  }));

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Unidades" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Unidades" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Header + seletor de métrica */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Comparação entre Unidades</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {sortedUnits.length} unidades com dados publicados
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedMetric === m.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs de destaque */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Melhor Unidade"
                value={bestUnit ? metricFormatter(bestUnit.total) : '—'}
                trend="up"
                icon={<Trophy className="h-4 w-4" />}
                accentColor="emerald"
                sub={bestUnit?.unit_name}
              />
              <MetricCard
                label="Unidade com Mais Desafios"
                value={worstUnit && worstUnit !== bestUnit ? metricFormatter(worstUnit.total) : '—'}
                trend={worstUnit && worstUnit.total < 0 ? 'down' : 'neutral'}
                icon={<TrendingDown className="h-4 w-4" />}
                accentColor={worstUnit && worstUnit.total < 0 ? 'rose' : 'amber'}
                sub={worstUnit?.unit_name}
              />
              <MetricCard
                label="Total da Rede"
                value={metricFormatter(sortedUnits.reduce((acc, u) => acc + u.total, 0))}
                trend="neutral"
                icon={<Building2 className="h-4 w-4" />}
                accentColor="indigo"
                sub={`Soma de ${sortedUnits.length} unidades`}
              />
              <MetricCard
                label="Média por Unidade"
                value={sortedUnits.length > 0 ? metricFormatter(sortedUnits.reduce((acc, u) => acc + u.total, 0) / sortedUnits.length) : '—'}
                trend="neutral"
                icon={<Minus className="h-4 w-4" />}
                accentColor="sky"
                sub="Média do período"
              />
            </>
          )}
        </div>

        {/* Gráfico de barras */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <div className="lg:col-span-2"><ChartSkeleton /></div>
              <ChartSkeleton />
            </>
          ) : barData.length > 0 ? (
            <>
              <div className="lg:col-span-2">
                <UnitsBarChart
                  data={barData}
                  title={`Ranking — ${METRICS.find((m) => m.key === selectedMetric)?.label}`}
                  valueFormatter={metricFormatter}
                />
              </div>

              {/* Tabela ranking */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Ranking Completo</h3>
                <div className="space-y-0.5">
                  {sortedUnits.map((u, idx) => (
                    <StatRow
                      key={u.unit_id}
                      label={u.unit_name}
                      value={metricFormatter(u.total)}
                      rank={idx + 1}
                      bar={maxAbsValue > 0 ? Math.abs(u.total) / maxAbsValue : 0}
                      barColor={u.total >= 0 ? 'bg-indigo-500' : 'bg-rose-400'}
                      sub={u.total < 0 ? 'Resultado negativo' : undefined}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <NoFiltersState message="Nenhuma unidade com versão publicada para este cenário." />
            </div>
          )}
        </div>

        {/* Tabela consolidada */}
        {!isLoading && sortedUnits.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Tabela Consolidada por Unidade</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Unidade</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wider">Status</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">
                      {METRICS.find((m) => m.key === selectedMetric)?.label}
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">% da Rede</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnits.map((u, idx) => {
                    const totalNet = sortedUnits.reduce((acc, x) => acc + Math.abs(x.total), 0);
                    const share = totalNet > 0 ? Math.abs(u.total) / totalNet : 0;
                    const unitInfo = units.find((ui) => ui.id === u.unit_id);
                    return (
                      <tr key={u.unit_id} className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{u.unit_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            unitInfo?.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : unitInfo?.status === 'planning'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {unitInfo?.status ?? '—'}
                          </span>
                        </td>
                        <td className={`px-6 py-3.5 text-sm text-right font-bold tabular-nums ${u.total >= 0 ? 'text-gray-900' : 'text-rose-500'}`}>
                          {metricFormatter(u.total)}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-right text-gray-500 tabular-nums">
                          {formatPercent(share)}
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
