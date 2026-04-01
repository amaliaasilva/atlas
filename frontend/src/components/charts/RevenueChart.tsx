'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TimeSeries } from '@/types/api';
import { getRevenue } from '@/types/api';
import { formatCurrency, formatPeriod } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface Props {
  data: TimeSeries[];
  title?: string;
  onPeriodClick?: (period: string) => void;
}

export function RevenueChart({ data, title = 'Receita vs Resultado', onPeriodClick }: Props) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    _raw: d.period,
    receita: Math.round(getRevenue(d)),
    resultado: Math.round(d.net_result),
    ebitda: Math.round(d.ebitda),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(payload: any) {
    if (onPeriodClick && payload?.activePayload?.[0]?.payload?._raw) {
      onPeriodClick(payload.activePayload[0].payload._raw);
    }
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} onClick={onPeriodClick ? handleClick : undefined} style={onPeriodClick ? { cursor: 'pointer' } : undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar yAxisId="left" dataKey="receita" name="Receita Bruta" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.85} />
          <Line yAxisId="left" type="monotone" dataKey="resultado" name="Resultado Líquido" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="ebitda" name="EBITDA" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
