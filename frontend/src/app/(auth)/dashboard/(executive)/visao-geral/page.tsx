'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardApi, unitsApi, versionsApi, aiApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AreaGrowthChart } from '@/components/charts/AreaGrowthChart';
import { NoFiltersState, MetricCardSkeleton, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import type { AuditReport } from '@/types/api';
import { DollarSign, TrendingUp, Target, Building2, TrendingDown, Calendar, Shield, ShieldAlert, BarChart2, Clock, Activity, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnitDateChip } from '@/components/ui/UnitLifecycleBadge';
import { UnitRoadmap } from '@/components/charts/UnitRoadmap';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

type TabId = 'financeira' | 'b2b' | 'dre';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'financeira', label: 'FINANCEIRA' },
  { id: 'b2b', label: 'B2B' },
  { id: 'dre', label: 'DRE' },
];

// ── PeriodContextBadge ───────────────────────────────────────────────────────
function PeriodContextBadge({ label, isDefault }: { label: string; isDefault: boolean }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
      isDefault
        ? 'bg-gray-50 border-gray-200 text-gray-500'
        : 'bg-indigo-50 border-indigo-200 text-indigo-700',
    )}>
      <Calendar className="h-3 w-3 shrink-0" />
      {label}
      {isDefault && (
        <span className="ml-0.5 rounded-full bg-gray-200 px-1.5 py-0 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
          padrão
        </span>
      )}
    </div>
  );
}

