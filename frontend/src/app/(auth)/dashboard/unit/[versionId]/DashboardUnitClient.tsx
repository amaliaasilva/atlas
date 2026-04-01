'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { dashboardApi, calculationsApi, versionsApi } from '@/lib/api';
import { getRevenue } from '@/types/api';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/Spinner';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { OccupancyChart } from '@/components/charts/OccupancyChart';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import {
  TrendingUp, Users, DollarSign, Target, BarChart2, RefreshCw
} from 'lucide-react';

export default function DashboardUnitClient() {
  const { versionId } = useParams<{ versionId: string }>();
  const router = useRouter();

  const { data: version } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionsApi.get(versionId),
  });

  const queryClient = useQueryClient();

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-unit', versionId],
    queryFn: () => dashboardApi.unit(versionId),
    retry: 1,
  });

  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(versionId),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dre', versionId] });
      queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-consolidated'] });
      queryClient.invalidateQueries({ queryKey: ['results', versionId] });
    },
  });

  if (isLoading) return <LoadingScreen />;

  const kpis = dashboard?.kpis;
  const ts = dashboard?.time_series ?? [];

  return (
    <>
      <Topbar title={`Dashboard — ${version?.name ?? 'Unidade'}`} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Visão da Unidade</h2>
            <p className="text-sm text-gray-500 mt-0.5">{ts.length} períodos calculados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push(`/results/${versionId}`)}>
              Ver DRE completa
            </Button>
            <Button variant="secondary" size="sm" onClick={() => recalcMutation.mutate()} loading={recalcMutation.isPending}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {ts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <BarChart2 className="h-16 w-16 mb-4 opacity-20" />
            <p className="mb-4">Nenhum resultado ainda. Clique em Recalcular.</p>
            <Button onClick={() => recalcMutation.mutate()} loading={recalcMutation.isPending}>
              Recalcular
            </Button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                label="Receita Bruta (último mês)"
                value={formatCurrency(getRevenue(ts[ts.length - 1]))}
                icon={<DollarSign className="h-4 w-4" />}
                trend={getRevenue(ts[ts.length - 1]) > 0 ? 'up' : 'neutral'}
              />
              <KpiCard
                label="Resultado Líquido"
                value={formatCurrency(kpis?.net_result ?? 0)}
                icon={<TrendingUp className="h-4 w-4" />}
                trend={(kpis?.net_result ?? 0) >= 0 ? 'up' : 'down'}
                sub={kpis?.net_margin ? formatPercent(kpis.net_margin) : undefined}
              />
              <KpiCard
                label="EBITDA (acumulado)"
                value={formatCurrency(kpis?.ebitda ?? 0)}
                icon={<Target className="h-4 w-4" />}
                trend={(kpis?.ebitda ?? 0) >= 0 ? 'up' : 'down'}
              />
              <KpiCard
                label="Horas Vendidas (último mês)"
                value={`${Math.round(ts[ts.length - 1]?.active_hours_month ?? 0).toLocaleString('pt-BR')} h`}
                icon={<Users className="h-4 w-4" />}
                sub={
                  kpis?.break_even_occupancy_pct
                    ? `Break-even: ${formatPercent(kpis.break_even_occupancy_pct)}`
                    : kpis?.break_even_revenue
                    ? `Break-even: ${formatCurrency(kpis.break_even_revenue)}`
                    : undefined
                }
              />
              <KpiCard
                label="Ocupação (último mês)"
                value={formatPercent(ts[ts.length - 1]?.occupancy_rate ?? 0)}
                icon={<BarChart2 className="h-4 w-4" />}
                trend={
                  (ts[ts.length - 1]?.occupancy_rate ?? 0) > 0.7 ? 'up' :
                  (ts[ts.length - 1]?.occupancy_rate ?? 0) > 0.4 ? 'neutral' : 'down'
                }
                sub={
                  kpis?.contribution_margin_pct
                    ? `M. Contrib.: ${formatPercent(kpis.contribution_margin_pct)}`
                    : undefined
                }
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={ts} />
              <OccupancyChart
                data={ts}
                breakEvenOccupancy={kpis?.break_even_occupancy_pct ?? undefined}
              />
            </div>

            {/* Métricas de payback */}
            {kpis?.payback_months && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  {kpis.payback_months}
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">Meses para Payback</p>
                  <p className="text-sm text-indigo-600">com base no fluxo acumulado</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
