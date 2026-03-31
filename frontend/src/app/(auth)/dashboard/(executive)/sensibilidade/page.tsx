'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { Topbar } from '@/components/layout/Topbar';
import { NoFiltersState, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { getRevenue } from '@/types/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Slider component ──────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  baseValue?: number;
}

function SliderField({ label, value, min, max, step, format, onChange, baseValue }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const delta = baseValue !== undefined ? value - baseValue : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {delta !== null && delta !== 0 && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            )}>
              {delta > 0 ? '+' : ''}{format(baseValue! + delta).replace(format(baseValue!), '')}
              {delta > 0 ? '▲' : '▼'}
            </span>
          )}
          <span className="text-sm font-bold text-slate-800 tabular-nums min-w-[80px] text-right">
            {format(value)}
          </span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${pct}%, #E5E7EB ${pct}%, #E5E7EB 100%)`,
          }}
        />
      </div>
      {baseValue !== undefined && (
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{format(min)}</span>
          <span className="italic">base: {format(baseValue)}</span>
          <span>{format(max)}</span>
        </div>
      )}
    </div>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────

function SensTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1.5">Ocupação: {label}%</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SensibilidadePage() {
  const { businessId, scenarioId, selectedUnitIds, year, periodStart, periodEnd } = useDashboardFilters();
  const unitScope = selectedUnitIds.length > 0 ? selectedUnitIds : [];
  const unitScopeKey = unitScope.join(',');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId, unitScopeKey],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!, unitScope),
    enabled: !!businessId && !!scenarioId,
  });

  // Filtra por período ativo
  const filteredTs = useMemo(() => {
    const ts = dashboard?.time_series ?? [];
    return ts.filter((d) => {
      if (periodStart && d.period < periodStart) return false;
      if (periodEnd && d.period > periodEnd) return false;
      if (!periodStart && !periodEnd && year) return d.period.startsWith(year);
      return true;
    });
  }, [dashboard?.time_series, periodStart, periodEnd, year]);

  // Parâmetros base extraídos do período filtrado (média ponderada)
  const baseParams = useMemo(() => {
    if (filteredTs.length === 0) return null;
    const n = filteredTs.length;
    const totalRevenue = filteredTs.reduce((s, d) => s + getRevenue(d), 0);
    const totalFixed = filteredTs.reduce((s, d) => s + (d.total_fixed_costs ?? 0), 0);
    const totalVar = filteredTs.reduce((s, d) => s + (d.total_variable_costs ?? 0), 0);
    const totalTax = filteredTs.reduce((s, d) => s + (d.taxes_on_revenue ?? d.taxes ?? 0), 0);
    const totalCapacity = filteredTs.reduce((s, d) => s + (d.capacity_hours_month ?? 0), 0);
    const totalActive = filteredTs.reduce((s, d) => s + (d.active_hours_month ?? 0), 0);

    const avgCapacityHours = totalCapacity / n;
    const avgPrice = totalActive > 0 ? totalRevenue / totalActive : 0;
    const avgOccupancy = totalCapacity > 0 ? totalActive / totalCapacity : 0;
    const varPct = totalRevenue > 0 ? totalVar / totalRevenue : 0;
    const taxPct = totalRevenue > 0 ? totalTax / totalRevenue : 0;
    const avgFixed = totalFixed / n;
    const beOccupancy = filteredTs[filteredTs.length - 1]?.break_even_occupancy_pct;

    return {
      avgCapacityHours,
      avgPrice,
      avgOccupancy,
      varPct,
      taxPct,
      avgFixed,
      totalRevenue,
      totalFixed,
      beOccupancy: beOccupancy ?? null,
    };
  }, [filteredTs]);

  // Estado dos sliders (inicializado com base nos dados)
  const [occRate, setOccRate] = useState<number | null>(null);
  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [workingDays, setWorkingDays] = useState<number | null>(null);

  const effectiveOcc = occRate ?? (baseParams?.avgOccupancy ?? 0.7);
  const effectivePrice = pricePerHour ?? (baseParams?.avgPrice ?? 100);
  const effectiveDays = workingDays ?? 22;

  // Capacidade ajustada pelos dias úteis do slider
  const capacityAdjFactor = baseParams?.avgCapacityHours
    ? (effectiveDays / 22) // fator relativo a 22 dias base
    : 1;
  const adjustedCapacity = (baseParams?.avgCapacityHours ?? 0) * capacityAdjFactor;

  // Resultado projetado com os sliders
  const projectedRevenue = adjustedCapacity * effectiveOcc * effectivePrice;
  const projectedVar = projectedRevenue * (baseParams?.varPct ?? 0.12);
  const projectedTax = projectedRevenue * (baseParams?.taxPct ?? 0.1);
  const projectedResult = projectedRevenue - (baseParams?.avgFixed ?? 0) - projectedVar - projectedTax;

  // Breakeven calculado com os parâmetros do slider
  const beOcc = baseParams
    ? (baseParams.avgFixed) /
      Math.max(adjustedCapacity * effectivePrice * (1 - (baseParams.varPct + baseParams.taxPct)), 0.001)
    : null;

  // Curva de sensibilidade: resultado × ocupação (0% a 100%, passo 5%)
  const sensitivityCurve = useMemo(() => {
    if (!baseParams) return [];
    const points = [];
    for (let r = 0; r <= 1.001; r += 0.05) {
      const rev = adjustedCapacity * r * effectivePrice;
      const result = rev - baseParams.avgFixed - rev * (baseParams.varPct + baseParams.taxPct);
      const revBase = adjustedCapacity * r * (baseParams.avgPrice || effectivePrice);
      const resultBase = revBase - baseParams.avgFixed - revBase * (baseParams.varPct + baseParams.taxPct);
      points.push({
        occ: Math.round(r * 100),
        resultado: Math.round(result),
        base: Math.round(resultBase),
      });
    }
    return points;
  }, [adjustedCapacity, effectivePrice, baseParams]);

  const activePointOcc = Math.round(effectiveOcc * 100);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Análise de Sensibilidade" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Análise de Sensibilidade" />
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Análise de Sensibilidade</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Explore o impacto de variações nos parâmetros operacionais sobre o resultado financeiro
          </p>
        </div>

        {isLoading || !baseParams ? (
          <ChartSkeleton />
        ) : (
          <>
            {/* Layout: sliders à esquerda, KPIs + gráfico à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

              {/* ── Painel de sliders ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <h3 className="text-sm font-bold text-gray-700">Parâmetros</h3>

                <SliderField
                  label="Taxa de Ocupação"
                  value={Math.round(effectiveOcc * 100)}
                  min={0}
                  max={100}
                  step={1}
                  format={(v) => `${v}%`}
                  onChange={(v) => setOccRate(v / 100)}
                  baseValue={Math.round((baseParams.avgOccupancy) * 100)}
                />

                <SliderField
                  label="Preço médio / hora (R$)"
                  value={Math.round(effectivePrice)}
                  min={Math.max(10, Math.round(effectivePrice * 0.3))}
                  max={Math.round(effectivePrice * 2.5)}
                  step={5}
                  format={(v) => `R$\u00a0${v.toLocaleString('pt-BR')}`}
                  onChange={(v) => setPricePerHour(v)}
                  baseValue={Math.round(baseParams.avgPrice)}
                />

                <SliderField
                  label="Dias úteis / mês"
                  value={effectiveDays}
                  min={15}
                  max={26}
                  step={1}
                  format={(v) => `${v} dias`}
                  onChange={(v) => setWorkingDays(v)}
                  baseValue={22}
                />

                {/* Reset */}
                <button
                  onClick={() => { setOccRate(null); setPricePerHour(null); setWorkingDays(null); }}
                  className="w-full rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:border-rose-200 hover:text-rose-500 transition-colors"
                >
                  Resetar para valores base
                </button>

                {/* Breakeven highlight */}
                {beOcc !== null && (
                  <div className={cn(
                    'rounded-xl border p-4 text-sm',
                    beOcc <= effectiveOcc
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800',
                  )}>
                    <p className="font-bold mb-0.5">Ponto de Equilíbrio</p>
                    <p className="text-lg font-black tabular-nums">{formatPercent(Math.min(beOcc, 1))}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {beOcc <= effectiveOcc
                        ? `✓ Acima do breakeven por ${formatPercent(effectiveOcc - beOcc)}`
                        : `⚠ Ainda ${formatPercent(beOcc - effectiveOcc)} abaixo do breakeven`}
                    </p>
                  </div>
                )}
              </div>

              {/* ── KPIs projetados + Gráfico ── */}
              <div className="space-y-4">

                {/* KPIs projetados */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard
                    label="Receita Projetada"
                    value={formatCurrency(projectedRevenue)}
                    icon={<DollarSign className="h-4 w-4" />}
                    accentColor="indigo"
                    sub="com parâmetros do slider"
                  />
                  <MetricCard
                    label="Resultado Projetado"
                    value={formatCurrency(projectedResult)}
                    icon={<TrendingUp className="h-4 w-4" />}
                    accentColor={projectedResult >= 0 ? 'emerald' : 'rose'}
                    sub={projectedResult >= 0 ? 'Operação lucrativa' : 'Abaixo do breakeven'}
                  />
                  <MetricCard
                    label="Ocupação Simulada"
                    value={formatPercent(effectiveOcc)}
                    icon={<Percent className="h-4 w-4" />}
                    accentColor="sky"
                    sub={`base: ${formatPercent(baseParams.avgOccupancy)}`}
                  />
                  <MetricCard
                    label="Breakeven"
                    value={beOcc !== null ? formatPercent(Math.min(beOcc, 1)) : '—'}
                    icon={<Target className="h-4 w-4" />}
                    accentColor={beOcc !== null && beOcc <= effectiveOcc ? 'emerald' : 'amber'}
                    sub="ocupação mínima necessária"
                  />
                </div>

                {/* Gráfico de curva de sensibilidade */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">
                    Resultado × Taxa de Ocupação
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Curva de resultado financeiro mensal médio em função da ocupação
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={sensitivityCurve} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="occ"
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                        axisLine={{ stroke: '#E2E8F0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                      />
                      <Tooltip content={<SensTooltip />} />
                      <Legend
                        formatter={(value) =>
                          value === 'resultado' ? 'Resultado (sliders)' : 'Resultado (base)'
                        }
                        iconType="circle"
                        iconSize={8}
                      />
                      {/* Linha de zero (breakeven de resultado) */}
                      <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: 'R$0', position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
                      {/* Linha vertical: ocupação atual simulada */}
                      <ReferenceLine
                        x={activePointOcc}
                        stroke="#6366f1"
                        strokeDasharray="4 2"
                        label={{ value: `${activePointOcc}%`, position: 'top', fontSize: 10, fill: '#6366f1' }}
                      />
                      {/* Linha de breakeven de ocupação */}
                      {beOcc !== null && (
                        <ReferenceLine
                          x={Math.round(Math.min(beOcc, 1) * 100)}
                          stroke="#F59E0B"
                          strokeDasharray="3 3"
                          label={{ value: 'BE', position: 'insideTopRight', fontSize: 10, fill: '#F59E0B' }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="base"
                        stroke="#CBD5E1"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="resultado"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabela de pontos-chave */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700">Pontos-chave da Curva</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500">
                          <th className="px-4 py-2.5 text-left font-semibold">Ocupação</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Receita / mês</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Resultado / mês</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Margem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[20, 40, 50, 60, 70, 80, 90, 100].map((occPct) => {
                          const r = occPct / 100;
                          const rev = adjustedCapacity * r * effectivePrice;
                          const res = rev - (baseParams?.avgFixed ?? 0) - rev * ((baseParams?.varPct ?? 0) + (baseParams?.taxPct ?? 0));
                          const margin = rev > 0 ? res / rev : 0;
                          const isActive = occPct === activePointOcc;
                          const isBreakeven = beOcc !== null && Math.abs(r - beOcc) < 0.05;
                          return (
                            <tr
                              key={occPct}
                              className={cn(
                                'border-t border-gray-100 transition-colors',
                                isActive ? 'bg-indigo-50' : isBreakeven ? 'bg-amber-50' : 'hover:bg-gray-50',
                              )}
                            >
                              <td className="px-4 py-2.5 font-semibold">
                                {occPct}%
                                {isActive && <span className="ml-1.5 text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5">atual</span>}
                                {isBreakeven && !isActive && <span className="ml-1.5 text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5">BE</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(rev)}</td>
                              <td className={cn('px-4 py-2.5 text-right tabular-nums font-semibold', res >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                                {formatCurrency(res)}
                              </td>
                              <td className={cn('px-4 py-2.5 text-right tabular-nums', margin >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                                {formatPercent(margin)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
