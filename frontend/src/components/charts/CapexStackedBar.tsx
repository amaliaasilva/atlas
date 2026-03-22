'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface CapexData {
  unitName: string;
  equipment_value: number;
  renovation_works: number;
  furniture_fixtures: number;
  technology_setup: number;
  architect_fees: number;
  ac_automation: number;
  branding_budget: number;
  other_capex: number;
}

interface Props {
  data: CapexData[];
  title?: string;
}

const CAPEX_KEYS: Array<{ key: keyof Omit<CapexData, 'unitName'>; name: string; color: string }> = [
  { key: 'equipment_value', name: 'Equipamentos', color: '#6366f1' },
  { key: 'renovation_works', name: 'Obras', color: '#8b5cf6' },
  { key: 'furniture_fixtures', name: 'Móveis', color: '#a78bfa' },
  { key: 'technology_setup', name: 'Tecnologia', color: '#22d3ee' },
  { key: 'architect_fees', name: 'Arquitetura', color: '#34d399' },
  { key: 'ac_automation', name: 'A/C & Automação', color: '#fbbf24' },
  { key: 'branding_budget', name: 'Branding', color: '#f87171' },
  { key: 'other_capex', name: 'Outros', color: '#9ca3af' },
];

/**
 * CapexStackedBar — barras empilhadas por unidade mostrando a composição do CAPEX.
 */
export function CapexStackedBar({ data, title = 'Composição CAPEX por Unidade' }: Props) {
  const chartData = data.map((d) => ({ ...d, name: d.unitName }));

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatCurrency(v), name]}
            cursor={{ fill: 'transparent' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          {CAPEX_KEYS.map(({ key, name, color }) => (
            <Bar key={key} dataKey={key} name={name} stackId="capex" fill={color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
