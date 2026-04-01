'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, versionsApi, reportsApi, calculationsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { DRETable } from '@/components/tables/DRETable';
import { NoFiltersState, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import type { DREResponse, DREConsolidatedResponse, DREPeriod, DREItem } from '@/types/api';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

type DREGranularity = 'monthly' | 'annual';

/**
 * Agrega uma DREResponse mensal em visão anual.
 * Soma valores por (year, code) e recalcula pct_of_revenue após agregação.
 */
function aggregateDREToAnnual(data: DREResponse): DREResponse {
  // Agrupa períodos por ano
  const yearMap = new Map<string, Map<string, { item: DREItem; totalValue: number }>>();

  for (const period of data.dre) {
    const year = period.period.slice(0, 4);
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const yearData = yearMap.get(year)!;

    for (const item of period.items) {
      if (!yearData.has(item.code)) {
        yearData.set(item.code, {
          item: { ...item, value: 0, pct_of_revenue: 0 },
          totalValue: 0,
        });
      }
      yearData.get(item.code)!.item.value += item.value;
    }
  }

  // Recalcula pct_of_revenue por ano usando a receita agregada
  const annualPeriods: DREPeriod[] = [];

  for (const [year, yearData] of [...yearMap.entries()].sort()) {
    const revenueEntry = [...yearData.values()].find((e) => e.item.category === 'revenue');
    const totalRevenue = revenueEntry ? revenueEntry.item.value : 0;

    const items: DREItem[] = [...yearData.values()]
      .map((e) => ({
        ...e.item,
        pct_of_revenue: totalRevenue > 0 ? e.item.value / totalRevenue : 0,
      }))
      .sort((a, b) => a.display_order - b.display_order);

    annualPeriods.push({ period: year, items });
  }

  return { ...data, dre: annualPeriods };
}

/**
 * Converte DREConsolidatedResponse para o formato DREResponse aceito pelo DRETable.
 */
function dreConsolidatedToResponse(data: DREConsolidatedResponse): DREResponse {
  return { version_id: `consolidated_${data.business_id}`, dre: data.dre };
}

export default function DREPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [granularity, setGranularity] = useState<DREGranularity>('monthly');

  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(activeVersion!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre', activeVersion?.id] });
      queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
    },
  });

  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-dre', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  const { data: dreData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['dre', activeVersion?.id],
    queryFn: () => dashboardApi.dre(activeVersion!.id),
    enabled: !!activeVersion,
  });

  const { data: dreConsolidated, isLoading: isLoadingConsolidated } = useQuery({
    queryKey: ['dre-consolidated', businessId, scenarioId, selectedUnitIds.join(',')],
    queryFn: () => dashboardApi.dreConsolidated(businessId!, scenarioId!, selectedUnitIds),
    enabled: !!businessId && !!scenarioId && !unitId,
  });

  const isLoading = isLoadingUnit || isLoadingConsolidated;

  // Se unitId: usa DRE individual; caso contrário: usa consolidado
  const rawData: DREResponse | null =
    unitId
      ? (dreData ?? null)
      : dreConsolidated
      ? dreConsolidatedToResponse(dreConsolidated)
      : null;

  // Deriva a visão anual quando necessário
  const displayData = useMemo(() => {
    if (!rawData) return null;
    return granularity === 'annual' ? aggregateDREToAnnual(rawData) : rawData;
  }, [rawData, granularity]);

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

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Demonstrativo de Resultado do Exercício</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {unitId
                ? 'Visualização por unidade selecionada'
                : dreConsolidated
                ? `DRE consolidado — ${dreConsolidated.unit_count} unidade(s)`
                : 'DRE consolidado de todas as unidades da rede'}
            </p>
          </div>

          {/* Toggle mensal / anual */}
          {dreData && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeVersion && (
                <button
                  onClick={() => recalcMutation.mutate()}
                  disabled={recalcMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  title="Recalcular motor financeiro para refletir mudanças na data de abertura ou premissas"
                >
                  {recalcMutation.isPending ? 'Recalculando...' : '⟳ Recalcular'}
                </button>
              )}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {(['monthly', 'annual'] as DREGranularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    granularity === g
                      ? 'bg-white shadow text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g === 'monthly' ? 'Mensal' : 'Anual'}
                </button>
              ))}              </div>            </div>
          )}
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : displayData ? (
          <DRETable data={displayData} onExportCsv={unitId ? handleExport : undefined} isExporting={isExporting} />
        ) : (
          <NoFiltersState message="Nenhuma versão publicada encontrada. Execute o cálculo nas unidades primeiro." />
        )}
      </div>
    </>
  );
}
