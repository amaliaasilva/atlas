'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, servicePlansApi, versionsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { NoFiltersState, ChartSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import type { RevenueSplitPeriod } from '@/types/api';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

const FMT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatBrl(v: number) {
  return FMT.format(v);
}

export default function BeneficiosPersonalPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();

  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  const { data: unitVersions = [] } = useQuery({
    queryKey: ['unit-versions-split', unitId, scenarioId],
    queryFn: () => versionsApi.list(unitId!, scenarioId!),
    enabled: !!unitId && !!scenarioId,
  });

  const activeVersion = [...unitVersions]
    .filter((v) => v.is_active)
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0];

  const { data: splitData, isLoading: splitLoading } = useQuery({
    queryKey: ['revenue-split', activeVersion?.id],
    queryFn: () => dashboardApi.revenueSplit(activeVersion!.id),
    enabled: !!activeVersion,
  });

  const { data: servicePlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['service-plans', businessId],
    queryFn: () => servicePlansApi.list(businessId!),
    enabled: !!businessId,
  });

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Benefícios Personal — Split de Receita" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  const totals = splitData?.totals;
  const isLoading = splitLoading || plansLoading;

  return (
    <>
      <Topbar title="Benefícios Personal — Split de Receita" />
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Benefícios Personal Trainers & Split</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Divisão de receita entre plataforma Atlas e franqueado, e benefícios por tier de plano.
          </p>
        </div>

        {!unitId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            Selecione exatamente uma unidade no filtro lateral para visualizar o split de receita.
          </div>
        )}

        {/* ── KPIs de configuração ─────────────────────────────────────── */}
        {splitData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Taxa Plataforma Atlas"
              value={PCT.format(splitData.platform_fee_pct)}
              sub="% da receita bruta retida pela Atlas"
            />
            <MetricCard
              label="Comissão de Indicação"
              value={PCT.format(splitData.referral_commission_pct)}
              sub="% sobre receita do franqueado ao indicar novo PT"
            />
            {totals && (
              <>
                <MetricCard
                  label="Receita Franqueado (total)"
                  value={formatBrl(totals.franchisee_revenue)}
                  sub="Receita acumulada do franqueado no período"
                />
                <MetricCard
                  label="Receita Plataforma (total)"
                  value={formatBrl(totals.platform_revenue)}
                  sub="Receita acumulada da Atlas no período"
                />
              </>
            )}
          </div>
        )}

        {/* ── Tabela de Split por Período ──────────────────────────────── */}
        {unitId && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Split de Receita por Período</h3>
            </div>
            {isLoading ? (
              <ChartSkeleton />
            ) : splitData?.periods.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Período', 'Receita Bruta', 'Franqueado', 'Plataforma Atlas', 'Comissão Indicação'].map(
                        (h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {splitData.periods.map((row: RevenueSplitPeriod) => (
                      <tr key={row.period} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{row.period}</td>
                        <td className="px-4 py-2.5 text-gray-900">{formatBrl(row.gross_revenue)}</td>
                        <td className="px-4 py-2.5 text-emerald-700 font-medium">{formatBrl(row.franchisee_revenue)}</td>
                        <td className="px-4 py-2.5 text-blue-700 font-medium">{formatBrl(row.platform_revenue)}</td>
                        <td className="px-4 py-2.5 text-amber-700">{formatBrl(row.referral_commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr className="font-semibold">
                        <td className="px-4 py-3 text-gray-700">TOTAL</td>
                        <td className="px-4 py-3">{formatBrl(totals.gross_revenue)}</td>
                        <td className="px-4 py-3 text-emerald-700">{formatBrl(totals.franchisee_revenue)}</td>
                        <td className="px-4 py-3 text-blue-700">{formatBrl(totals.platform_revenue)}</td>
                        <td className="px-4 py-3 text-amber-700">{formatBrl(totals.referral_commission)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum dado de receita disponível para esta versão.
              </div>
            )}
          </div>
        )}

        {/* ── Tabela de Benefícios por Plano ──────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Benefícios por Tier de Plano</h3>
            <p className="text-xs text-gray-400 mt-0.5">Kit mensal, seguro e bônus sobre horas extras por categoria de PT</p>
          </div>
          {plansLoading ? (
            <ChartSkeleton />
          ) : servicePlans.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Plano', 'Preço/hora', 'Mix Alvo', 'Kit Mensal', 'Seguro', 'Bônus Extra'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {servicePlans.map((plan) => {
                    const tier = (plan as unknown as { benefit_tier?: { monthly_kit_value: number; insurance_value: number; bonus_pct_on_extra: number } }).benefit_tier;
                    return (
                      <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{plan.name}</td>
                        <td className="px-4 py-2.5 text-gray-700">{formatBrl(plan.price_per_hour)}/h</td>
                        <td className="px-4 py-2.5 text-gray-600">{PCT.format(plan.target_mix_pct)}</td>
                        <td className="px-4 py-2.5">{tier ? formatBrl(tier.monthly_kit_value) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5">{tier ? formatBrl(tier.insurance_value) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5">{tier ? PCT.format(tier.bonus_pct_on_extra) : <span className="text-gray-300">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum plano de serviço cadastrado para este negócio.
            </div>
          )}
        </div>

      </div>
    </>
  );
}
