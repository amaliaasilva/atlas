'use client';

import { useMemo, useRef } from 'react';
import type { DREResponse, DRECategory } from '@/types/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const CATEGORY_COLOR: Record<DRECategory, string> = {
  revenue: 'text-emerald-700 bg-emerald-50',
  variable_cost: 'text-rose-600',
  fixed_cost: 'text-rose-600',
  tax: 'text-orange-600',
  financing: 'text-orange-600',
  operational: 'text-slate-600',
  result: 'text-indigo-700 bg-indigo-50 font-semibold',
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

interface Props {
  data: DREResponse;
  /** Callback opcional para exportar CSV via backend */
  onExportCsv?: () => void;
  isExporting?: boolean;
}

/**
 * DRETable — tabela DRE com primeira coluna congelada, scroll horizontal,
 * cores por categoria e botão de exportação CSV.
 */
export function DRETable({ data, onExportCsv, isExporting }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  const periods = useMemo(() => data.dre.map((p) => p.period), [data]);

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

  return (
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

      {/* Tabela com scroll horizontal e primeira coluna congelada */}
      <div ref={tableRef} className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-500 uppercase tracking-wide">
              {/* Coluna congelada */}
              <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left whitespace-nowrap min-w-[200px] font-semibold">
                Item
              </th>
              {periods.map((p) => (
                <th key={p} className="px-3 py-3 text-right whitespace-nowrap font-semibold">
                  {p}
                </th>
              ))}
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
                  </tr>
                )}
                {sectionRows.map((row) => (
                  <tr
                    key={row.code}
                    className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${
                      category === 'result' ? 'border-t-2 border-slate-300' : ''
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap ${CATEGORY_COLOR[category]}`}
                    >
                      {row.name}
                    </td>
                    {periods.map((p) => {
                      const val = row.values[p] ?? 0;
                      const pct = row.pcts[p] ?? 0;
                      return (
                        <td key={p} className={`px-3 py-2.5 text-right tabular-nums ${CATEGORY_COLOR[category]}`}>
                          <span title={`${(pct * 100).toFixed(1)}% da receita`}>
                            {formatCurrency(val)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
