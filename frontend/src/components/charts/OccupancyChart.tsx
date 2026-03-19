'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { TimeSeries } from '@/types/api';
import { formatPercent, formatPeriod } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface Props {
  data: TimeSeries[];
  breakEven?: number;
  maxStudents?: number;
}

export function OccupancyChart({ data, breakEven, maxStudents }: Props) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    alunos: Math.round(d.active_students ?? 0),
    ocupacao: Math.round((d.occupancy_rate ?? 0) * 100),
  }));

  return (
    <Card title="Alunos & Ocupação">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradAlunos" x1="0" y1="0" x2="0" y2="1">
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
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === 'ocupacao' ? [formatPercent(v / 100), 'Ocupação'] : [v, 'Alunos']
            }
            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          {breakEven && (
            <ReferenceLine
              y={breakEven}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: 'Break-even', fontSize: 10, fill: '#ef4444' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="alunos"
            name="Alunos"
            stroke="#6366f1"
            fill="url(#gradAlunos)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
