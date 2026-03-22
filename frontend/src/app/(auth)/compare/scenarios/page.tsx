'use client';

import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { versionsApi, calculationsApi, scenariosApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent, formatPeriod, formatNumber } from '@/lib/utils';
import type { CalculatedResult } from '@/types/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const METRIC_OPTIONS = [
  { value: 'net_result',     label: 'Resultado Líquido' },
  { value: 'revenue_total',  label: 'Receita Bruta' },
  { value: 'ebitda',         label: 'EBITDA' },
  { value: 'active_students',label: 'Horas Vendidas' },
];

const LINE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

const SCENARIO_LABELS: Record<string, string> = {
  base:         'Moderado',
  conservative: 'Pessimista',
  aggressive:   'Otimista',
  custom:       'Personalizado',
};

function formatValue(value: number, metric: string) {
  if (metric === 'occupancy_rate') return formatPercent(value);
  if (metric === 'active_students') return formatNumber(value);
  return formatCurrency(value);
}

export default function CompareScenariosPage() {
  const [metric, setMetric] = useState('net_result');
  const { unitId, businessId } = useNavStore();

  // Todos os cenários do negócio
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  // Todas as versões da unidade
  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions-all', unitId],
    queryFn: () => versionsApi.list(unitId ?? ''),
    enabled: !!unitId,
  });

  // Versões publicadas
  const publishedVersions = versions?.filter((v) => v.status === 'published') ?? [];

  // Buscar resultados de TODAS as versões publicadas em paralelo
  const resultsQueries = useQueries({
    queries: publishedVersions.map((v) => ({
      queryKey: ['results', v.id],
      queryFn: () => calculationsApi.results(v.id),
      enabled: publishedVersions.length > 0,
    })),
  });

  const isLoadingResults = resultsQueries.some((q) => q.isLoading);

  // Montar o gráfico: cada linha = uma versão
  const allPeriods = resultsQueries
    .flatMap((q) => (q.data ?? []).map((r: CalculatedResult) => r.period_date))
    .filter((p, i, a) => a.indexOf(p) === i)
    .sort();

  const chartData = allPeriods.map((period) => {
    const entry: Record<string, string | number> = { period: formatPeriod(period) };
    publishedVersions.forEach((v, i) => {
      const results: CalculatedResult[] = resultsQueries[i]?.data ?? [];
      const row = results.find((r) => r.period_date === period && r.metric_code === metric);
      const scenario = scenarios.find((s) => s.id === v.scenario_id);
      const label = scenario ? (SCENARIO_LABELS[scenario.scenario_type] ?? scenario.name) : v.name;
      entry[label] = row?.value ?? 0;
    });
    return entry;
  });

  // KPI comparativo (total do período)
  const versionKpis = publishedVersions.map((v, i) => {
    const results: CalculatedResult[] = resultsQueries[i]?.data ?? [];
    const total = results
      .filter((r) => r.metric_code === metric)
      .reduce((acc, r) => acc + r.value, 0);
    const scenario = scenarios.find((s) => s.id === v.scenario_id);
    return {
      version: v,
      scenario,
      total,
      label: scenario ? (SCENARIO_LABELS[scenario.scenario_type] ?? scenario.name) : v.name,
      color: LINE_COLORS[i % LINE_COLORS.length],
    };
  });

  const metricLabel = METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Comparação entre Cenários" />
      <div className="flex-1 p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Comparação entre Cenários</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {!unitId
                ? 'Selecione uma unidade para comparar cenários'
                : `${publishedVersions.length} versão${publishedVersions.length !== 1 ? 'ões' : ''} publicada${publishedVersions.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            options={METRIC_OPTIONS}
            className="w-56"
          />
        </div>

        {!unitId ? (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 text-center text-sm text-blue-700">
            Selecione uma unidade no contexto para ver a comparação entre cenários.
          </div>
        ) : publishedVersions.length < 2 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-700">
            <p className="font-semibold mb-1">Versões insuficientes</p>
            <p>É necessário ter ao menos 2 versões publicadas para comparar cenários.</p>
          </div>
        ) : (
          <>
            {/* KPI cards por cenário */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {versionKpis.map(({ version, label, total, color, scenario }) => (
                <div
                  key={version.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatValue(total, metric)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={version.status} />
                    {scenario && <StatusBadge status={scenario.scenario_type} />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{version.horizon_start} → {version.horizon_end}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de linhas comparativo */}
            <Card title={`${metricLabel} — Evolução por Cenário`}>
              {isLoadingResults ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600" />
                </div>
              ) : chartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sem dados de resultados disponíveis.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        metric === 'active_students'
                          ? String(v)
                          : `R$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatValue(value, metric), name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {versionKpis.map(({ label, color }) => (
                      <Line
                        key={label}
                        type="monotone"
                        dataKey={label}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Tabela comparativa por período (últimos 12) */}
            {chartData.length > 0 && (
              <Card title="Tabela Comparativa">
                <div className="overflow-x-auto">
                  <table className="atlas-table">
                    <thead>
                      <tr>
                        <th>Período</th>
                        {versionKpis.map(({ label }) => <th key={label}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.slice(-12).map((row) => (
                        <tr key={String(row.period)}>
                          <td className="font-medium">{row.period}</td>
                          {versionKpis.map(({ label }) => (
                            <td key={label} className="numeric">
                              {formatValue(Number(row[label] ?? 0), metric)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
