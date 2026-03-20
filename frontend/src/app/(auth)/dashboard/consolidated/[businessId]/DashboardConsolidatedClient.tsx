'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { dashboardApi, calculationsApi } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/Spinner';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { DollarSign, TrendingUp, Target, Users, RefreshCw } from 'lucide-react';

export default function DashboardConsolidatedClient() {
  const { businessId } = useParams<{ businessId: string }>();
  const search = useSearchParams();
  const scenarioId = search.get('scenario_id') ?? '';

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId, scenarioId),
    enabled: !!scenarioId,
  });

  const consolidateMutation = useMutation({
    mutationFn: () => calculationsApi.consolidate(businessId, scenarioId),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <LoadingScreen />;

  const kpis = dashboard?.kpis;
  const ts = dashboard?.time_series ?? [];

  return (
    <>
      <Topbar title="Dashboard Consolidado" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Visão Consolidada do Negócio</h2>
            <p className="text-sm text-gray-500 mt-0.5">Soma de todas as unidades publicadas</p>
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
            Selecione um cenário via parâmetro <code>?scenario_id=...</code>
          </div>
        )}

        {ts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Receita Bruta Total"
                value={formatCurrency(kpis?.gross_revenue ?? 0)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KpiCard
                label="Resultado Líquido"
                value={formatCurrency(kpis?.net_result ?? 0)}
                icon={<TrendingUp className="h-4 w-4" />}
                trend={(kpis?.net_result ?? 0) >= 0 ? 'up' : 'down'}
              />
              <KpiCard
                label="EBITDA Total"
                value={formatCurrency(kpis?.ebitda ?? 0)}
                icon={<Target className="h-4 w-4" />}
              />
              <KpiCard
                label="Horas Vendidas (slots)"
                value={formatNumber(kpis?.active_students ?? 0)}
                icon={<Users className="h-4 w-4" />}
                sub={kpis?.occupancy_rate ? formatPercent(kpis.occupancy_rate) + ' ocupação' : undefined}
              />
            </div>

            <RevenueChart data={ts} title="Receita Consolidada por Período" />
          </>
        )}
      </div>
    </>
  );
}
