'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { AnnualRow } from '@/lib/utils/dashboard';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface Props {
  data: AnnualRow[];
  title?: string;
}

/**
 * Gráfico anual: barras para receita/lucro, linha para margem líquida.
 * Reutiliza AnnualRow de lib/utils/dashboard.ts (DRY P0.9).
 */
export function AnnualSummaryChart({ data, title = 'Resumo Anual' }: Props) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="money"
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Margem') return [`${(value * 100).toFixed(1)}%`, name];
              return [formatCurrency(value), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar yAxisId="money" dataKey="revenue" name="Receita" fill="#6366f1" opacity={0.85} radius={[3, 3, 0, 0]} />
          <Bar yAxisId="money" dataKey="profit" name="Lucro" fill="#10b981" opacity={0.85} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="margin"
            name="Margem"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4, fill: '#f59e0b' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
