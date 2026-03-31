'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Props {
  /** Série temporal mensal — cada item deve ter `period` e `net_result` */
  timeSeries: Array<{ period: string; net_result: number }>;
  /** CAPEX total a ser descontado no ponto de partida */
  totalCapex: number;
  title?: string;
}

function formatPeriodShort(period: string) {
  const [year, month] = period.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

/**
 * PaybackCurveChart — linha acumulada de resultado líquido iniciando no negativo (−CAPEX).
 * A curva cruza zero no mês de payback, visualizando o horizonte de retorno.
 */
export function PaybackCurveChart({ timeSeries, totalCapex, title = 'Curva de Payback' }: Props) {
  // Acumula resultado mês a mês, começando de −totalCapex
  const chartData: { period: string; label: string; cumulative: number }[] = [];
  let accumulated = -Math.abs(totalCapex);

  for (const d of timeSeries) {
    accumulated += d.net_result;
    chartData.push({
      period: d.period,
      label: formatPeriodShort(d.period),
      cumulative: Math.round(accumulated),
    });
  }

  // Encontra o mês de payback (primeiro com cumulative ≥ 0)
  const paybackEntry = chartData.find((d) => d.cumulative >= 0);
  const maxAbsVal = Math.max(Math.abs(totalCapex), ...chartData.map((d) => Math.abs(d.cumulative)));

  const isPositive = (v: number) => v >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-1">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {paybackEntry
            ? `Payback atingido em ${paybackEntry.label} · Acumulado final: ${formatCurrency(chartData[chartData.length - 1]?.cumulative ?? 0)}`
            : 'Payback não atingido no horizonte projetado'}
        </p>
      </div>

      {/* Badge de status */}
      <div className="mb-4">
        {paybackEntry ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ✓ Payback em {paybackEntry.label}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
            ⚠ Payback fora do horizonte projetado
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="paybackGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="paybackGradientNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.02} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(chartData.length / 8)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => formatCurrency(v)}
            domain={[-maxAbsVal * 1.05, maxAbsVal * 1.05]}
          />
          <Tooltip
            formatter={(v: number) => [formatCurrency(v), 'Resultado acumulado']}
            labelFormatter={(l) => `Período: ${l}`}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5}>
            <Label value="Breakeven" position="insideTopRight" fill="#64748b" fontSize={10} />
          </ReferenceLine>
          {paybackEntry && (
            <ReferenceLine
              x={paybackEntry.label}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            >
              <Label value={`Payback: ${paybackEntry.label}`} position="insideTopLeft" fill="#059669" fontSize={10} />
            </ReferenceLine>
          )}
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#paybackGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
