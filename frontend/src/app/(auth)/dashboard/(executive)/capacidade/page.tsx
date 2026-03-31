'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard, ProgressCard } from '@/components/dashboard/MetricCard';
import { BulletChartItem } from '@/components/charts/UnitsBarChart';
import { AreaGrowthChart } from '@/components/charts/AreaGrowthChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { Gauge, Zap, TrendingUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CalendarCapacityBlock } from '@/components/dashboard/CalendarCapacityBlock';

export default function CapacidadePage() {
  const { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: comparison } = useQuery({
    queryKey: ['units-comparison-capacity', businessId, scenarioId],
    queryFn: () => dashboardApi.unitsComparison(businessId!, scenarioId!, 'revenue_total'),
    enabled: !!businessId && !!scenarioId,
  });

  const ts = dashboard?.time_series ?? [];
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // Métricas de capacidade derivadas
  const latestPeriod = filteredTs[filteredTs.length - 1];
  const currentRevenue = filteredTs.reduce((acc, d) => acc + getRevenue(d), 0);
  const currentProfit = filteredTs.reduce((acc, d) => acc + d.net_result, 0);
  const totalFixedCosts = filteredTs.reduce((acc, d) => acc + (d.total_fixed_costs ?? 0), 0);
  const totalVarCosts = filteredTs.reduce((acc, d) => acc + (d.total_variable_costs ?? 0), 0);
  const totalActiveHours = filteredTs.reduce((acc, d) => acc + (d.active_hours_month ?? 0), 0);

  // Capacidade real derivada do engine (P0.10 — substitui o fator 1.4 arbitrário)
  const fallbackAvgPrice = totalActiveHours > 0 ? currentRevenue / totalActiveHours : 0;
  // max receita = soma mensal de (capacidade_horas × preço_médio) nos períodos filtrados
  const estimatedMaxRevenue = filteredTs.reduce(
    (acc, d) => {
      const cap = d.capacity_hours_month ?? 0;
      const rev = getRevenue(d);
      const active = d.active_hours_month ?? 0;
      const avgPrice = active > 0 ? rev / active : fallbackAvgPrice;
      return acc + cap * avgPrice;
    },
    0,
  );
  const utilizationRate = estimatedMaxRevenue > 0 ? currentRevenue / estimatedMaxRevenue : 0;
  const capacityGap = Math.max(estimatedMaxRevenue - currentRevenue, 0);

  // Eficiência operacional = Receita / (Custos Fixos + Custos Variáveis)
  const totalCosts = totalFixedCosts + totalVarCosts;
  const operationalEfficiency = totalCosts > 0 ? currentRevenue / totalCosts : 0;

  const avgMonthlyRevenue = filteredTs.length > 0 ? currentRevenue / filteredTs.length : 0;
  const avgMonthlyCost = filteredTs.length > 0 ? totalCosts / filteredTs.length : 0;

  // Dados para comparação por unidade
  const unitData = comparison?.units ?? [];
  const maxUnitRevenue = Math.max(...unitData.map((u) => u.total), 0);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Capacidade e Eficiência" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Capacidade e Eficiência" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Capacidade e Eficiência Operacional</h2>
            <p className="text-sm text-gray-400 mt-0.5">Quanto da capacidade teórica a rede está capturando</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <ProgressCard
                label="Taxa de Utilização"
                value={formatPercent(utilizationRate)}
                progress={utilizationRate}
                progressLabel="da capacidade máxima"
                icon={<Gauge className="h-4 w-4" />}
                accentColor={utilizationRate > 0.7 ? 'emerald' : utilizationRate > 0.4 ? 'amber' : 'rose'}
                tooltip="Receita atual como % da capacidade máxima estimada"
              />
              <ProgressCard
                label="Eficiência Operacional"
                value={`${operationalEfficiency.toFixed(2)}x`}
                progress={Math.min(operationalEfficiency - 1, 1)}
                progressLabel="acima dos custos totais"
                icon={<Zap className="h-4 w-4" />}
                accentColor={operationalEfficiency > 1.2 ? 'emerald' : operationalEfficiency > 1 ? 'amber' : 'rose'}
                tooltip="Receita dividida pelo total de custos. Acima de 1x = lucrativo"
              />
              <MetricCard
                label="Capacidade Ociosa"
                value={formatCurrency(capacityGap)}
                trend="down"
                icon={<Activity className="h-4 w-4" />}
                accentColor="amber"
                sub="Potencial de receita não capturado"
                tooltip="Diferença entre capacidade máxima estimada e receita atual"
              />
              <MetricCard
                label="Receita vs Capacidade Máx."
                value={formatCurrency(currentRevenue)}
                trend={utilizationRate > 0.5 ? 'up' : 'neutral'}
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor="indigo"
                sub={`Máx. estimado: ${formatCurrency(estimatedMaxRevenue)}`}
              />
            </>
          )}
        </div>

        {/* Bullet Charts por componente */}
        {!isLoading && filteredTs.length > 0 && (
          <Card title="Receita Real vs Capacidade — Análise Visual">
            <div className="space-y-2">
              <BulletChartItem
                label="Receita Atual"
                current={avgMonthlyRevenue}
                target={avgMonthlyRevenue * 1.2}
                max={estimatedMaxRevenue / filteredTs.length}
                formatter={formatCurrency}
              />
              <BulletChartItem
                label="Custos Operacionais Mensais"
                current={avgMonthlyCost}
                max={avgMonthlyRevenue * 1.2}
                formatter={formatCurrency}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 bg-amber-50/50 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                <strong>Nota:</strong> A capacidade máxima estimada é baseada nos melhores resultados observados. 
                Para capacidade exata, configure os campos de capacidade máxima de alunos nas premissas de cada unidade.
              </p>
            </div>
          </Card>
        )}

        {/* Gráfico evolução + tabela de eficiência por unidade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {filteredTs.length > 0 ? (
                <AreaGrowthChart data={filteredTs} title="Receita vs Custos — Evolução" />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <NoFiltersState compact />
                </div>
              )}

              {/* Eficiência por unidade */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-5">Receita por Unidade vs Média</h3>
                {unitData.length > 0 ? (
                  <div className="space-y-3">
                    {unitData.slice(0, 8).map((u) => {
                      const ratio = maxUnitRevenue > 0 ? u.total / maxUnitRevenue : 0;
                      return (
                        <div key={u.unit_id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{u.unit_name}</span>
                            <span className="font-bold text-gray-900 tabular-nums">
                              {formatCurrency(u.total)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <NoFiltersState compact message="Sem dados de unidades publicadas." />
                )}
              </div>
            </>
          )}
        </div>

        {/* Calendário Operacional */}
        {selectedUnitIds.length === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <CalendarCapacityBlock
              unitId={selectedUnitIds[0]}
              year={year ? parseInt(year, 10) : new Date().getFullYear()}
            />
          </div>
        )}

        {/* Indicadores de contexto */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Receita Total',
                value: formatCurrency(currentRevenue),
                desc: 'Acumulado no período',
                bg: 'bg-indigo-50 border-indigo-200',
                text: 'text-indigo-800',
                sub: 'text-indigo-600',
              },
              {
                title: 'Custos Totais',
                value: formatCurrency(totalCosts),
                desc: `${formatCurrency(totalFixedCosts)} fixos + ${formatCurrency(totalVarCosts)} variáveis`,
                bg: 'bg-amber-50 border-amber-200',
                text: 'text-amber-800',
                sub: 'text-amber-600',
              },
              {
                title: 'Resultado Operacional',
                value: formatCurrency(currentProfit),
                desc: `Margem: ${formatPercent(currentRevenue > 0 ? currentProfit / currentRevenue : 0)}`,
                bg: currentProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200',
                text: currentProfit >= 0 ? 'text-emerald-800' : 'text-rose-800',
                sub: currentProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
              },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border p-5 ${item.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${item.sub}`}>
                  {item.title}
                </p>
                <p className={`text-2xl font-bold ${item.text}`}>{item.value}</p>
                <p className={`text-sm mt-1 ${item.sub}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
