'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { NoFiltersState, MetricCardSkeleton } from '@/components/dashboard/EmptyState';
import { TeachersBreakevenTable } from '@/components/tables/TeachersBreakevenTable';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { GraduationCap, Target, TrendingUp, DollarSign } from 'lucide-react';

export default function ProfessoresPage() {
  const { businessId, scenarioId } = useDashboardFilters();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  const ts = dashboard?.time_series ?? [];
  const latestPeriod = ts[ts.length - 1];
  const kpis = dashboard?.kpis;

  // KPIs do último período
  const breakEvenOccupancy = latestPeriod?.break_even_occupancy_pct ?? kpis?.break_even_occupancy_pct ?? 0;
  const breakEvenRevenue = latestPeriod?.break_even_revenue ?? kpis?.break_even_revenue ?? 0;
  const avgPrice = latestPeriod?.avg_price_per_hour ?? 0;
  const capacityHours = latestPeriod?.capacity_hours_month ?? kpis?.capacity_hours_month ?? 0;
  const breakEvenClasses = Math.round(breakEvenOccupancy * capacityHours);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Professores" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Professores" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Dimensionamento de Professores (Modelo B2B)</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Quantos professores são necessários para atingir o ponto de equilíbrio — por cenário e ano.
          </p>
        </div>

        {/* KPIs de referência */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Aulas p/ Break-even"
                value={String(breakEvenClasses)}
                icon={<Target className="h-4 w-4" />}
                accentColor="indigo"
                sub="aulas/mês necessárias"
                tooltip="Break-even occupancy × capacidade em horas/mês"
              />
              <MetricCard
                label="Ocupação de Break-even"
                value={formatPercent(breakEvenOccupancy)}
                icon={<TrendingUp className="h-4 w-4" />}
                accentColor="amber"
                sub="taxa mínima de ocupação"
              />
              <MetricCard
                label="Receita de Break-even"
                value={formatCurrency(breakEvenRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accentColor="emerald"
                sub="por mês"
              />
              <MetricCard
                label="Preço Médio / Hora"
                value={formatCurrency(avgPrice)}
                icon={<GraduationCap className="h-4 w-4" />}
                accentColor="sky"
                sub="ticket médio da aula"
              />
            </>
          )}
        </div>

        {/* Tabela de cenários × anos */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Professores Necessários por Cenário</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Pessimista = 1 prof/aula · Médio = 1,5 prof/aula · Otimista = 2 prof/aula
            </p>
          </div>
          {isLoading ? (
            <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
          ) : ts.length > 0 ? (
            <TeachersBreakevenTable timeSeries={ts} />
          ) : (
            <NoFiltersState compact message="Sem dados de série temporal disponíveis." />
          )}
        </section>

      </div>
    </>
  );
}
