'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { calculationsApi, versionsApi, reportsApi } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/Spinner';
import { formatCurrency, formatPeriod, formatPercent, downloadBlob, getErrorMessage } from '@/lib/utils';
import { Download, RefreshCw, BarChart2 } from 'lucide-react';
import { useNavStore } from '@/store/auth';

interface DRERow {
  code: string;
  label: string;
  indent: number;
  bold?: boolean;
  isTotal?: boolean;
  highlight?: 'positive' | 'negative' | 'neutral';
}

const DRE_STRUCTURE: DRERow[] = [
  { code: 'gross_revenue',        label: 'Receita Bruta',              indent: 0, bold: true },
  { code: 'membership_revenue',   label: '  Mensalidades',             indent: 1 },
  { code: 'personal_training',    label: '  Personal Training',        indent: 1 },
  { code: 'taxes',                label: '(-) Impostos (6% Simples)',  indent: 0 },
  { code: 'net_revenue',          label: 'Receita Líquida',            indent: 0, bold: true, isTotal: true },
  { code: 'total_fixed_costs',    label: '(-) Custos Fixos',          indent: 0, bold: true },
  { code: 'rent_total',           label: '  Aluguel + Condomínio',     indent: 1 },
  { code: 'staff_costs',          label: '  Pessoal (CLT + Pró-Lab.)', indent: 1 },
  { code: 'utility_costs',        label: '  Utilities (Energia/Água)', indent: 1 },
  { code: 'admin_costs',          label: '  Adm + Contabilidade',      indent: 1 },
  { code: 'marketing_costs',      label: '  Marketing',                indent: 1 },
  { code: 'equipment_maintenance',label: '  Manutenção Equipamentos',  indent: 1 },
  { code: 'insurance_costs',      label: '  Seguros',                  indent: 1 },
  { code: 'total_variable_costs', label: '(-) Custos Variáveis',      indent: 0, bold: true },
  { code: 'hygiene_kit_cost',     label: '  Kit Higiene/Aluno',        indent: 1 },
  { code: 'sales_commission',     label: '  Comissão de Vendas',       indent: 1 },
  { code: 'ebitda',               label: 'EBITDA',                     indent: 0, bold: true, isTotal: true },
  { code: 'financing_payment',    label: '(-) Financiamento',         indent: 0 },
  { code: 'net_result',           label: 'Resultado Líquido',          indent: 0, bold: true, isTotal: true },
  { code: 'active_students',      label: 'Alunos Ativos',              indent: 0 },
  { code: 'occupancy_rate',       label: 'Ocupação (%)',               indent: 0 },
  { code: 'net_margin',           label: 'Margem Líquida (%)',         indent: 0 },
];

const PERCENT_METRICS = new Set(['occupancy_rate', 'net_margin']);

export default function ResultsClient() {
  const { versionId } = useParams<{ versionId: string }>();
  const router = useRouter();
  const { businessId, scenarioId } = useNavStore();

  const { data: version } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionsApi.get(versionId),
  });

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['results', versionId],
    queryFn: () => calculationsApi.results(versionId),
  });

  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(versionId),
    onSuccess: () => refetch(),
  });

  const handleExport = async () => {
    const blob = await reportsApi.exportCsv(versionId);
    downloadBlob(blob, `atlas_dre_${versionId}.csv`);
  };

  if (isLoading) return <LoadingScreen />;

  // Montar map: metric_code → { period → value }
  const dataMap: Record<string, Record<string, number>> = {};
  results?.forEach((r) => {
    if (!dataMap[r.metric_code]) dataMap[r.metric_code] = {};
    dataMap[r.metric_code][r.period_date] = r.value;
  });

  const periods = [...new Set(results?.map((r) => r.period_date) ?? [])].sort();

  const formatCell = (code: string, val: number) => {
    if (val === undefined || val === null) return '—';
    if (code === 'active_students') return String(Math.round(val));
    if (PERCENT_METRICS.has(code)) return formatPercent(val);
    return formatCurrency(val);
  };

  return (
    <>
      <Topbar title={`DRE — ${version?.name ?? versionId}`} />
      <div className="flex-1 flex flex-col p-6">
        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {version && <StatusBadge status={version.status} />}
            <span className="text-sm text-gray-500">{periods.length} períodos</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push(`/budget/${versionId}`)}>
              ← Editar Premissas
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => recalcMutation.mutate()}
              loading={recalcMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Recalcular
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {businessId && scenarioId && (
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/unit/${versionId}`)}
              >
                <BarChart2 className="h-4 w-4" /> Dashboard
              </Button>
            )}
          </div>
        </div>

        {results?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p className="mb-4">Nenhum resultado calculado ainda.</p>
            <Button onClick={() => recalcMutation.mutate()} loading={recalcMutation.isPending}>
              Calcular Agora
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[240px]">
                    Métrica
                  </th>
                  {periods.map((p) => (
                    <th key={p} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap min-w-[100px]">
                      {formatPeriod(p)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-semibold text-brand-600 whitespace-nowrap min-w-[100px]">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {DRE_STRUCTURE.map((row) => {
                  const rowData = dataMap[row.code] ?? {};
                  const values = periods.map((p) => rowData[p] ?? 0);
                  const total = PERCENT_METRICS.has(row.code)
                    ? values.reduce((a, b) => a + b, 0) / (values.length || 1)
                    : values.reduce((a, b) => a + b, 0);

                  const isNegativeRow = row.code.startsWith('total_') || row.code === 'taxes' || row.code === 'financing_payment';

                  return (
                    <tr
                      key={row.code}
                      className={`
                        border-b transition-colors
                        ${row.isTotal ? 'bg-gray-50 border-gray-200' : 'border-gray-50 hover:bg-gray-50/50'}
                      `}
                    >
                      <td
                        className={`
                          px-4 py-2 sticky left-0 bg-inherit border-r border-gray-100
                          ${row.bold ? 'font-semibold text-gray-900' : 'text-gray-600'}
                        `}
                        style={{ paddingLeft: `${(row.indent + 1) * 16}px` }}
                      >
                        {row.label}
                      </td>
                      {periods.map((p) => {
                        const val = rowData[p];
                        const isNeg = val < 0;
                        return (
                          <td
                            key={p}
                            className={`
                              px-3 py-2 text-right tabular-nums
                              ${row.bold ? 'font-semibold' : ''}
                              ${isNeg || (isNegativeRow && val > 0) ? 'text-red-600' : ''}
                              ${row.code === 'net_result' && val > 0 ? 'text-emerald-600' : ''}
                              ${row.code === 'ebitda' && val > 0 ? 'text-emerald-700' : ''}
                            `}
                          >
                            {val !== undefined ? formatCell(row.code, val) : '—'}
                          </td>
                        );
                      })}
                      <td
                        className={`
                          px-3 py-2 text-right tabular-nums font-semibold bg-gray-50
                          ${total < 0 || (isNegativeRow && total > 0) ? 'text-red-600' : ''}
                          ${row.code === 'net_result' && total > 0 ? 'text-emerald-600' : ''}
                          ${row.code === 'ebitda' && total > 0 ? 'text-emerald-700' : ''}
                        `}
                      >
                        {formatCell(row.code, total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
