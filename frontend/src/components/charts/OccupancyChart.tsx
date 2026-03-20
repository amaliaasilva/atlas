'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { TimeSeries } from '@/types/api';
import { formatPercent, formatPeriod } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface Props {
  data: TimeSeries[];
  breakEvenOccupancy?: number;  // 0.0–1.0
}

export function OccupancyChart({ data, breakEvenOccupancy }: Props) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    horasVendidas: Math.round(d.active_hours_month ?? 0),
    capacidade: Math.round(d.capacity_hours_month ?? 0),
    ocupacao: Math.round((d.occupancy_rate ?? 0) * 100),
  }));

  return (
    <Card title="Ocupação do Espaço">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradHoras" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === 'Ocupação' ? [formatPercent(v / 100), name] : [`${v.toLocaleString('pt-BR')} h`, name]
            }
            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {breakEvenOccupancy && (
            <ReferenceLine
              yAxisId="right"
              y={Math.round(breakEvenOccupancy * 100)}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: 'Break-even', fontSize: 10, fill: '#ef4444' }}
            />
          )}
          <Bar
            yAxisId="left"
            dataKey="capacidade"
            name="Capacidade (h)"
            fill="#e0e7ff"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="horasVendidas"
            name="Horas Vendidas (h)"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ocupacao"
            name="Ocupação"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
