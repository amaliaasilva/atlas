'use client';

import type { PortfolioResponse, Unit } from '@/types/api';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data: PortfolioResponse;
  units?: Unit[];
}

function paybackLabel(months: number | null): string {
  if (months === null) return '—';
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}a ${m}m` : `${y} anos`;
}

function roiColor(roi: number | null): string {
  if (roi === null) return 'text-slate-400';
  if (roi >= 0.2) return 'text-emerald-600';
  if (roi >= 0) return 'text-amber-600';
  return 'text-rose-500';
}

/**
 * PortfolioTable — comparativo de unidades: CAPEX, resultado, payback e ROI.
 */
export function PortfolioTable({ data, units = [] }: Props) {
  function openingLabel(unit_id: string): string {
    const u = units.find((x) => x.id === unit_id);
    if (!u?.opening_date) return '—';
    const formatted = new Date(u.opening_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return formatted;
  }

  function operatingLabel(unit_id: string): string {
    const u = units.find((x) => x.id === unit_id);
    if (!u) return '—';
    if (u.opening_phase === 'future') return 'Em breve';
    if (u.opening_phase === 'operating' && u.months_since_opening != null) {
      const m = u.months_since_opening;
      return m < 12 ? `${m}m` : `${Math.floor(m / 12)}a ${m % 12 ? `${m % 12}m` : ''}`;
    }
    return '—';
  }

  function operatingColor(unit_id: string): string {
    const u = units.find((x) => x.id === unit_id);
    if (!u?.opening_phase || u.opening_phase === 'future') return 'text-amber-600';
    if (u.opening_phase === 'operating') return 'text-emerald-600';
    return 'text-slate-400';
  }
  return (
    <div className="flex flex-col gap-3">
      {/* Totalizador */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-slate-500">CAPEX total: <strong className="text-slate-800">{formatCurrency(data.total_capex)}</strong></span>
        <span className="text-slate-500">Resultado total: <strong className={data.total_net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatCurrency(data.total_net_result)}</strong></span>
        {data.roi_pct !== null && (
          <span className="text-slate-500">ROI carteira: <strong className={roiColor(data.roi_pct)}>{(data.roi_pct * 100).toFixed(1)}%</strong></span>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-semibold">Unidade</th>
              <th className="px-4 py-3 text-right font-semibold">Abertura</th>
              <th className="px-4 py-3 text-right font-semibold">Em op.</th>
              <th className="px-4 py-3 text-right font-semibold">CAPEX</th>
              <th className="px-4 py-3 text-right font-semibold">Resultado</th>
              <th className="px-4 py-3 text-right font-semibold">Payback</th>
              <th className="px-4 py-3 text-right font-semibold">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.units.map((u, i) => (
              <tr key={u.unit_id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100 transition-colors`}>
                <td className="px-4 py-3 font-medium text-slate-700">{u.unit_name}</td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{openingLabel(u.unit_id)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${operatingColor(u.unit_id)}`}>{operatingLabel(u.unit_id)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatCurrency(u.capex)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${u.net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatCurrency(u.net_result)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{paybackLabel(u.payback_months)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${roiColor(u.roi_pct)}`}>
                  {u.roi_pct !== null ? `${(u.roi_pct * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 text-xs font-bold">
              <td className="px-4 py-3 text-slate-600 uppercase tracking-wide">Total</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrency(data.total_capex)}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${data.total_net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatCurrency(data.total_net_result)}
              </td>
              <td className="px-4 py-3" />
              <td className={`px-4 py-3 text-right ${roiColor(data.roi_pct)}`}>
                {data.roi_pct !== null ? `${(data.roi_pct * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
