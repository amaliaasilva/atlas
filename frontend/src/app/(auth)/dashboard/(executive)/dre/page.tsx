'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, versionsApi, reportsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { DRETable } from '@/components/tables/DRETable';
import { NoFiltersState, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

export default function DREPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const [isExporting, setIsExporting] = useState(false);

  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  //  versões da unidade selecionada (se houver) — caso contrário, pega a primeira unidade
  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-dre', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  const { data: dreData, isLoading } = useQuery({
    queryKey: ['dre', activeVersion?.id],
    queryFn: () => dashboardApi.dre(activeVersion!.id),
    enabled: !!activeVersion,
  });

  async function handleExport() {
    if (!activeVersion) return;
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportCsv(activeVersion.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dre_${activeVersion.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="DRE — Demonstrativo de Resultado" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="DRE — Demonstrativo de Resultado" />
      <div className="p-6 space-y-4 max-w-screen-2xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Demonstrativo de Resultado do Exercício</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {unitId
              ? 'Visualização por unidade selecionada'
              : 'Selecione uma única unidade nos filtros para visualizar o DRE'}
          </p>
        </div>

        {!unitId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            Selecione exatamente uma unidade no filtro lateral para visualizar o DRE detalhado.
          </div>
        ) : isLoading ? (
          <ChartSkeleton />
        ) : dreData ? (
          <DRETable data={dreData} onExportCsv={handleExport} isExporting={isExporting} />
        ) : (
          <NoFiltersState message="Nenhuma versão publicada encontrada para esta unidade. Execute o cálculo primeiro." />
        )}
      </div>
    </>
  );
}
