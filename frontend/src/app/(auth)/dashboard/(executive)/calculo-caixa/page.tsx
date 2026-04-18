'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardFilters } from '@/store/dashboard';
import { NoFiltersState } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { assumptionsApi, dashboardApi, unitsApi, versionsApi } from '@/lib/api';
import { Wallet, TrendingDown, Table2, Building2, FlameKindling, Save, Info } from 'lucide-react';

type CashControls = {
  mesesBurnSemReceita: number;
  mesesComReceita: number;
};

const DEFAULT_CONTROLS: CashControls = {
  mesesBurnSemReceita: 3,
  mesesComReceita: 9,
};

const BURN_NO_REVENUE_CODE = 'caixa_meses_burn_sem_receita';
const BURN_WITH_REVENUE_CODE = 'caixa_meses_com_receita';

const STATUS_PRIORITY: Record<string, number> = { published: 0, draft: 1, planning: 2 };

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function CalculoCaixaPage() {
  const { businessId, scenarioId, selectedUnitIds } = useDashboardFilters();
  const queryClient = useQueryClient();
  const [controls, setControls] = useState<CashControls>(DEFAULT_CONTROLS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const { data: units = [] } = useQuery({
    queryKey: ['units-calculo-caixa', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  const laboratorioUnit = useMemo(
    () => units.find((u) => normalizeLabel(u.name).includes('laboratorio')),
    [units],
  );

  const sourceUnitId = laboratorioUnit?.id ?? (selectedUnitIds.length === 1 ? selectedUnitIds[0] : null);

  const { data: sourceVersions = [] } = useQuery({
    queryKey: ['versions-calculo-caixa', sourceUnitId, scenarioId],
    queryFn: () => versionsApi.list(sourceUnitId!, scenarioId!),
    enabled: !!sourceUnitId && !!scenarioId,
  });

  const activeVersion = useMemo(
    () => [...sourceVersions]
      .filter((v) => v.is_active)
      .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))[0],
    [sourceVersions],
  );

  const { data: dreData } = useQuery({
    queryKey: ['dre-calculo-caixa', activeVersion?.id],
    queryFn: () => dashboardApi.dre(activeVersion!.id),
    enabled: !!activeVersion,
  });

  const { data: assumptionValues = [] } = useQuery({
    queryKey: ['assumption-values-calculo-caixa', activeVersion?.id],
    queryFn: () => assumptionsApi.values(activeVersion!.id),
    enabled: !!activeVersion,
  });

  const { data: assumptionDefinitions = [] } = useQuery({
    queryKey: ['assumption-definitions-calculo-caixa', businessId],
    queryFn: () => assumptionsApi.definitions(undefined, businessId!),
    enabled: !!businessId,
  });

  const dre12m = useMemo(
    () => [...(dreData?.dre ?? [])].sort((a, b) => a.period.localeCompare(b.period)).slice(0, 12),
    [dreData?.dre],
  );

  function getValue(items: Array<{ code: string; value: number }>, code: string): number {
    return Math.abs(items.find((item) => item.code === code)?.value ?? 0);
  }

  const dreBase12m = useMemo(() => {
    if (!dre12m.length) return null;
    const avg = (code: string) => dre12m
      .map((period) => getValue(period.items, code))
      .reduce((acc, value) => acc + value, 0) / dre12m.length;

    return {
      meses: dre12m.length,
      faturamentoMensal: avg('revenue_total'),
      custoVariavelMensal: avg('total_variable_costs'),
      custoFixoMensal: avg('total_fixed_costs'),
      firstPeriod: dre12m[0]?.period,
      lastPeriod: dre12m[dre12m.length - 1]?.period,
      rows: dre12m.map((period) => {
        const receita = getValue(period.items, 'revenue_total');
        const variavel = getValue(period.items, 'total_variable_costs');
        const fixo = getValue(period.items, 'total_fixed_costs');
        const resultado = receita - (variavel + fixo);
        return { period: period.period, receita, variavel, fixo, resultado };
      }),
    };
  }, [dre12m]);

  const calc = useMemo(() => {
    const faturamentoMensal = dreBase12m?.faturamentoMensal ?? 0;
    const custoVariavelMensal = dreBase12m?.custoVariavelMensal ?? 0;
    const custoFixoMensal = dreBase12m?.custoFixoMensal ?? 0;
    const custosTotais = Math.max(0, custoVariavelMensal) + Math.max(0, custoFixoMensal);
    const resultadoMensal = faturamentoMensal - custosTotais;
    // Burn = prejuízo médio mensal (resultado negativo); zero se resultado for positivo
    const burnMensal = Math.max(0, -resultadoMensal);

    const caixaNecessarioBurn = burnMensal * Math.max(controls.mesesBurnSemReceita, 0);
    const caixaNecessarioComReceita = burnMensal * Math.max(controls.mesesComReceita, 0);
    // Capital total = burn × meses_sem_receita + burn × meses_com_receita (soma, não max)
    const caixaNecessarioRecomendado = caixaNecessarioBurn + caixaNecessarioComReceita;

    return {
      faturamentoMensal,
      custoVariavelMensal,
      custoFixoMensal,
      custosTotais,
      resultadoMensal,
      burnMensal,
      caixaNecessarioBurn,
      caixaNecessarioComReceita,
      caixaNecessarioRecomendado,
    };
  }, [controls, dreBase12m]);

  const capitalGiroAssumption = useMemo(
    () => assumptionValues.find((v) => v.code === 'capital_giro_inicial' && !v.period_date),
    [assumptionValues],
  );

  useEffect(() => {
    const burnNoRevenue = assumptionValues.find((v) => v.code === BURN_NO_REVENUE_CODE && !v.period_date)?.numeric_value;
    const burnWithRevenue = assumptionValues.find((v) => v.code === BURN_WITH_REVENUE_CODE && !v.period_date)?.numeric_value;
    if (burnNoRevenue == null && burnWithRevenue == null) return;

    setControls((prev) => ({
      mesesBurnSemReceita: burnNoRevenue != null ? Number(burnNoRevenue) : prev.mesesBurnSemReceita,
      mesesComReceita: burnWithRevenue != null ? Number(burnWithRevenue) : prev.mesesComReceita,
    }));
  }, [assumptionValues]);

  const saveBurnParamsMutation = useMutation({
    mutationFn: async () => {
      if (!activeVersion || !businessId) return;

      const ensureDefinitionId = async (code: string, name: string) => {
        const existing = assumptionDefinitions.find((d) => d.code === code);
        if (existing) return existing.id;

        const created = await assumptionsApi.quickAdd({
          budget_version_id: activeVersion.id,
          business_id: businessId,
          name,
          value: 0,
          category_code: 'CAPEX',
          data_type: 'integer',
          include_in_dre: false,
        });
        return created.definition_id;
      };

      const burnNoRevenueDefinitionId = await ensureDefinitionId(
        BURN_NO_REVENUE_CODE,
        BURN_NO_REVENUE_CODE,
      );
      const burnWithRevenueDefinitionId = await ensureDefinitionId(
        BURN_WITH_REVENUE_CODE,
        BURN_WITH_REVENUE_CODE,
      );

      await assumptionsApi.bulkUpsert(activeVersion.id, [
        {
          assumption_definition_id: burnNoRevenueDefinitionId,
          code: BURN_NO_REVENUE_CODE,
          period_date: undefined,
          numeric_value: Math.max(0, controls.mesesBurnSemReceita),
          source_type: 'manual',
        },
        {
          assumption_definition_id: burnWithRevenueDefinitionId,
          code: BURN_WITH_REVENUE_CODE,
          period_date: undefined,
          numeric_value: Math.max(0, controls.mesesComReceita),
          source_type: 'manual',
        },
      ]);
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('done');
      if (activeVersion) {
        queryClient.invalidateQueries({ queryKey: ['assumption-values-calculo-caixa', activeVersion.id] });
      }
      if (businessId) {
        queryClient.invalidateQueries({ queryKey: ['assumption-definitions-calculo-caixa', businessId] });
      }
    },
    onError: () => setSaveStatus('error'),
  });

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Cálculo de Caixa" />
        <div className="p-6">
          <NoFiltersState message="Selecione negócio e cenário para visualizar o cálculo de caixa." />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Cálculo de Caixa" />
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Cálculo de Caixa Necessário</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Base: DRE dos 12 primeiros meses ·{' '}
                {laboratorioUnit ? laboratorioUnit.name : 'sem unidade Laboratório'}
                {dreBase12m && ` · ${dreBase12m.firstPeriod} → ${dreBase12m.lastPeriod}`}
              </p>
            </div>
          </div>
          {dreBase12m && (
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <Building2 className="h-3.5 w-3.5" />
              {formatNumber(dreBase12m.meses, 0)} meses carregados
            </span>
          )}
        </div>

        {!dreBase12m && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Não foi possível montar a base DRE de 12 meses para o Laboratório neste cenário.
          </div>
        )}

        {dreBase12m && (
          <>
            {/* ── PASSO 1 — Tabela DRE (fonte dos dados) ───────────────── */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Table2 className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-gray-700">1. DRE — Laboratório (12 meses)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Período</th>
                      <th className="px-4 py-2 text-right">Receita</th>
                      <th className="px-4 py-2 text-right">Custo Variável</th>
                      <th className="px-4 py-2 text-right">Custo Fixo</th>
                      <th className="px-4 py-2 text-right font-bold text-slate-700">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dreBase12m.rows.map((row) => (
                      <tr key={row.period} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 text-slate-700 font-medium tabular-nums">{row.period}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">{formatCurrency(row.receita)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">{formatCurrency(row.variavel)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">{formatCurrency(row.fixo)}</td>
                        <td className={`px-4 py-2 text-right tabular-nums font-semibold ${row.resultado < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(row.resultado)}
                        </td>
                      </tr>
                    ))}
                    {/* linha de média */}
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">Média mensal</td>
                      <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-slate-600">{formatCurrency(calc.faturamentoMensal)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-slate-600">{formatCurrency(calc.custoVariavelMensal)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-slate-600">{formatCurrency(calc.custoFixoMensal)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums text-xs font-bold ${calc.resultadoMensal < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatCurrency(calc.resultadoMensal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── PASSO 2 — Burn derivado ───────────────────────────────── */}
            <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <FlameKindling className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold text-rose-800">2. Burn médio mensal (calculado do DRE)</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[11px] text-rose-600 uppercase tracking-wide font-semibold mb-0.5">Resultado médio / mês</p>
                  <p className={`text-xl font-extrabold tabular-nums ${calc.resultadoMensal < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatCurrency(calc.resultadoMensal)}
                  </p>
                </div>
                <div className="text-rose-400 text-lg font-light">→</div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[11px] text-rose-600 uppercase tracking-wide font-semibold mb-0.5">Burn = max(0, −resultado)</p>
                  <p className="text-xl font-extrabold text-rose-700 tabular-nums">
                    {formatCurrency(calc.burnMensal)}<span className="text-sm font-normal text-rose-500">/mês</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-rose-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Burn é zero quando o resultado médio for positivo (negócio já sustentável).
              </p>
            </section>

            {/* ── PASSO 3 — Parâmetros (editável) ─────────────────────── */}
            <section className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">3. Quantos meses de caixa você precisa?</span>
                <button
                  type="button"
                  onClick={() => saveBurnParamsMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-800 disabled:opacity-60"
                  disabled={saveBurnParamsMutation.isPending || !activeVersion}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveBurnParamsMutation.isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Meses iniciais sem receita</span>
                  <p className="text-[11px] text-slate-400 mb-1">Período pré-abertura / ramp-up zero</p>
                  <input
                    type="number"
                    step="1"
                    min={0}
                    value={controls.mesesBurnSemReceita}
                    onChange={(e) => setControls((p) => ({ ...p, mesesBurnSemReceita: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Meses seguintes com receita</span>
                  <p className="text-[11px] text-slate-400 mb-1">Período com receita, mas ainda negativo</p>
                  <input
                    type="number"
                    step="1"
                    min={0}
                    value={controls.mesesComReceita}
                    onChange={(e) => setControls((p) => ({ ...p, mesesComReceita: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </label>
              </div>

              {saveStatus === 'done' && (
                <p className="mt-2 text-xs text-emerald-600">Parâmetros salvos. Recalcule o orçamento para atualizar o capital de giro.</p>
              )}
              {saveStatus === 'error' && (
                <p className="mt-2 text-xs text-red-600">Falha ao salvar parâmetros.</p>
              )}
            </section>

            {/* ── PASSO 4 — Resultado / decomposição ──────────────────── */}
            <section className="rounded-2xl border border-emerald-300 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">4. Capital de giro necessário</p>
                <p className="text-3xl font-extrabold text-emerald-900 tabular-nums mt-1">
                  {formatCurrency(calc.caixaNecessarioRecomendado)}
                </p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {/* linha do cálculo */}
                <div className="flex items-center gap-3 flex-wrap text-sm tabular-nums">
                  <span className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-800 font-semibold whitespace-nowrap">
                    {formatCurrency(calc.burnMensal)}<span className="font-normal text-rose-500">/mês</span>
                  </span>
                  <span className="text-slate-400">×</span>
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-slate-700 font-semibold whitespace-nowrap">
                    {controls.mesesBurnSemReceita} meses sem receita
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="font-bold text-slate-800">{formatCurrency(calc.caixaNecessarioBurn)}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-sm tabular-nums">
                  <span className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-800 font-semibold whitespace-nowrap">
                    {formatCurrency(calc.burnMensal)}<span className="font-normal text-rose-500">/mês</span>
                  </span>
                  <span className="text-slate-400">×</span>
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-slate-700 font-semibold whitespace-nowrap">
                    {controls.mesesComReceita} meses com receita
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="font-bold text-slate-800">{formatCurrency(calc.caixaNecessarioComReceita)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total ({controls.mesesBurnSemReceita + controls.mesesComReceita} meses)</span>
                  <span className="text-base font-extrabold text-emerald-800 tabular-nums">{formatCurrency(calc.caixaNecessarioRecomendado)}</span>
                </div>
              </div>
              {capitalGiroAssumption && Math.abs(capitalGiroAssumption.numeric_value - calc.caixaNecessarioRecomendado) > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-amber-50 text-xs text-amber-700 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    O orçamento ainda grava <strong>{formatCurrency(capitalGiroAssumption.numeric_value)}</strong> (calculado no último recálculo).
                    Recalcule o orçamento para sincronizar com {formatCurrency(calc.caixaNecessarioRecomendado)}.
                  </span>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Metric({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'indigo' | 'amber' | 'sky';
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  } as const;

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
        {icon}
        {title}
      </div>
      <p className="text-lg font-bold mt-1.5 text-gray-900">{value}</p>
    </div>
  );
}
