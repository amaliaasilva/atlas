'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DREResponse, DRECategory, PeriodTraceResponse } from '@/types/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { dashboardApi } from '@/lib/api';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** FIX B2: formata "2026-01" → "Jan/26" (cabeçalho compacto) */
function formatPeriodHeader(period: string): string {
  const [year, month] = period.split('-');
  const m = Number(month);
  if (!year || !m || m < 1 || m > 12) return period;
  return `${MONTH_ABBR[m - 1]}/${year.slice(2)}`;
}

function fmtPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

const CATEGORY_COLOR: Record<DRECategory, string> = {
  revenue: 'text-emerald-700 bg-emerald-50',
  variable_cost: 'text-rose-600',
  fixed_cost: 'text-rose-600',
  tax: 'text-orange-600',
  financing: 'text-orange-600',
  operational: 'text-slate-600',
  result: 'font-semibold',
};

const CATEGORY_HEADER: Record<DRECategory, string | null> = {
  revenue: 'RECEITAS',
  fixed_cost: 'CUSTOS FIXOS',
  variable_cost: 'CUSTOS VARIÁVEIS',
  tax: 'IMPOSTOS',
  financing: 'FINANCIAMENTO',
  operational: null,
  result: null,
};

/**
 * Linhas que suportam drill-down ao clicar numa célula de período.
 * Só funciona em modo mensal (period no formato "YYYY-MM").
 */
const DRILLDOWN_CODES = new Set(['utility_costs', 'staff_costs']);

// ── Painel de Drill-down ─────────────────────────────────────────────────────

interface DrilldownPanelProps {
  versionId: string;
  period: string;    // "YYYY-MM"
  rowCode: string;
  rowName: string;
  onClose: () => void;
}

