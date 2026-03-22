'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, versionsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { AuditTracePanel } from '@/components/dashboard/AuditTracePanel';
import { NoFiltersState, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

export default function AuditoriaCalculoPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-audit', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-trace', activeVersion?.id],
    queryFn: () => dashboardApi.auditTrace(activeVersion!.id),
    enabled: !!activeVersion,
  });

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Auditoria de Cálculo" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Auditoria de Cálculo" />
      <div className="p-6 space-y-4 max-w-screen-xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Trilha de Auditoria dos Cálculos</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Detalhamento mês a mês das variáveis e fórmulas utilizadas pelo motor financeiro
          </p>
        </div>

        {!unitId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            Selecione exatamente uma unidade no filtro lateral para visualizar a trilha de cálculo.
          </div>
        ) : isLoading ? (
          <ChartSkeleton />
        ) : auditData ? (
          <AuditTracePanel data={auditData} />
        ) : (
          <NoFiltersState message="Nenhuma versão publicada encontrada para esta unidade." />
        )}
      </div>
    </>
  );
}
