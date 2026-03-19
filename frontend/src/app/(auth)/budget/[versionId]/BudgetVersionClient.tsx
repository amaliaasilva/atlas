'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { assumptionsApi, versionsApi, calculationsApi } from '@/lib/api';
import type { AssumptionValue } from '@/types/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/Spinner';
import { formatPeriod, getErrorMessage } from '@/lib/utils';
import { Save, PlayCircle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Gera lista de períodos entre dois meses ────────────────────────────────────
function generatePeriods(start: string, end: string): string[] {
  const periods: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return periods;
}

export default function BudgetVersionClient() {
  const { versionId } = useParams<{ versionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Dados
  const { data: version, isLoading: loadingVersion } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionsApi.get(versionId),
  });

  const { data: categories } = useQuery({
    queryKey: ['assumption-categories'],
    queryFn: assumptionsApi.categories,
  });

  const { data: definitions } = useQuery({
    queryKey: ['assumption-definitions'],
    queryFn: () => assumptionsApi.definitions(),
  });

  const { data: values, isLoading: loadingValues } = useQuery({
    queryKey: ['assumption-values', versionId],
    queryFn: () => assumptionsApi.values(versionId),
  });

  const periods = useMemo(() => {
    if (!version) return [];
    return generatePeriods(version.horizon_start, version.horizon_end);
  }, [version]);

  // Map valores: "code::period" → value
  const valueMap = useMemo(() => {
    const m: Record<string, number> = {};
    values?.forEach((v) => {
      const key = `${v.code}::${v.period_date ?? 'static'}`;
      m[key] = v.numeric_value ?? 0;
    });
    return m;
  }, [values]);

  const getCellValue = useCallback(
    (code: string, period: string): number => {
      const pendKey = `${code}::${period}`;
      if (pendKey in pendingChanges) return pendingChanges[pendKey];
      return valueMap[pendKey] ?? valueMap[`${code}::static`] ?? 0;
    },
    [pendingChanges, valueMap],
  );

  const handleCellChange = (code: string, period: string, raw: string) => {
    const num = parseFloat(raw.replace(',', '.'));
    if (!isNaN(num)) {
      setPendingChanges((prev) => ({ ...prev, [`${code}::${period}`]: num }));
    }
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  // Bulk upsert
  const handleSave = async () => {
    if (!definitions || !values) return;
    setSaving(true);
    try {
      const updates: Partial<AssumptionValue>[] = Object.entries(pendingChanges).map(([key, num]) => {
        const [code, period] = key.split('::');
        const def = definitions.find((d) => d.code === code);
        return {
          assumption_definition_id: def?.id ?? '',
          code,
          period_date: period === 'static' ? undefined : period,
          numeric_value: num,
          source_type: 'manual' as const,
        };
      });
      await assumptionsApi.bulkUpsert(versionId, updates);
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      setToast('Premissas salvas!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(`Erro: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Recalcular
  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(versionId),
    onSuccess: (data) => {
      setToast(`Calculado: ${data.periods_calculated} períodos`);
      setTimeout(() => setToast(''), 3000);
      router.push(`/results/${versionId}`);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  if (loadingVersion || loadingValues) return <LoadingScreen />;
  if (!version) return <div className="p-8 text-red-500">Versão não encontrada</div>;

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <>
      <Topbar title={`Orçamento — ${version.name}`} />
      <div className="flex-1 flex flex-col p-6">
        {/* Header da versão */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={version.status} />
            <span className="text-sm text-gray-500">
              {version.horizon_start} → {version.horizon_end}
            </span>
            {hasChanges && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {Object.keys(pendingChanges).length} alteração(ões) não salvas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button size="sm" onClick={() => recalcMutation.mutate()} loading={recalcMutation.isPending}>
              <PlayCircle className="h-4 w-4" /> Recalcular
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
            {toast}
          </div>
        )}

        {/* Tabela de premissas */}
        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[240px]">
                  Premissa
                </th>
                {periods.map((p) => (
                  <th key={p} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 min-w-[90px] whitespace-nowrap">
                    {formatPeriod(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories
                ?.sort((a, b) => a.display_order - b.display_order)
                .map((cat) => {
                  const catDefs = definitions
                    ?.filter((d) => d.category_id === cat.id)
                    .sort((a, b) => a.display_order - b.display_order) ?? [];

                  if (catDefs.length === 0) return null;
                  const collapsed = collapsedCategories.has(cat.id);

                  return [
                    // Linha de categoria
                    <tr
                      key={`cat-${cat.id}`}
                      className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <td className="px-4 py-2 sticky left-0 bg-inherit" colSpan={periods.length + 1}>
                        <div className="flex items-center gap-2">
                          {collapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{cat.name}</span>
                        </div>
                      </td>
                    </tr>,
                    // Linhas das definições
                    ...(collapsed ? [] : catDefs.map((def) => (
                      <tr key={def.id} className="border-b border-gray-50 hover:bg-blue-50/30 group">
                        <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">{def.name}</span>
                            {def.unit_of_measure && (
                              <span className="text-xs text-gray-400">({def.unit_of_measure})</span>
                            )}
                          </div>
                        </td>
                        {periods.map((period) => {
                          const val = getCellValue(def.code, period);
                          const changed = `${def.code}::${period}` in pendingChanges;
                          return (
                            <td key={period} className="px-1 py-1 text-center">
                              <input
                                type="number"
                                step="any"
                                defaultValue={val}
                                key={`${def.code}::${period}::${val}`}
                                onChange={(e) => handleCellChange(def.code, period, e.target.value)}
                                className={`
                                  w-full text-right text-xs px-2 py-1 rounded border
                                  focus:outline-none focus:ring-1 focus:ring-brand-400
                                  ${changed
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : 'bg-transparent border-transparent hover:border-gray-300 text-gray-600'
                                  }
                                `}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))),
                  ];
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
