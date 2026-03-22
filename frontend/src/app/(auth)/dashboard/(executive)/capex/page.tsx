'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';

export default function CapexPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', businessId, scenarioId],
    queryFn: () => dashboardApi.portfolio(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

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

  // Dados do waterfall a partir do dashboard consolidado
  const ts = dashboard?.time_series ?? [];
  const revenue = ts.reduce((a, d) => a + getRevenue(d), 0);
  const fixedCosts = ts.reduce((a, d) => a + (d.total_fixed_costs ?? 0), 0);
  const variableCosts = ts.reduce((a, d) => a + (d.total_variable_costs ?? 0), 0);
  const taxes = ts.reduce((a, d) => a + (d.taxes_on_revenue ?? 0), 0);
  const financing = ts.reduce((a, d) => a + (d.financing_payment ?? 0), 0);
  const netResult = ts.reduce((a, d) => a + d.net_result, 0);

  const hasWaterfall = revenue > 0;

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

        {/* Waterfall DRE */}
        {isLoading ? (
          <ChartSkeleton />
        ) : hasWaterfall ? (
          <WaterfallChart
            revenue={revenue}
            fixedCosts={fixedCosts}
            variableCosts={variableCosts}
            taxes={taxes}
            financing={financing}
            netResult={netResult}
            title="Cascata de Resultado — Período Completo"
          />
        ) : (
          <NoFiltersState message="Sem dados financeiros calculados para o período." />
        )}

        {/* Tabela de payback por unidade */}
        {!isLoading && portfolio && portfolio.units.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Payback por Unidade</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 text-left font-semibold">Unidade</th>
                  <th className="px-6 py-3 text-right font-semibold">CAPEX</th>
                  <th className="px-6 py-3 text-right font-semibold">Resultado</th>
                  <th className="px-6 py-3 text-right font-semibold">Payback</th>
                  <th className="px-6 py-3 text-right font-semibold">ROI</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.units.map((u, i) => (
                  <tr key={u.unit_id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                    <td className="px-6 py-3 font-medium text-slate-700">{u.unit_name}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{formatCurrency(u.capex)}</td>
                    <td className={`px-6 py-3 text-right tabular-nums font-medium ${u.net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {formatCurrency(u.net_result)}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {u.payback_months === null ? '—' : u.payback_months < 12 ? `${u.payback_months}m` : `${(u.payback_months / 12).toFixed(1)}a`}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${u.roi_pct !== null ? (u.roi_pct >= 0.15 ? 'text-emerald-600' : u.roi_pct >= 0 ? 'text-amber-600' : 'text-rose-500') : 'text-slate-400'}`}>
                      {u.roi_pct !== null ? `${(u.roi_pct * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