export default function VisaoGeralPage() {
  const { businessId, scenarioId, selectedUnitIds, periodStart, periodEnd, year, applyYearPreset } = useDashboardFilters();
  const [activeTab, setActiveTab] = useState<TabId>('financeira');
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  // single-unit: quando exatamente 1 unidade selecionada
  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;
  // multi-unit: passa filtro ao consolidado; se vazio = rede inteira
  const multiUnitIds = selectedUnitIds.length > 1 ? selectedUnitIds : [];

  // Dashboard consolidado (rede inteira ou unidades filtradas)
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, multiUnitIds],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, multiUnitIds),
    enabled: !!businessId && !!scenarioId && !unitId,
  });

  // Versões da unidade selecionada
  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-dashboard', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  // Melhor versão da unidade (publicada > rascunho > planejamento)
  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  // Dashboard da unidade selecionada
  const { data: unitDashboard, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['dashboard-unit', activeVersion?.id],
    queryFn: () => dashboardApi.unit(activeVersion!.id),
    enabled: !!activeVersion,
  });

  // Unidades do negócio (para contagem)
  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  // Auto-init: quando há anos disponíveis mas nenhum filtro de período está ativo,
  // seleciona automaticamente o último ano completo da projeção (D-05)
  useEffect(() => {
    // só inicializa uma vez (quando o cenário é carregado e não há filtro ativo)
    if (!scenarioId) return;
    if (year || periodStart) return;
    const allPeriods = (dashboard?.time_series ?? []).map((d) => d.period);
    if (allPeriods.length === 0) return;
    const years = Array.from(new Set(allPeriods.map((p) => p.slice(0, 4)))).sort();
    // D-05: último ano completo = penúltimo da lista (o último pode estar incompleto)
    const defaultYear = years.length >= 2 ? years[years.length - 2] : years[years.length - 1];
    if (defaultYear) applyYearPreset(defaultYear);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, dashboard?.time_series?.length]);

  // Dashboard ativo (unidade específica ou consolidado)
  const effectiveDashboard = unitId ? unitDashboard : dashboard;
  const isLoadingSkeleton = unitId ? isLoadingUnit : isLoading;

  const ts = effectiveDashboard?.time_series ?? [];

  // Filtro por intervalo de período
  const filteredTs = ts.filter((d) => {
    if (periodStart && d.period < periodStart) return false;
    if (periodEnd && d.period > periodEnd) return false;
    if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
    return true;
  });

  // Métricas financeiras
  const totalRevenue = filteredTs.reduce((acc, d) => acc + getRevenue(d), 0);
  const totalProfit = filteredTs.reduce((acc, d) => acc + d.net_result, 0);
  const totalEbitda = filteredTs.reduce((acc, d) => acc + d.ebitda, 0);
  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const ebitdaMargin = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

  // KPIs B2B Coworking
  const avgOccupancy =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.occupancy_rate ?? 0), 0) / filteredTs.length
      : 0;
  const totalCapacityHours = filteredTs.reduce((acc, d) => acc + (d.capacity_hours_month ?? 0), 0);
  const totalActiveHours = filteredTs.reduce((acc, d) => acc + (d.active_hours_month ?? 0), 0);
  const lastTs = filteredTs[filteredTs.length - 1];
  const breakEvenOccupancy = lastTs?.break_even_occupancy_pct ?? effectiveDashboard?.kpis?.break_even_occupancy_pct ?? 0;
  const contributionMargin = lastTs?.contribution_margin_pct ?? effectiveDashboard?.kpis?.contribution_margin_pct ?? 0;
  const hasB2BData = totalCapacityHours > 0 || avgOccupancy > 0;

  // D-04: preço médio ponderado pelas horas (média simples dos períodos)
  const avgPricePerHourSold =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.avg_price_per_hour_sold ?? 0), 0) / filteredTs.length
      : 0;
  const avgPricePerHourOccupied =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.avg_price_per_hour_occupied ?? 0), 0) / filteredTs.length
      : 0;
  const avgPricePerHourAvailable =
    filteredTs.length > 0
      ? filteredTs.reduce((acc, d) => acc + (d.avg_price_per_hour_available ?? 0), 0) / filteredTs.length
      : 0;

  // Tendência de receita (primeira vs segunda metade)
  const half = Math.floor(filteredTs.length / 2);
  const firstHalfRevenue = filteredTs.slice(0, half).reduce((acc, d) => acc + getRevenue(d), 0);
  const secondHalfRevenue = filteredTs.slice(half).reduce((acc, d) => acc + getRevenue(d), 0);
  const revenueTrend =
    firstHalfRevenue > 0 ? (secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue : 0;

  // Label do período exibido
  const periodLabel = (() => {
    if (unitId && activeVersion) {
      const unitInfo = units.find((u) => u.id === unitId);
      return `${unitInfo?.name ?? 'Unidade selecionada'} · ${filteredTs.length} meses`;
    }
    if (periodStart && periodEnd) {
      return `${periodStart.slice(0, 4)}–${periodEnd.slice(0, 4)} · ${filteredTs.length} meses`;
    }
    if (periodStart) return `A partir de ${periodStart.slice(0, 4)} · ${filteredTs.length} meses`;
    if (year) return `Ano ${year} · ${filteredTs.length} meses calculados`;
    return `Período completo · ${filteredTs.length} meses calculados`;
  })();

  const totalUnits = units.length;
  const nonClosedUnits = units.filter((u) => u.status !== 'closed').length;
  // Respeita o filtro de unidades: se há seleção ativa, só mostra unidades selecionadas
  const futureUnits = units
    .filter((u) => {
      if (u.opening_phase !== 'future') return false;
      if (selectedUnitIds.length > 0 && !selectedUnitIds.includes(u.id)) return false;
      return true;
    })
    .sort((a, b) => (a.days_to_opening ?? 9999) - (b.days_to_opening ?? 9999));

  // Auditoria AI
  const auditMutation = useMutation({
    mutationFn: () => aiApi.sanityCheck(activeVersion!.id),
    onSuccess: (report) => {
      setAuditReport(report);
      setShowAudit(true);
    },
  });

  // DRE sumária a partir da time series
  const dreRows = [
    { label: 'Receita Bruta', value: filteredTs.reduce((a, d) => a + getRevenue(d), 0), type: 'revenue' },
    { label: 'Custos Variáveis', value: -filteredTs.reduce((a, d) => a + (d.total_variable_costs ?? 0), 0), type: 'cost' },
    { label: 'Margem de Contribuição', value: filteredTs.reduce((a, d) => a + getRevenue(d) - (d.total_variable_costs ?? 0), 0), type: 'subtotal' },
    { label: 'Custos Fixos', value: -filteredTs.reduce((a, d) => a + (d.total_fixed_costs ?? 0), 0), type: 'cost' },
    { label: 'EBITDA', value: filteredTs.reduce((a, d) => a + d.ebitda, 0), type: 'subtotal' },
    { label: 'Impostos', value: -filteredTs.reduce((a, d) => a + (d.taxes_on_revenue ?? 0), 0), type: 'cost' },
    { label: 'Financiamento', value: -filteredTs.reduce((a, d) => a + (d.financing_payment ?? 0), 0), type: 'cost' },
    { label: 'Resultado Líquido', value: filteredTs.reduce((a, d) => a + d.net_result, 0), type: 'result' },
  ] as const;

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Visão Geral" />
        <div className="flex-1 p-6">
          <NoFiltersState />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Visão Geral" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Tabs FINANCEIRA | B2B | DRE + botão auditoria */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeVersion && (
            <button
              onClick={() => auditMutation.mutate()}
              disabled={auditMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Shield className="h-3.5 w-3.5" />
              {auditMutation.isPending ? 'Auditando...' : 'Auditar com IA'}
            </button>
          )}
        </div>

        {/* Painel de resultado de auditoria */}
        {showAudit && auditReport && (
          <div className={`rounded-xl border p-4 ${
            auditReport.overall_health === 'healthy' ? 'bg-emerald-50 border-emerald-200' :
            auditReport.overall_health === 'critical' ? 'bg-rose-50 border-rose-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-4 w-4 ${auditReport.overall_health === 'healthy' ? 'text-emerald-600' : auditReport.overall_health === 'critical' ? 'text-rose-600' : 'text-amber-600'}`} />
                <span className="text-sm font-bold text-gray-800">
                  Auditoria IA — Score {auditReport.risk_score}/100
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  auditReport.overall_health === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                  auditReport.overall_health === 'critical' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {auditReport.overall_health.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setShowAudit(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {auditReport.alerts.length === 0 ? (
              <p className="text-sm text-emerald-700">Nenhum problema detectado. Premissas consistentes.</p>
            ) : (
              <ul className="space-y-1.5">
                {auditReport.alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`font-bold shrink-0 ${alert.severity === 'critical' ? 'text-rose-600' : alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                      [{alert.severity.toUpperCase()}]
                    </span>
                    <span className="text-gray-700">{alert.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {auditReport.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <p className="text-xs font-semibold text-gray-600 mb-1">Recomendações:</p>
                <ul className="space-y-0.5">
                  {auditReport.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-gray-600">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Hero KPIs + Gráfico (aba FINANCEIRA) */}
        {activeTab === 'financeira' && (
        <>
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {unitId ? 'Visão da Unidade' : 'Visão Geral da Rede'}
              </h2>
              <div className="mt-1">
                <PeriodContextBadge
                  label={periodLabel}
                  isDefault={!periodStart && !!year}
                />
              </div>
            </div>
            {totalProfit >= 0 ? (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" />
                {unitId ? 'Unidade lucrativa' : 'Rede lucrativa'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-200">
                <TrendingDown className="h-3.5 w-3.5" />
                Abaixo do breakeven
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoadingSkeleton ? (
              Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            ) : (
              <>
                <MetricCard
                  label={unitId ? 'Receita Total' : 'Receita Total da Rede'}
                  value={formatCurrency(totalRevenue)}
                  trendValue={revenueTrend !== 0 ? `${revenueTrend > 0 ? '+' : ''}${formatPercent(revenueTrend)}` : undefined}
                  trend={revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'neutral'}
                  icon={<DollarSign className="h-4 w-4" />}
                  accentColor="indigo"
                  tooltip="Receita bruta acumulada no período selecionado"
                  dataType="projected"
                  size="lg"
                />
                <MetricCard
                  label={unitId ? 'Lucro Total' : 'Lucro Total da Rede'}
                  value={formatCurrency(totalProfit)}
                  trend={totalProfit >= 0 ? 'up' : 'down'}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accentColor={totalProfit >= 0 ? 'emerald' : 'rose'}
                  sub={`EBITDA: ${formatCurrency(totalEbitda)}`}
                  tooltip="Resultado líquido acumulado do período selecionado"
                  dataType="projected"
                  size="lg"
                />
                <MetricCard
                  label="Margem Líquida"
                  value={formatPercent(margin)}
                  trend={margin > 0.1 ? 'up' : margin > 0 ? 'neutral' : 'down'}
                  icon={<Target className="h-4 w-4" />}
                  accentColor={margin > 0.15 ? 'emerald' : margin > 0 ? 'amber' : 'rose'}
                  sub={`EBITDA Margin: ${formatPercent(ebitdaMargin)}`}
                  tooltip="Lucro líquido dividido pela receita bruta total"
                  dataType="projected"
                  size="lg"
                />
                {unitId ? (
                  <MetricCard
                    label="Status da Versão"
                    value={activeVersion ? activeVersion.status.charAt(0).toUpperCase() + activeVersion.status.slice(1) : '—'}
                    trend={activeVersion?.status === 'published' ? 'up' : 'neutral'}
                    icon={<Building2 className="h-4 w-4" />}
                    accentColor={activeVersion?.status === 'published' ? 'emerald' : 'amber'}
                    sub={activeVersion ? activeVersion.name : 'Sem versão calculada'}
                    size="lg"
                  />
                ) : (
                  <MetricCard
                    label="Unidades no Negócio"
                    value={formatNumber(nonClosedUnits)}
                    trend={nonClosedUnits > 0 ? 'up' : 'neutral'}
                    icon={<Building2 className="h-4 w-4" />}
                    accentColor="sky"
                    sub={`${totalUnits} no total · ${units.filter(u => u.status === 'planning').length} em planejamento`}
                    size="lg"
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* Roadmap de Expansão — todas as unidades com datas editáveis */}
        {!unitId && businessId && (
          <section>
            <UnitRoadmap businessId={businessId} editable />
          </section>
        )}

        {/* Próximas Aberturas (chips de urgência, mantido como complemento ao roadmap) */}
        {!unitId && futureUnits.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900">Próximas Aberturas</h3>
              <span className="ml-1 inline-flex items-center text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                {futureUnits.length}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {futureUnits.map((unit) => {
                const days = unit.days_to_opening ?? 0;
                const urgency = days <= 30 ? 'rose' : days <= 90 ? 'amber' : 'indigo';
                const colors = {
                  rose:   { card: 'border-rose-200 bg-rose-50',     dot: 'bg-rose-500 animate-pulse',    label: 'text-rose-800',     days: 'text-rose-700' },
                  amber:  { card: 'border-amber-200 bg-amber-50',   dot: 'bg-amber-500 animate-pulse',   label: 'text-amber-800',    days: 'text-amber-700' },
                  indigo: { card: 'border-indigo-100 bg-indigo-50', dot: 'bg-indigo-400',                label: 'text-indigo-800',   days: 'text-indigo-700' },
                }[urgency];
                const openingFmt = unit.opening_date
                  ? new Date(unit.opening_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '';
                return (
                  <div key={unit.id} className={`shrink-0 rounded-2xl border p-4 min-w-[180px] max-w-[210px] flex flex-col gap-1.5 ${colors.card}`}>
                    <p className={`text-xs font-bold leading-tight ${colors.label}`}>{unit.name}</p>
                    {unit.city && (
                      <p className={`text-[10px] opacity-60 ${colors.label}`}>
                        {unit.city}{unit.state ? `, ${unit.state}` : ''}
                      </p>
                    )}
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
                      <span className={`text-2xl font-black tabular-nums leading-none ${colors.days}`}>{days}</span>
                      <span className={`text-xs opacity-70 ${colors.label}`}>dias</span>
                    </div>
                    {openingFmt && (
                      <p className={`text-[10px] opacity-50 ${colors.label}`}>{openingFmt}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Gráfico de evolução */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoadingSkeleton ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : filteredTs.length > 0 ? (
            <>
              <AreaGrowthChart
                data={filteredTs}
                title="Receita vs Lucro — Evolução"
              />
              {/* Métricas secundárias */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-800 mb-5">Destaques do Período</h3>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Receita Média Mensal',
                      value: formatCurrency(filteredTs.length > 0 ? totalRevenue / filteredTs.length : 0),
                      color: 'bg-indigo-500',
                    },
                    {
                      label: 'Lucro Médio Mensal',
                      value: formatCurrency(filteredTs.length > 0 ? totalProfit / filteredTs.length : 0),
                      color: totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
                    },
                    {
                      label: 'Melhor Mês (Receita)',
                      value: formatCurrency(Math.max(...filteredTs.map((d) => getRevenue(d)), 0)),
                      color: 'bg-sky-500',
                    },
                    {
                      label: 'EBITDA Acumulado',
                      value: formatCurrency(totalEbitda),
                      color: totalEbitda >= 0 ? 'bg-violet-500' : 'bg-rose-400',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                      <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Status operacional */}
                <div className={`mt-6 p-4 rounded-xl border ${totalProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-start gap-3">
                    <BarChart2 className={`h-5 w-5 mt-0.5 shrink-0 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${totalProfit >= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {totalProfit >= 0 ? (unitId ? 'Unidade acima do breakeven' : 'Rede acima do breakeven') : (unitId ? 'Unidade abaixo do breakeven' : 'Rede abaixo do breakeven')}
                      </p>
                      <p className={`text-xs mt-0.5 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {totalProfit >= 0
                          ? `Margem positiva de ${formatPercent(margin)} no período`
                          : `Gap de ${formatCurrency(Math.abs(totalProfit))} para equilíbrio`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <NoFiltersState message="Nenhum resultado calculado. Execute o cálculo nas versões e consolide o negócio." />
            </div>
          )}
        </section>
        </>
        )}

        {/* Tab B2B */}
        {activeTab === 'b2b' && (
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-gray-700">Indicadores B2B Coworking</h3>
              <p className="text-xs text-gray-400 mt-0.5">Capacidade, ocupação e breakeven do período</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoadingSkeleton ? (
                Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              ) : (
                <>
                  <MetricCard
                    label="Capacidade Total (h)"
                    value={formatNumber(totalCapacityHours, 0)}
                    trend="neutral"
                    icon={<Clock className="h-4 w-4" />}
                    accentColor="sky"
                    sub={`Média: ${formatNumber(totalCapacityHours / Math.max(filteredTs.length, 1), 0)} h/mês`}
                  />
                  <MetricCard
                    label="Horas Vendidas (h)"
                    value={formatNumber(totalActiveHours, 0)}
                    trend={totalActiveHours > 0 ? 'up' : 'neutral'}
                    icon={<Activity className="h-4 w-4" />}
                    accentColor="violet"
                    sub={`Média: ${formatNumber(totalActiveHours / Math.max(filteredTs.length, 1), 0)} h/mês`}
                  />
                  <MetricCard
                    label="Taxa de Ocupação Média"
                    value={formatPercent(avgOccupancy)}
                    trend={avgOccupancy > 0.4 ? 'up' : avgOccupancy > 0.2 ? 'neutral' : 'down'}
                    icon={<Percent className="h-4 w-4" />}
                    accentColor={avgOccupancy > 0.5 ? 'emerald' : avgOccupancy > 0.25 ? 'amber' : 'rose'}
                    sub={`Breakeven: ${formatPercent(breakEvenOccupancy)}`}
                  />
                  <MetricCard
                    label="Margem de Contribuição"
                    value={contributionMargin > 0 ? formatPercent(contributionMargin) : '—'}
                    trend={contributionMargin > 0.4 ? 'up' : contributionMargin > 0.2 ? 'neutral' : 'down'}
                    icon={<BarChart2 className="h-4 w-4" />}
                    accentColor={contributionMargin > 0.4 ? 'emerald' : contributionMargin > 0.2 ? 'amber' : 'rose'}
                    sub="Receita − Custos Variáveis"
                  />
                </>
              )}
            </div>

            {/* D-04: Preço Médio / Hora — 3 variantes */}
            {!isLoadingSkeleton && hasB2BData && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3">
                  Preço Médio por Hora (média do período)
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <MetricCard
                    label="Preço / Hora Vendida"
                    value={avgPricePerHourSold > 0 ? formatCurrency(avgPricePerHourSold) : '—'}
                    trend="neutral"
                    icon={<DollarSign className="h-4 w-4" />}
                    accentColor="indigo"
                    sub="Receita ÷ horas efetivamente vendidas"
                    tooltip="Preço médio calculado sobre as horas realmente ocupadas por clientes"
                  />
                  <MetricCard
                    label="Receita / Hora Ocupada"
                    value={avgPricePerHourOccupied > 0 ? formatCurrency(avgPricePerHourOccupied) : '—'}
                    trend="neutral"
                    icon={<Activity className="h-4 w-4" />}
                    accentColor="violet"
                    sub="Receita ÷ horas com operação ativa"
                    tooltip="Igual ao preço por hora vendida no modelo B2B coworking"
                  />
                  <MetricCard
                    label="Receita / Hora Disponível"
                    value={avgPricePerHourAvailable > 0 ? formatCurrency(avgPricePerHourAvailable) : '—'}
                    trend={avgPricePerHourAvailable > 0 && totalCapacityHours > 0 ? (avgPricePerHourAvailable / (avgPricePerHourSold || 1) > 0.6 ? 'up' : 'neutral') : 'neutral'}
                    icon={<Clock className="h-4 w-4" />}
                    accentColor="sky"
                    sub="Receita ÷ horas totais do calendário"
                    tooltip="Rendimento sobre toda a capacidade instalada, independente de ocupação"
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* Tab DRE sumária */}
        {activeTab === 'dre' && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">DRE Resumida</h3>
              <p className="text-xs text-gray-400 mt-0.5">Acumulado do período selecionado · Para DRE detalhado acesse o menu DRE</p>
            </div>
            {isLoadingSkeleton ? (
              <div className="p-6 animate-pulse space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
              </div>
            ) : filteredTs.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 text-left font-semibold">Item</th>
                    <th className="px-6 py-3 text-right font-semibold">Valor Acumulado</th>
                    <th className="px-6 py-3 text-right font-semibold">% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {dreRows.map((row, i) => {
                    const revTotal = filteredTs.reduce((a, d) => a + getRevenue(d), 0);
                    const pct = revTotal !== 0 ? row.value / revTotal : 0;
                    const isResult = row.type === 'result';
                    const isSubtotal = row.type === 'subtotal';
                    return (
                      <tr
                        key={i}
                        className={`border-t border-gray-50 ${
                          isResult ? 'border-t-2 border-gray-300 bg-indigo-50' :
                          isSubtotal ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className={`px-6 py-3 ${isResult ? 'font-bold text-indigo-800' : isSubtotal ? 'font-semibold text-slate-700' : 'text-slate-600'}`}>
                          {row.label}
                        </td>
                        <td className={`px-6 py-3 text-right tabular-nums ${
                          row.value >= 0 ? (isResult ? 'font-bold text-indigo-700' : 'text-emerald-700') : 'text-rose-600'
                        }`}>
                          {formatCurrency(row.value)}
                        </td>
                        <td className={`px-6 py-3 text-right tabular-nums text-slate-400 ${isResult ? 'font-bold' : ''}`}>
                          {(pct * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <NoFiltersState compact message="Sem dados calculados para o período." />
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

