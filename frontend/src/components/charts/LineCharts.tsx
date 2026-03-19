'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatPeriod } from '@/lib/utils';
import type { TimeSeries } from '@/types/api';
import { getRevenue } from '@/types/api';

// ── Occupancy/Alunos chart com comparação de breakeven ────────────────────────

interface OccupancyLineChartProps {
  data: TimeSeries[];
  breakevenStudents?: number;
  title?: string;
}

export function OccupancyLineChart({
  data,
  breakevenStudents,
  title = 'Ocupação ao Longo do Tempo',
}: OccupancyLineChartProps) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    alunos: d.active_students ?? 0,
    ocupacao: Math.round((d.occupancy_rate ?? 0) * 100),
    breakeven: breakevenStudents,
  }));

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          {breakevenStudents && (
            <ReferenceLine
              y={breakevenStudents}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              label={{ value: 'Breakeven', position: 'right', fontSize: 10, fill: '#f59e0b' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="alunos"
            name="Alunos Ativos"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="ocupacao"
            name="Ocupação %"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Multi-scenario line chart ─────────────────────────────────────────────────

interface ScenarioSeriesPoint {
  period: string;
  pessimista?: number;
  moderado?: number;
  otimista?: number;
}

interface ScenarioLineChartProps {
  data: ScenarioSeriesPoint[];
  title?: string;
  valueFormatter?: (v: number) => string;
}

export function ScenarioLineChart({
  data,
  title = 'Projeções por Cenário',
  valueFormatter = formatCurrency,
}: ScenarioLineChartProps) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [valueFormatter(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Line type="monotone" dataKey="pessimista" name="Pessimista" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
          <Line type="monotone" dataKey="moderado" name="Moderado" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="otimista" name="Otimista" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="6 3" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Costs chart ────────────────────────────────────────────────────────────────

interface CostsChartProps {
  data: TimeSeries[];
  title?: string;
}

export function CostsLineChart({ data, title = 'Estrutura de Custos' }: CostsChartProps) {
  const chartData = data.map((d) => ({
    period: formatPeriod(d.period),
    receita: Math.round(getRevenue(d)),
    fixos: Math.round(d.total_fixed_costs ?? 0),
    variaveis: Math.round(d.total_variable_costs ?? 0),
    resultado: Math.round(d.net_result),
  }));

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
            contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Line type="monotone" dataKey="receita" name="Receita" stroke="#6366f1" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="fixos" name="Custos Fixos" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="variaveis" name="Custos Variáveis" stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
