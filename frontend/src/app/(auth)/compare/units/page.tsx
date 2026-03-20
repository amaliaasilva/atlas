'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, scenariosApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Select } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatPercent, formatPeriod } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const METRIC_OPTIONS = [
  { value: 'net_result',    label: 'Resultado Líquido' },
  { value: 'gross_revenue', label: 'Receita Bruta' },
  { value: 'ebitda',        label: 'EBITDA' },
  { value: 'active_students', label: 'Horas Vendidas' },
  { value: 'occupancy_rate', label: 'Taxa de Ocupação' },
];

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

export default function CompareUnitsPage() {
  const [metric, setMetric] = useState('net_result');
  const { businessId, scenarioId, setScenario } = useNavStore();

  const { data: scenarios } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['compare-units', businessId, scenarioId, metric],
    queryFn: () => dashboardApi.unitsComparison(businessId ?? '', scenarioId ?? '', metric),
    enabled: !!(businessId && scenarioId),
  });

  if (isLoading) return <LoadingScreen />;

  // Transformar dados para o formato do recharts
  const units = comparison?.units ?? [];
  const periods = [...new Set(units.flatMap((u) => Object.keys(u.series)) ?? [])].sort();
  const chartData = periods.map((p) => {
    const entry: Record<string, string | number> = { period: formatPeriod(p) };
    units.forEach((unit) => {
      entry[unit.unit_name] = unit.series[p] ?? 0;
    });
    return entry;
  });

  const isPercent = metric === 'occupancy_rate';
  const isCurrency = ['net_result', 'gross_revenue', 'ebitda'].includes(metric);

  return (
    <>
      <Topbar title="Comparação entre Unidades" />
      <div className="flex-1 p-6 space-y-6">
        {/* Filtros */}
        <div className="flex items-center gap-4">
          <Select
            label=""
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            options={METRIC_OPTIONS}
            className="w-56"
          />
          {scenarios && (
            <Select
              label=""
              value={scenarioId ?? ''}
              onChange={(e) => setScenario(e.target.value)}
              options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
              className="w-56"
            />
          )}
        </div>

        {!businessId || !scenarioId ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Selecione um negócio e cenário para ver a comparação
          </div>
        ) : (
          <Card title={`${METRIC_OPTIONS.find((m) => m.value === metric)?.label} por Unidade`}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) =>
                    isPercent ? formatPercent(v) : isCurrency ? `R$${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    isPercent ? formatPercent(v) : isCurrency ? formatCurrency(v) : v,
                    name,
                  ]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {units.map((unit, i) => (
                  <Line
                    key={unit.unit_id}
                    type="monotone"
                    dataKey={unit.unit_name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </>
  );
}