function DrilldownPanel({ versionId, period, rowCode, rowName, onClose }: DrilldownPanelProps) {
  const { data, isLoading } = useQuery<PeriodTraceResponse>({
    queryKey: ['period-trace', versionId, period],
    queryFn: () => dashboardApi.periodTrace(versionId, period),
    staleTime: 5 * 60 * 1000,
  });

  const periodLabel = formatPeriodHeader(period);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{periodLabel}</p>
            <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{rowName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              Carregando cálculo...
            </div>
          )}

          {data && !data.has_trace && (
            <p className="text-sm text-slate-400 py-4 text-center">
              Nenhum cálculo encontrado para este período.<br />
              <span className="text-xs">Recalcule a versão e tente novamente.</span>
            </p>
          )}

          {data?.has_trace && rowCode === 'utility_costs' && data.utilities && (
            <div className="space-y-3">
              {/* Ocupação */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Taxa de ocupação: <strong className="text-blue-700">{fmtPct(data.utilities.occupancy_rate_used)}</strong>
              </div>

              {/* Energia */}
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="text-sm font-medium text-slate-700">Energia Elétrica</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(data.utilities.electricity)}</span>
                </div>
                <div className="px-4 py-2 space-y-1 bg-white">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Parcela fixa</span>
                    <span>{formatCurrency(data.utilities.electricity_fixed)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Variável ({fmtPct(data.utilities.occupancy_rate_used)} occ.)</span>
                    <span>{formatCurrency(data.utilities.electricity_variable)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
                    = fixo + variável_máx × occ
                  </div>
                </div>
              </div>

              {/* Água */}
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💧</span>
                    <span className="text-sm font-medium text-slate-700">Água e Esgoto</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(data.utilities.water)}</span>
                </div>
                <div className="px-4 py-2 space-y-1 bg-white">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Parcela fixa</span>
                    <span>{formatCurrency(data.utilities.water_fixed)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Variável ({fmtPct(data.utilities.occupancy_rate_used)} occ.)</span>
                    <span>{formatCurrency(data.utilities.water_variable)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
                    = fixo + variável_máx × occ
                  </div>
                </div>
              </div>

              {/* Internet */}
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📡</span>
                    <span className="text-sm font-medium text-slate-700">Internet + Telefonia</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(data.utilities.internet_phone)}</span>
                </div>
                <div className="px-4 py-2 bg-white">
                  <span className="text-xs text-slate-400">Custo fixo mensal</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 px-1">
                <span className="text-sm font-semibold text-slate-700">Total Utilidades</span>
                <span className="text-sm font-bold text-rose-700">{formatCurrency(data.utilities.total)}</span>
              </div>
            </div>
          )}

          {data?.has_trace && rowCode === 'staff_costs' && data.staff && (
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-slate-600">Pro-labore</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(data.staff.pro_labore)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-slate-600">Folha CLT (base)</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(data.staff.clt_base)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-slate-600">Encargos sociais</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(data.staff.social_charges)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-slate-600">Benefícios</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(data.staff.benefits)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 px-1">
                <span className="text-sm font-semibold text-slate-700">Total Pessoal</span>
                <span className="text-sm font-bold text-rose-700">{formatCurrency(data.staff.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DRETable ─────────────────────────────────────────────────────────────────

interface Props {
  data: DREResponse;
  /** Se passado e a granularidade for mensal, habilita o drill-down por célula */
  versionId?: string;
  /** Callback opcional para exportar CSV via backend */
  onExportCsv?: () => void;
  isExporting?: boolean;
}

/**
 * DRETable — tabela DRE com primeira coluna congelada, scroll horizontal,
 * cores por categoria, botão de exportação CSV e drill-down de células.
 */
export function DRETable({ data, versionId, onExportCsv, isExporting }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [drilldown, setDrilldown] = useState<{ code: string; period: string; name: string } | null>(null);

  const periods = useMemo(() => data.dre.map((p) => p.period), [data]);

  // Detecta se os períodos são mensais (contêm '-')
  const isMonthly = periods.length > 0 && periods[0].includes('-');

  // Constrói mapa: code → { name, category, display_order, values por período }
  const rows = useMemo(() => {
    const map = new Map<string, {
      code: string;
      name: string;
      category: DRECategory;
      display_order: number;
      values: Record<string, number>;
      pcts: Record<string, number>;
    }>();

    for (const period of data.dre) {
      for (const item of period.items) {
        if (!map.has(item.code)) {
          map.set(item.code, {
            code: item.code,
            name: item.name,
            category: item.category,
            display_order: item.display_order,
            values: {},
            pcts: {},
          });
        }
        const row = map.get(item.code)!;
        row.values[period.period] = item.value;
        row.pcts[period.period] = item.pct_of_revenue;
      }
    }

    return [...map.values()].sort((a, b) => a.display_order - b.display_order);
  }, [data]);

  // FIX B4: pré-calcula totais por linha (soma de todos os períodos)
  const rowTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      totals.set(row.code, Object.values(row.values).reduce((a, v) => a + v, 0));
    }
    return totals;
  }, [rows]);

  // Agrupa por categoria para emitir cabeçalhos de seção
  const grouped = useMemo(() => {
    const sections: Array<{ category: DRECategory; header: string | null; rows: typeof rows }> = [];
    let lastCat: DRECategory | null = null;

    for (const row of rows) {
      if (row.category !== lastCat) {
        sections.push({ category: row.category, header: CATEGORY_HEADER[row.category], rows: [] });
        lastCat = row.category;
      }
      sections[sections.length - 1].rows.push(row);
    }
    return sections;
  }, [rows]);

  const canDrilldown = isMonthly && !!versionId;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Cabeçalho com export */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">DRE Detalhado</h2>
          {onExportCsv && (
            <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={isExporting}>
              {isExporting ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          )}
        </div>

        {canDrilldown && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Clique em <strong className="text-slate-500">Utilidades</strong> ou <strong className="text-slate-500">Pessoal</strong> para ver o cálculo detalhado do mês.
          </p>
        )}

        {/* Tabela com scroll horizontal e primeira coluna congelada */}
        <div ref={tableRef} className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-500 uppercase tracking-wide">
                {/* Coluna congelada */}
                <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left whitespace-nowrap min-w-[200px] font-semibold">
                  Item
                </th>
                {/* FIX B2: cabeçalhos formatados "Jan/26" em vez de "2026-01" */}
                {periods.map((p) => (
                  <th key={p} className="px-3 py-3 text-right whitespace-nowrap font-semibold min-w-[80px]">
                    {formatPeriodHeader(p)}
                  </th>
                ))}
                {/* FIX B4: coluna Total fixada à direita */}
                <th className="sticky right-0 z-10 bg-slate-200 px-4 py-3 text-right whitespace-nowrap font-bold min-w-[100px] border-l border-slate-300">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ category, header, rows: sectionRows }) => (
                <>
                  {header && (
                    <tr key={`hdr-${category}`} className="bg-slate-50">
                      <td
                        className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-left text-[10px] font-bold tracking-widest text-slate-500 uppercase"
                        colSpan={1}
                      >
                        {header}
                      </td>
                      {periods.map((p) => (
                        <td key={p} className="px-3 py-2 bg-slate-50" />
                      ))}
                      {/* FIX B4: célula vazia na coluna Total para os headers de seção */}
                      <td className="sticky right-0 z-10 bg-slate-100 px-4 py-2 border-l border-slate-300" />
                    </tr>
                  )}
                  {sectionRows.map((row) => {
                    const total = rowTotals.get(row.code) ?? 0;
                    const isDrilldownRow = canDrilldown && DRILLDOWN_CODES.has(row.code);
                    // FIX B1: cor da linha "result" baseada no valor total (positivo = verde, negativo = vermelho)
                    const rowColor =
                      category === 'result'
                        ? total < 0
                          ? 'text-rose-700 bg-rose-50 font-semibold'
                          : 'text-emerald-700 bg-emerald-50 font-semibold'
                        : CATEGORY_COLOR[category];

                    return (
                      <tr
                        key={row.code}
                        className={`border-t border-slate-100 hover:bg-slate-50/80 transition-colors ${
                          category === 'result' ? 'border-t-2 border-slate-300' : ''
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap ${rowColor}`}
                        >
                          <span className="flex items-center gap-1.5">
                            {row.name}
                            {isDrilldownRow && (
                              <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </span>
                        </td>
                        {periods.map((p) => {
                          const val = row.values[p] ?? 0;
                          const pct = row.pcts[p] ?? 0;
                          // FIX B1: cor por valor para linhas de resultado
                          const cellColor =
                            category === 'result'
                              ? val < 0
                                ? 'text-rose-700 bg-rose-50/60 font-semibold'
                                : 'text-emerald-700 bg-emerald-50/60 font-semibold'
                              : CATEGORY_COLOR[category];
                          const isActive =
                            drilldown?.code === row.code && drilldown?.period === p;
                          return (
                            <td
                              key={p}
                              className={`px-3 py-2.5 text-right ${cellColor} ${
                                isDrilldownRow
                                  ? 'cursor-pointer hover:bg-blue-50/60 hover:ring-1 ring-inset ring-blue-200 transition-all'
                                  : ''
                              } ${isActive ? 'bg-blue-100/70 ring-1 ring-inset ring-blue-400' : ''}`}
                              onClick={
                                isDrilldownRow
                                  ? () =>
                                      setDrilldown(
                                        isActive
                                          ? null
                                          : { code: row.code, period: p, name: row.name },
                                      )
                                  : undefined
                              }
                            >
                              {/* FIX B3: pct_of_revenue exibido inline como texto subdued */}
                              <div className="financial-value">{formatCurrency(val)}</div>
                              {pct !== 0 && (
                                <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                                  {(pct * 100).toFixed(1)}%
                                </div>
                              )}
                            </td>
                          );
                        })}
                        {/* FIX B4: coluna Total */}
                        <td
                          className={`sticky right-0 z-10 px-4 py-2.5 text-right border-l border-slate-200 ${
                            category === 'result'
                              ? total < 0
                                ? 'bg-rose-50 text-rose-700 font-bold'
                                : 'bg-emerald-50 text-emerald-700 font-bold'
                              : 'bg-slate-50 text-slate-700 font-semibold'
                          }`}
                        >
                          <div className="financial-value">{formatCurrency(total)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down panel */}
      {drilldown && versionId && (
        <DrilldownPanel
          versionId={versionId}
          period={drilldown.period}
          rowCode={drilldown.code}
          rowName={drilldown.name}
          onClose={() => setDrilldown(null)}
        />
      )}
    </>
  );
}

