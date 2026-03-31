'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Props {
  series: Record<string, number>;
  color?: string;
}

export function UnitRevSparkline({ series, color = '#6366f1' }: Props) {
  const data = Object.entries(series)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, value]) => ({ period, value }));

  if (data.length < 2) {
    return <div className="h-8 w-full bg-gray-50 rounded" />;
  }

  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
          formatter={(v: number) => [formatCurrency(v), 'Receita']}
          labelFormatter={(label: string) => label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
