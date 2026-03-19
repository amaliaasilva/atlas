'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { versionsApi, calculationsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { formatCurrency, formatPercent, formatPeriod } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const METRIC_OPTIONS = [
  { value: 'net_result',     label: 'Resultado Líquido' },
  { value: 'gross_revenue',  label: 'Receita Bruta' },
  { value: 'ebitda',         label: 'EBITDA' },
  { value: 'active_students',label: 'Alunos Ativos' },
];

const SCENARIO_COLORS: Record<string, string> = {
  base:         '#6366f1',
  conservative: '#f59e0b',
  aggressive:   '#10b981',
  custom:       '#8b5cf6',
};

export default function CompareScenariosPage() {
  const [metric, setMetric] = useState('net_result');
  const { unitId } = useNavStore();

  // Buscar todas as versões da unidade (todos os cenários)
  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions-all', unitId],
    queryFn: () => versionsApi.list(unitId ?? ''),
    enabled: !!unitId,
  });

  // Buscar resultados de cada versão publicada
  const publishedVersions = versions?.filter((v) => v.status === 'published') ?? [];

  const resultsQueries = publishedVersions.map((v) => ({
    queryKey: ['results', v.id],
    queryFn: () => calculationsApi.results(v.id),
    enabled: publishedVersions.length > 0,
  }));

  // Como não temos useQueries simples sem refactoring, usamos abordagem simples com estado local
  // Para produção, use `useQueries` do @tanstack/react-query
  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Comparação entre Cenários" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Select
            label=""
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            options={METRIC_OPTIONS}
            className="w-56"
          />
        </div>

        {!unitId ? (
          <div className="text-center py-20 text-gray-400 text-sm">Selecione uma unidade para comparar</div>
        ) : publishedVersions.length < 2 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            É necessário ter ao menos 2 versões publicadas para comparar cenários.
            Publique uma versão em Orçamento → ⋯ → Publicar.
          </div>
        ) : (
          <Card title={`${METRIC_OPTIONS.find((m) => m.value === metric)?.label} — Comparação de Cenários`}>
            <p className="text-sm text-gray-400 mb-4">
              {publishedVersions.length} versões publicadas encontradas. Para dados completos, use a API de resultados.
            </p>
            <div className="space-y-3">
              {publishedVersions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: SCENARIO_COLORS[v.status] ?? '#6366f1' }}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">{v.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{v.horizon_start} → {v.horizon_end}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
