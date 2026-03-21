'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { dashboardApi, calculationsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/Spinner';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { DollarSign, TrendingUp, Target, Users, RefreshCw } from 'lucide-react';

export default function DashboardConsolidatedClient() {
  const { businessId } = useParams<{ businessId: string }>();
  const { scenarioId, selectedUnitIds, periodStart, periodEnd } = useDashboardFilters();

  // Qualquer seleção de unidades filtra o consolidado; vazio = rede inteira
  const filterUnitIds = selectedUnitIds;

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, filterUnitIds],
    queryFn: () => dashboardApi.consolidated(businessId, scenarioId!, filterUnitIds),
    enabled: !!scenarioId,
  });

  const consolidateMutation = useMutation({
    mutationFn: () => calculationsApi.consolidate(businessId, scenarioId!),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <LoadingScreen />;

  const kpis = dashboard?.kpis;
  const allTs = dashboard?.time_series ?? [];

  // Filtro temporal client-side
  const ts = allTs.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    return true;
  });

  return (
    <>
      <Topbar title="Dashboard Consolidado" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Visão Consolidada do Negócio</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filterUnitIds.length > 0
                ? `${filterUnitIds.length} unidade${filterUnitIds.length > 1 ? 's' : ''} selecionada${filterUnitIds.length > 1 ? 's' : ''} · ${ts.length} meses`
                : `Rede inteira · ${ts.length} meses`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => consolidateMutation.mutate()}
            loading={consolidateMutation.isPending}
            disabled={!scenarioId}
          >
            <RefreshCw className="h-4 w-4" /> Consolidar
          </Button>
        </div>

        {!scenarioId && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            Selecione um cenário nos filtros globais.
          </div>
        )}

        {ts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Receita Bruta Total"
                value={formatCurrency(ts.reduce((s, d) => s + (d.revenue_total ?? 0), 0))}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KpiCard
                label="Resultado Líquido"
                value={formatCurrency(ts.reduce((s, d) => s + (d.net_result ?? 0), 0))}
                icon={<TrendingUp className="h-4 w-4" />}
                trend={ts.reduce((s, d) => s + (d.net_result ?? 0), 0) >= 0 ? 'up' : 'down'}
              />
              <KpiCard
                label="EBITDA Total"
                value={formatCurrency(ts.reduce((s, d) => s + (d.ebitda ?? 0), 0))}
                icon={<Target className="h-4 w-4" />}
              />
              <KpiCard
                label="Taxa de Ocupação"
                value={formatPercent(
                  (() => {
                    const cap = ts.reduce((s, d) => s + (d.capacity_hours_month ?? 0), 0);
                    const act = ts.reduce((s, d) => s + (d.active_hours_month ?? 0), 0);
                    return cap > 0 ? act / cap : 0;
                  })()
                )}
                icon={<Users className="h-4 w-4" />}
                sub={`${formatNumber(ts.reduce((s, d) => s + (d.active_hours_month ?? 0), 0), 0)} h vendidas`}
              />
            </div>

            <RevenueChart data={ts} title="Receita Consolidada por Período" />
          </>
        )}
      </div>
    </>
  );
}

