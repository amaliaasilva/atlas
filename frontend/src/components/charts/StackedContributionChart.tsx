'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface UnitYear {
  unit_name: string;
  revenue: number;
}

interface StackedYearEntry {
  year: string;
  [unit: string]: string | number;
}

interface StackedContributionChartProps {
  /** Mapeamento de unit_name → lista de { year, revenue } */
  units: Array<{ unit_name: string; annual: Array<{ year: string; revenue: number }> }>;
  title?: string;
}

const PALETTE = [
  '#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899',
];

function buildRows(units: StackedContributionChartProps['units']): { rows: StackedYearEntry[]; names: string[] } {
  const yearMap = new Map<string, StackedYearEntry>();
  const names = units.map((u) => u.unit_name);

  for (const unit of units) {
    for (const { year, revenue } of unit.annual) {
      if (!yearMap.has(year)) {
        const entry: StackedYearEntry = { year };
        for (const n of names) entry[n] = 0;
        yearMap.set(year, entry);
      }
      yearMap.get(year)![unit.unit_name] = revenue;
    }
  }

  const rows = Array.from(yearMap.values()).sort((a, b) => String(a.year).localeCompare(String(b.year)));
  return { rows, names };
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600 truncate max-w-[100px]">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-gray-900">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export function StackedContributionChart({ units, title = 'Expansão da Receita por Unidade' }: StackedContributionChartProps) {
  const { rows, names } = buildRows(units);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {names.map((name, i) => (
            <Bar key={name} dataKey={name} stackId="revenue" fill={PALETTE[i % PALETTE.length]} radius={i === names.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
              {rows.map((_, ri) => (
                <Cell key={ri} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
