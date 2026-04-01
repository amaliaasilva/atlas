'use client';

import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatPeriod } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { TimeSeries } from '@/types/api';
import { getRevenue } from '@/types/api';

interface AreaGrowthChartProps {
  data: TimeSeries[];
  title?: string;
  showBreakeven?: boolean;
  breakevenValue?: number;
  onPeriodClick?: (period: string) => void;
}

export function AreaGrowthChart({
  data,
  title = 'Evolução da Receita',
  showBreakeven = false,
  breakevenValue,
  onPeriodClick,
}: AreaGrowthChartProps) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    _raw: d.period,
    receita: Math.round(getRevenue(d)),
    lucro: Math.round(d.net_result),
    ebitda: Math.round(d.ebitda),
    custoFixo: Math.round(d.total_fixed_costs ?? 0),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(payload: any) {
    if (onPeriodClick && payload?.activePayload?.[0]?.payload?._raw) {
      onPeriodClick(payload.activePayload[0].payload._raw);
    }
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <ReAreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} onClick={onPeriodClick ? handleClick : undefined} style={onPeriodClick ? { cursor: 'pointer' } : undefined}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          {showBreakeven && breakevenValue && (
            <ReferenceLine
              y={breakevenValue}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              label={{ value: 'Breakeven', position: 'right', fontSize: 10, fill: '#f59e0b' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="receita"
            name="Receita"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#gradReceita)"
          />
          <Area
            type="monotone"
            dataKey="lucro"
            name="Lucro Líquido"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradLucro)"
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Annual Area Chart ─────────────────────────────────────────────────────────

interface AnnualDataPoint {
  year: string;
  revenue: number;
  profit: number;
  units?: number;
}

interface AnnualAreaChartProps {
  data: AnnualDataPoint[];
  title?: string;
}

export function AnnualAreaChart({ data, title = 'Evolução Anual' }: AnnualAreaChartProps) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <ReAreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradAnualReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAnualLucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Area type="monotone" dataKey="revenue" name="Receita" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradAnualReceita)" />
          <Area type="monotone" dataKey="profit" name="Lucro" stroke="#10b981" strokeWidth={2.5} fill="url(#gradAnualLucro)" />
        </ReAreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
