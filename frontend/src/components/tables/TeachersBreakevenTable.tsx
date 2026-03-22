'use client';

import { useMemo } from 'react';
import type { TimeSeries } from '@/types/api';

interface Props {
  timeSeries: TimeSeries[];
}

const SCENARIOS = [
  { key: 'teachers_needed_pessimistic', label: 'Pessimista (1 prof/aula)' },
  { key: 'teachers_needed_medium', label: 'Médio (1,5 prof/aula)' },
  { key: 'teachers_needed_optimistic', label: 'Otimista (2 prof/aula)' },
] as const;

/**
 * TeachersBreakevenTable — cenários de professores necessários por ano.
 * Lê teachers_needed_* de timeSeries (máx por ano = cenário crítico).
 */
export function TeachersBreakevenTable({ timeSeries }: Props) {
  const years = useMemo(() => {
    const ySet = new Set(timeSeries.map((t) => t.period.slice(0, 4)));
    return [...ySet].sort();
  }, [timeSeries]);

  // Para cada ano, pega o valor máximo do cenário (mês de maior demanda)
  const data = useMemo(() => {
    return SCENARIOS.map(({ key, label }) => {
      const values: Record<string, number> = {};
      for (const year of years) {
        const months = timeSeries.filter((t) => t.period.startsWith(year));
        values[year] = Math.max(0, ...months.map((m) => (m[key] as number | undefined) ?? 0));
      }
      return { label, values };
    });
  }, [timeSeries, years]);

  if (!timeSeries.length) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-500 uppercase text-xs tracking-wide">
            <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left whitespace-nowrap font-semibold min-w-[220px]">
              Cenário
            </th>
            {years.map((y) => (
              <th key={y} className="px-4 py-3 text-center font-semibold">{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
              <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                {row.label}
              </td>
              {years.map((y) => {
                const v = row.values[y] ?? 0;
                return (
                  <td key={y} className="px-4 py-3 text-center tabular-nums">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                      v <= 1 ? 'bg-emerald-100 text-emerald-700' :
                      v <= 3 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {v}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
