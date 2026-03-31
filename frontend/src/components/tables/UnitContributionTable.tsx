'use client';

import { formatCurrency, formatPercent } from '@/lib/utils';

interface UnitContribution {
  unit_id: string;
  unit_name: string;
  capex: number;
  net_result: number;
  roi_pct: number | null;
  payback_months: number | null;
}

interface Props {
  units: UnitContribution[];
  totalCapex: number;
  title?: string;
}

const UNIT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

/**
 * UnitContributionTable — tabela visual com barras horizontais mostrando
 * a contribuição percentual de cada unidade para CAPEX e resultado acumulado.
 */
export function UnitContributionTable({ units, totalCapex, title = 'Contribuição por Unidade' }: Props) {
  if (units.length === 0) return null;

  const totalNet = units.reduce((a, u) => a + u.net_result, 0);
  const sortedUnits = [...units].sort((a, b) => b.capex - a.capex);
  const maxCapex = Math.max(...sortedUnits.map((u) => u.capex), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">Participação de cada unidade no resultado consolidado</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 text-left font-semibold w-48">Unidade</th>
              <th className="px-5 py-3 text-left font-semibold">CAPEX (participação)</th>
              <th className="px-5 py-3 text-right font-semibold">CAPEX</th>
              <th className="px-5 py-3 text-right font-semibold">Resultado Acum.</th>
              <th className="px-5 py-3 text-right font-semibold">ROI</th>
              <th className="px-5 py-3 text-right font-semibold">Payback</th>
            </tr>
          </thead>
          <tbody>
            {sortedUnits.map((u, idx) => {
              const color = UNIT_COLORS[idx % UNIT_COLORS.length];
              const capexPct = totalCapex > 0 ? u.capex / totalCapex : 0;
              const barWidth = maxCapex > 0 ? (u.capex / maxCapex) * 100 : 0;

              return (
                <tr key={u.unit_id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  {/* Nome */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">{u.unit_name}</span>
                    </div>
                  </td>

                  {/* Barra de participação no CAPEX */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[80px]">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right tabular-nums">
                        {formatPercent(capexPct)}
                      </span>
                    </div>
                  </td>

                  {/* CAPEX */}
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-700 font-medium">
                    {formatCurrency(u.capex)}
                  </td>

                  {/* Resultado */}
                  <td className={`px-5 py-3.5 text-right tabular-nums font-semibold ${u.net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {formatCurrency(u.net_result)}
                  </td>

                  {/* ROI */}
                  <td className={`px-5 py-3.5 text-right tabular-nums font-semibold ${
                    u.roi_pct === null ? 'text-slate-400' : u.roi_pct >= 0.15 ? 'text-emerald-600' : u.roi_pct >= 0 ? 'text-amber-600' : 'text-rose-500'
                  }`}>
                    {u.roi_pct !== null ? formatPercent(u.roi_pct) : '—'}
                  </td>

                  {/* Payback */}
                  <td className="px-5 py-3.5 text-right text-slate-600">
                    {u.payback_months === null
                      ? '—'
                      : u.payback_months < 12
                      ? `${Math.round(u.payback_months)}m`
                      : `${(u.payback_months / 12).toFixed(1)}a`}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totais */}
          {units.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                <td className="px-5 py-3.5 text-xs uppercase tracking-wide">Total</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[80px]">
                      <div className="h-2 rounded-full bg-indigo-500 w-full" />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">100%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">{formatCurrency(totalCapex)}</td>
                <td className={`px-5 py-3.5 text-right tabular-nums ${totalNet >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatCurrency(totalNet)}
                </td>
                <td className="px-5 py-3.5 text-right text-slate-400">—</td>
                <td className="px-5 py-3.5 text-right text-slate-400">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
