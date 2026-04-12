'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardFilters } from '@/store/dashboard';
import { NoFiltersState } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { assumptionsApi, dashboardApi, unitsApi, versionsApi } from '@/lib/api';
import { Wallet, CalendarClock, TrendingDown, TrendingUp, Table2, Building2 } from 'lucide-react';

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
    const burnSemReceitaMensal = custosTotais;
    const burnComReceitaSelecionado = Math.max(0, -resultadoMensal);

    const caixaNecessarioBurn = burnSemReceitaMensal * Math.max(controls.mesesBurnSemReceita, 0);
    const caixaNecessarioComReceita = burnComReceitaSelecionado * Math.max(controls.mesesComReceita, 0);
    const caixaNecessarioRecomendado = Math.max(caixaNecessarioBurn, caixaNecessarioComReceita);

    return {
      faturamentoMensal,
      custoVariavelMensal,
      custoFixoMensal,
      custosTotais,
      resultadoMensal,
      burnSemReceitaMensal,
      burnComReceitaSelecionado,
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
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/15 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Cálculo de Caixa</h2>
                <p className="text-sm text-slate-300 mt-0.5">
                  Base automática pelo DRE dos 12 primeiros meses do Laboratório.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-100">
              <Building2 className="h-3.5 w-3.5" />
              {laboratorioUnit ? `Unidade fonte: ${laboratorioUnit.name}` : 'Sem unidade Laboratório identificada'}
            </div>
          </div>
        </header>

        {dreBase12m ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Base carregada do DRE: {dreBase12m.firstPeriod} a {dreBase12m.lastPeriod} ({formatNumber(dreBase12m.meses, 0)} meses).
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">Capital de giro inicial</p>
                <p className="text-base font-bold mt-0.5">{formatCurrency(capitalGiroAssumption?.numeric_value ?? calc.caixaNecessarioRecomendado)}</p>
              </div>
              <div className="text-xs">
                Gerado automaticamente no recálculo
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Não foi possível montar a base DRE de 12 meses para o Laboratório neste cenário.
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Horizonte de Necessidade de Caixa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-gray-500">
              Faturamento mensal (DRE 12M)
              <input
                type="number"
                step="0.01"
                value={Number(calc.faturamentoMensal.toFixed(2))}
                disabled
                className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-600"
              />
            </label>
            <label className="text-xs text-gray-500">
              Custo variável mensal (DRE 12M)
              <input
                type="number"
                step="0.01"
                value={Number(calc.custoVariavelMensal.toFixed(2))}
                disabled
                className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-600"
              />
            </label>
            <label className="text-xs text-gray-500">
              Custo fixo mensal (DRE 12M)
              <input
                type="number"
                step="0.01"
                value={Number(calc.custoFixoMensal.toFixed(2))}
                disabled
                className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-600"
              />
            </label>
            <label className="text-xs text-gray-500">
              Meses de burn (sem receita)
              <input
                type="number"
                step="1"
                min={0}
                value={controls.mesesBurnSemReceita}
                onChange={(e) => setControls((p) => ({ ...p, mesesBurnSemReceita: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-gray-500">
              Meses considerando receita
              <input
                type="number"
                step="1"
                min={0}
                value={controls.mesesComReceita}
                onChange={(e) => setControls((p) => ({ ...p, mesesComReceita: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => saveBurnParamsMutation.mutate()}
                className="w-full rounded-lg bg-slate-900 text-white text-sm font-semibold px-3 py-2 hover:bg-slate-800 disabled:opacity-60"
                disabled={saveBurnParamsMutation.isPending || !activeVersion}
              >
                {saveBurnParamsMutation.isPending ? 'Salvando...' : 'Salvar parâmetros de burn'}
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            {saveStatus === 'done' && 'Parâmetros salvos. O capital de giro será atualizado automaticamente no próximo recálculo.'}
            {saveStatus === 'error' && 'Falha ao salvar parâmetros de burn.'}
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
            <p className="font-semibold">Fórmula usada:</p>
            <p>Resultado mensal = Faturamento - (Custos variáveis + Custos fixos)</p>
            <p>Burn com receita = max(0, -Resultado mensal)</p>
            <p>Capital de giro inicial é gerado automaticamente quando a versão é recalculada.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Table2 className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-gray-700">Visão DRE - Laboratório (12 primeiros meses)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Período</th>
                  <th className="px-4 py-2 text-right">Receita</th>
                  <th className="px-4 py-2 text-right">Custo Variável</th>
                  <th className="px-4 py-2 text-right">Custo Fixo</th>
                  <th className="px-4 py-2 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dreBase12m?.rows ?? []).map((row) => (
                  <tr key={row.period} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2 text-slate-700 font-medium">{row.period}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatCurrency(row.receita)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatCurrency(row.variavel)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatCurrency(row.fixo)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${row.resultado < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(row.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Resumo do Caixa</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Capital de giro inicial</p>
              <div className="mt-2 flex items-end justify-between gap-3 flex-wrap">
                <p className="text-3xl font-extrabold text-emerald-900 tabular-nums">{formatCurrency(calc.caixaNecessarioRecomendado)}</p>
                <p className="text-xs text-emerald-800">
                  Valor autogerado por max(Burn sem receita, Burn com receita)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <Metric title="Faturamento mensal (DRE)" value={formatCurrency(calc.faturamentoMensal)} icon={<TrendingUp className="h-4 w-4" />} tone="sky" />
              <Metric title="Custos totais" value={formatCurrency(calc.custosTotais)} icon={<TrendingDown className="h-4 w-4" />} tone="amber" />
              <Metric title="Resultado mensal" value={formatCurrency(calc.resultadoMensal)} icon={<TrendingUp className="h-4 w-4" />} tone={calc.resultadoMensal < 0 ? 'rose' : 'emerald'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
                  <CalendarClock className="h-4 w-4" />
                  Cenário sem receita
                </div>
                <p className="mt-2 text-sm text-rose-900">Burn mensal: <span className="font-bold tabular-nums">{formatCurrency(calc.burnSemReceitaMensal)}</span></p>
                <p className="mt-1 text-sm text-rose-900">Caixa necessário: <span className="font-bold tabular-nums">{formatCurrency(calc.caixaNecessarioBurn)}</span></p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <TrendingDown className="h-4 w-4" />
                  Cenário com receita
                </div>
                <p className="mt-2 text-sm text-amber-900">Burn mensal: <span className="font-bold tabular-nums">{formatCurrency(calc.burnComReceitaSelecionado)}</span></p>
                <p className="mt-1 text-sm text-amber-900">Caixa necessário: <span className="font-bold tabular-nums">{formatCurrency(calc.caixaNecessarioComReceita)}</span></p>
              </div>
            </div>
          </div>
        </section>
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
