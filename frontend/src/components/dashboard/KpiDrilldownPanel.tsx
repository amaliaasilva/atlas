'use client';

import { formatCurrency, formatPercent } from '@/lib/utils';
import type { TimeSeries } from '@/types/api';
import { getRevenue } from '@/types/api';

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const m = Number(month);
  if (!year || !m || m < 1 || m > 12) return period;
  return `${MONTH_ABBR[m - 1]}/${year.slice(2)}`;
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type KpiKey =
  | 'revenue'
  | 'net_result'
  | 'ebitda'
  | 'margin'
  | 'ebitda_margin'
  | 'occupancy_rate'
  | 'capacity_hours'
  | 'active_hours'
  | 'break_even_occupancy'
  | 'contribution_margin'
  | 'avg_price_sold'
  | 'avg_price_occupied'
  | 'avg_price_available'
  | 'total_fixed_costs'
  | 'total_variable_costs'
  | 'taxes_on_revenue'
  | 'financing_payment';

export interface KpiDrilldownConfig {
  key: KpiKey;
  label: string;
  isPercent?: boolean;
  isCurrency?: boolean;
  description?: string;
}

// ── Extrai valor de um TimeSeries para qualquer KPI ──────────────────────────

function extractValue(ts: TimeSeries, key: KpiKey, totalRevenue?: number): number {
  switch (key) {
    case 'revenue': return getRevenue(ts);
    case 'net_result': return ts.net_result;
    case 'ebitda': return ts.ebitda;
    case 'margin': return totalRevenue && totalRevenue > 0 ? ts.net_result / totalRevenue : (ts.net_result / (getRevenue(ts) || 1));
    case 'ebitda_margin': return getRevenue(ts) > 0 ? ts.ebitda / getRevenue(ts) : 0;
    case 'occupancy_rate': return ts.occupancy_rate ?? 0;
    case 'capacity_hours': return ts.capacity_hours_month ?? 0;
    case 'active_hours': return ts.active_hours_month ?? 0;
    case 'break_even_occupancy': return ts.break_even_occupancy_pct ?? 0;
    case 'contribution_margin': return ts.contribution_margin_pct ?? 0;
    case 'avg_price_sold': return ts.avg_price_per_hour_sold ?? 0;
    case 'avg_price_occupied': return ts.avg_price_per_hour_occupied ?? 0;
    case 'avg_price_available': return ts.avg_price_per_hour_available ?? 0;
    case 'total_fixed_costs': return ts.total_fixed_costs ?? 0;
    case 'total_variable_costs': return ts.total_variable_costs ?? 0;
    case 'taxes_on_revenue': return ts.taxes_on_revenue ?? 0;
    case 'financing_payment': return ts.financing_payment ?? 0;
    default: return 0;
  }
}

function formatValue(value: number, cfg: KpiDrilldownConfig): string {
  if (cfg.isPercent) return formatPercent(value);
  if (cfg.isCurrency) return formatCurrency(value);
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// ── Painel ───────────────────────────────────────────────────────────────────

interface Props {
  config: KpiDrilldownConfig;
  /** Série mensal já filtrada pelo período ativo */
  series: TimeSeries[];
  /** Período destacado (ao vir de um clique num gráfico) */
  highlightPeriod?: string;
  onClose: () => void;
}

export function KpiDrilldownPanel({ config, series, highlightPeriod, onClose }: Props) {
  const totalRevForMargin = series.reduce((a, d) => a + getRevenue(d), 0);
  const values = series.map((ts) => ({
    period: ts.period,
    value: extractValue(ts, config.key, totalRevForMargin),
  }));

  const total = values.reduce((a, v) => a + v.value, 0);
  const avg = values.length > 0 ? total / values.length : 0;
  const max = Math.max(...values.map((v) => v.value));
  const min = Math.min(...values.map((v) => v.value));
  const maxPeriod = values.find((v) => v.value === max)?.period;
  const minPeriod = values.find((v) => v.value === min)?.period;
  const isPercent = config.isPercent ?? false;
  const absMax = Math.max(Math.abs(max), Math.abs(min), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Drill-down · {values.length} meses
            </p>
            <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{config.label}</h3>
            {config.description && (
              <p className="text-[10px] text-slate-400 mt-0.5">{config.description}</p>
            )}
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

        {/* Sumário */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                {isPercent ? 'Média' : 'Total'}
              </p>
              <p className="text-sm font-bold text-slate-800">
                {formatValue(isPercent ? avg : total, config)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Máximo</p>
              <p className="text-sm font-bold text-emerald-700">{formatValue(max, config)}</p>
              {maxPeriod && (
                <p className="text-[10px] text-slate-400 mt-0.5">{formatPeriod(maxPeriod)}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Mínimo</p>
              <p className="text-sm font-bold text-rose-600">{formatValue(min, config)}</p>
              {minPeriod && (
                <p className="text-[10px] text-slate-400 mt-0.5">{formatPeriod(minPeriod)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabela mensal com mini-barra */}
        <div className="overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                  Mês
                </th>
                <th className="px-5 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                  Valor
                </th>
                <th className="px-5 py-2 w-24 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {values.map(({ period, value }) => {
                const isHighlighted = period === highlightPeriod;
                const pct = absMax > 0 ? Math.abs(value) / absMax : 0;
                const isNeg = value < 0;
                const barColor = isNeg ? 'bg-rose-400' : 'bg-indigo-400';
                return (
                  <tr
                    key={period}
                    className={`border-t border-slate-50 ${isHighlighted ? 'bg-indigo-50' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-5 py-2 font-medium text-slate-700">
                      {formatPeriod(period)}
                      {isHighlighted && (
                        <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full font-bold">
                          ←
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-2 text-right tabular-nums font-medium ${isNeg ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatValue(value, config)}
                    </td>
                    <td className="px-5 py-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${Math.min(pct * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
