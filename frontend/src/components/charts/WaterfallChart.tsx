'use client';

import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface WaterfallItem {
  name: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
}

interface Props {
  revenue: number;
  fixedCosts: number;
  variableCosts: number;
  taxes: number;
  financing: number;
  netResult: number;
  title?: string;
}

const COLORS = {
  positive: '#10b981',   // emerald — receita / positivo
  negative: '#f43f5e',   // rose — custos
  total: '#6366f1',      // indigo — resultado final
};

function CustomLabel({ x, y, width, height, value }: { x?: number; y?: number; width?: number; height?: number; value?: number }) {
  if (!x || !y || !width || !height || value === undefined) return null;
  const sign = value >= 0 ? '+' : '';
  return (
    <text
      x={x + width / 2}
      y={value >= 0 ? y - 4 : y + height + 14}
      fill="#374151"
      textAnchor="middle"
      fontSize={10}
      fontWeight="600"
    >
      {sign}{formatCurrency(value)}
    </text>
  );
}

/**
 * WaterfallChart — cascata DRE simplificada:
 * Receita → (Custos Fixos) → (Variáveis) → (Impostos) → (Financiamento) → Resultado Líquido
 */
export function WaterfallChart({ revenue, fixedCosts, variableCosts, taxes, financing, netResult, title = 'DRE — Waterfall' }: Props) {
  // Construção do waterfall: accumulator + segment para cada barra
  const segments: Array<{ label: string; base: number; segment: number; type: 'positive' | 'negative' | 'total' }> = [
    { label: 'Receita', base: 0, segment: revenue, type: 'positive' },
    { label: 'Custos Fixos', base: revenue - fixedCosts, segment: -fixedCosts, type: 'negative' },
    { label: 'Variáveis', base: revenue - fixedCosts - variableCosts, segment: -variableCosts, type: 'negative' },
    { label: 'Impostos', base: revenue - fixedCosts - variableCosts - taxes, segment: -taxes, type: 'negative' },
    { label: 'Financ.', base: revenue - fixedCosts - variableCosts - taxes - financing, segment: -financing, type: 'negative' },
    { label: 'Resultado', base: 0, segment: netResult, type: netResult >= 0 ? 'positive' : 'negative' },
  ];

  const chartData = segments.map((s) => ({
    label: s.label,
    base: s.type === 'total' ? 0 : Math.min(s.base, s.base + s.segment),
    segment: Math.abs(s.segment),
    type: s.type,
    rawValue: s.segment,
  }));

  const domain = [
    Math.min(0, ...chartData.map((d) => d.base)),
    Math.max(...chartData.map((d) => d.base + d.segment)) * 1.1,
  ];

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            domain={domain}
          />
          <Tooltip
            formatter={(v: number, _: string, props: { payload?: { rawValue?: number } }) => {
              const raw = props?.payload?.rawValue;
              return [formatCurrency(raw ?? v), ''];
            }}
          />
          <ReferenceLine y={0} stroke="#d1d5db" />
          {/* Base transparente (posicionamento do waterfall) */}
          <Bar dataKey="base" stackId="a" fill="transparent" />
          {/* Segmento colorido */}
          <Bar dataKey="segment" stackId="a" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.type]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
