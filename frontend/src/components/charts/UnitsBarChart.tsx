'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatPercent } from '@/lib/utils';

// ── Gráfico de barras para comparação entre unidades ─────────────────────────

interface UnitsBarData {
  name: string;
  value: number;
  isNegative?: boolean;
}

interface UnitsBarChartProps {
  data: UnitsBarData[];
  title?: string;
  valueFormatter?: (v: number) => string;
  referenceValue?: number;
  referenceLabel?: string;
}

export function UnitsBarChart({
  data,
  title = 'Comparação por Unidade',
  valueFormatter = formatCurrency,
  referenceValue,
  referenceLabel,
}: UnitsBarChartProps) {
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 48)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => valueFormatter(v)}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            formatter={(value: number) => [valueFormatter(value), 'Valor']}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          {referenceValue !== undefined && (
            <ReferenceLine
              x={referenceValue}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              label={{ value: referenceLabel ?? 'Ref', position: 'top', fontSize: 10, fill: '#f59e0b' }}
            />
          )}
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.value < 0 ? '#ef4444' : colors[idx % colors.length]}
                opacity={0.9}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => valueFormatter(v)}
              style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Gráfico de cenários (barras agrupadas) ────────────────────────────────────

interface ScenarioDataPoint {
  metric: string;
  pessimista?: number;
  moderado?: number;
  otimista?: number;
}

interface ScenarioBarChartProps {
  data: ScenarioDataPoint[];
  title?: string;
  valueFormatter?: (v: number) => string;
}

export function ScenarioBarChart({
  data,
  title = 'Comparação de Cenários',
  valueFormatter = formatCurrency,
}: ScenarioBarChartProps) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => valueFormatter(v)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [valueFormatter(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Bar dataKey="pessimista" name="Pessimista" fill="#ef4444" opacity={0.85} radius={[4, 4, 0, 0]} />
          <Bar dataKey="moderado" name="Moderado" fill="#f59e0b" opacity={0.85} radius={[4, 4, 0, 0]} />
          <Bar dataKey="otimista" name="Otimista" fill="#10b981" opacity={0.85} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Bullet Chart (real vs meta vs breakeven) ──────────────────────────────────

interface BulletChartItemProps {
  label: string;
  current: number;
  target?: number;
  breakeven?: number;
  max: number;
  formatter?: (v: number) => string;
}

export function BulletChartItem({
  label,
  current,
  target,
  breakeven,
  max,
  formatter = (v) => String(v),
}: BulletChartItemProps) {
  const pctCurrent = max > 0 ? (current / max) * 100 : 0;
  const pctTarget = max > 0 && target ? (target / max) * 100 : undefined;
  const pctBreakeven = max > 0 && breakeven ? (breakeven / max) * 100 : undefined;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatter(current)}</span>
      </div>
      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
        {/* Fundo: capacidade total */}
        <div className="absolute inset-0 bg-gray-100 rounded-lg" />
        {/* Zona de breakeven */}
        {pctBreakeven !== undefined && (
          <div
            className="absolute inset-y-0 left-0 bg-amber-100 rounded-l-lg"
            style={{ width: `${Math.min(pctBreakeven, 100)}%` }}
          />
        )}
        {/* Zona de target */}
        {pctTarget !== undefined && (
          <div
            className="absolute inset-y-0 left-0 bg-indigo-100"
            style={{ width: `${Math.min(pctTarget, 100)}%` }}
          />
        )}
        {/* Valor atual */}
        <div
          className="absolute inset-y-1 left-1 bg-indigo-500 rounded-md transition-all duration-1000 ease-out"
          style={{ width: `calc(${Math.min(pctCurrent, 100)}% - 8px)` }}
        />
        {/* Marcador de breakeven */}
        {pctBreakeven !== undefined && (
          <div
            className="absolute inset-y-0 top-0 bottom-0 w-0.5 bg-amber-500"
            style={{ left: `${Math.min(pctBreakeven, 100)}%` }}
          />
        )}
        {/* Marcador de target */}
        {pctTarget !== undefined && (
          <div
            className="absolute inset-y-0 w-0.5 bg-indigo-600"
            style={{ left: `${Math.min(pctTarget, 100)}%` }}
          />
        )}
        {/* Labels internos */}
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-xs font-bold text-white drop-shadow-sm">
            {pctCurrent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
          Real: {formatter(current)}
        </span>
        {breakeven && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            Breakeven: {formatter(breakeven)}
          </span>
        )}
        {target && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block" />
            Meta: {formatter(target)}
          </span>
        )}
        <span className="ml-auto">Máx: {formatter(max)}</span>
      </div>
    </div>
  );
}
