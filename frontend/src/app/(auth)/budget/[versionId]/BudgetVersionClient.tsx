'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { assumptionsApi, versionsApi, calculationsApi, financingContractsApi } from '@/lib/api';
import type { AssumptionValue, FinancingContract, AssumptionDefinition } from '@/types/api';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/Spinner';
import { formatPeriod, getErrorMessage } from '@/lib/utils';
import { Save, PlayCircle, ChevronDown, ChevronRight, Plus, Trash2, TrendingUp, Zap } from 'lucide-react';

// ── Gera lista de períodos entre dois meses ────────────────────────────────────
function generatePeriods(start: string, end: string): string[] {
  const periods: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return periods;
}

// ── Adiciona N meses a um "YYYY-MM" string ───────────────────────────────────
function addMonths(yyyymm: string, n: number): string {
  const [sy, sm] = yyyymm.split('-').map(Number);
  let y = sy, m = sm + n;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ── Computa valor expandido pelo growth_rule (client-side preview) ─────────────
function computeAutoValue(
  def: AssumptionDefinition,
  baseValue: number,
  period: string,
  allPeriods: string[],
): number {
  const rule = def.growth_rule;
  if (!rule || !allPeriods.length) return baseValue;

  if (rule.type === 'compound_growth') {
    const rate = rule.rate ?? 0;
    const baseYear = parseInt(allPeriods[0].slice(0, 4));
    const year = parseInt(period.slice(0, 4));
    return baseValue * Math.pow(1 + rate, Math.max(0, year - baseYear));
  }
  if (rule.type === 'curve') {
    const values = rule.values ?? [];
    if (!values.length) return baseValue;
    const idx = allPeriods.indexOf(period);
    const yearIdx = idx >= 0 ? Math.floor(idx / 12) : 0;
    return values[Math.min(yearIdx, values.length - 1)];
  }
  return baseValue;
}

// ── Formata label resumido da growth_rule ─────────────────────────────────────
function growthRuleLabel(rule: AssumptionDefinition['growth_rule']): string | null {
  if (!rule) return null;
  if (rule.type === 'compound_growth' && rule.rate != null)
    return `+${(rule.rate * 100).toFixed(0)}% a.a.`;
  if (rule.type === 'curve') return 'curva';
  return null;
}

export default function BudgetVersionClient() {
  const { versionId } = useParams<{ versionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [showAddContract, setShowAddContract] = useState(false);
  const [newContract, setNewContract] = useState({
    name: '',
    financed_amount: 0,
    monthly_rate: 0,
    term_months: 0,
    grace_period_months: 0,
    down_payment_pct: 0,
  });

  // Dados
  const { data: version, isLoading: loadingVersion } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => versionsApi.get(versionId),
  });

  const { data: categories } = useQuery({
    queryKey: ['assumption-categories'],
    queryFn: assumptionsApi.categories,
  });

  const { data: definitions } = useQuery({
    queryKey: ['assumption-definitions'],
    queryFn: () => assumptionsApi.definitions(),
  });

  const { data: values, isLoading: loadingValues } = useQuery({
    queryKey: ['assumption-values', versionId],
    queryFn: () => assumptionsApi.values(versionId),
  });

  const { data: contracts } = useQuery({
    queryKey: ['financing-contracts', versionId],
    queryFn: () => financingContractsApi.list(versionId),
  });

  const addContractMutation = useMutation({
    mutationFn: () =>
      financingContractsApi.create({ ...newContract, budget_version_id: versionId, sort_order: (contracts?.length ?? 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contracts', versionId] });
      setShowAddContract(false);
      setNewContract({ name: '', financed_amount: 0, monthly_rate: 0, term_months: 0, grace_period_months: 0, down_payment_pct: 0 });
      setToast('Contrato adicionado!');
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => financingContractsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contracts', versionId] });
      setToast('Contrato removido.');
      setTimeout(() => setToast(''), 3000);
    },
  });

  // ── Horizonte completo: 10 anos a partir do início (não usa horizon_end do DB) ──
  const allPeriods = useMemo(() => {
    if (!version?.horizon_start) return [];
    const horizonYears = version.projection_horizon_years ?? 10;
    const end = addMonths(version.horizon_start, horizonYears * 12 - 1);
    return generatePeriods(version.horizon_start, end);
  }, [version]);

  // Anos disponíveis para navegação
  const availableYears = useMemo(
    () => [...new Set(allPeriods.map((p) => p.slice(0, 4)))],
    [allPeriods],
  );

  const activeYear = selectedYear || availableYears[0] || '';

  // Períodos visíveis (12 meses do ano selecionado)
  const visiblePeriods = useMemo(
    () => allPeriods.filter((p) => p.startsWith(activeYear)),
    [allPeriods, activeYear],
  );

  // Map valores: "code::period" → value; "code::static" para period_date=null
  const valueMap = useMemo(() => {
    const m: Record<string, number> = {};
    values?.forEach((v) => {
      const key = `${v.code}::${v.period_date ?? 'static'}`;
      m[key] = v.numeric_value ?? 0;
    });
    return m;
  }, [values]);

  // Valores base por definição (static > primeiro período > default)
  const baseValues = useMemo(() => {
    const result: Record<string, number> = {};
    definitions?.forEach((def) => {
      result[def.code] =
        valueMap[`${def.code}::static`] ??
        (allPeriods[0] ? valueMap[`${def.code}::${allPeriods[0]}`] : undefined) ??
        (typeof def.default_value === 'number' ? def.default_value : 0);
    });
    return result;
  }, [definitions, valueMap, allPeriods]);

  // Valores auto-expandidos pelo growth_rule (preview client-side)
  const autoValues = useMemo(() => {
    const result: Record<string, number> = {};
    if (!definitions || !allPeriods.length) return result;
    definitions.forEach((def) => {
      if (!def.growth_rule) return;
      const base = baseValues[def.code] ?? 0;
      allPeriods.forEach((p) => {
        result[`${def.code}::${p}`] = computeAutoValue(def, base, p, allPeriods);
      });
    });
    return result;
  }, [definitions, baseValues, allPeriods]);

  type CellInfo = { value: number; isAuto: boolean };

  const getCellValue = useCallback(
    (code: string, period: string, periodicity?: string): CellInfo => {
      // Premissas estáticas usam sempre a chave 'static'
      if (periodicity === 'static') {
        const k = `${code}::static`;
        if (k in pendingChanges) return { value: pendingChanges[k], isAuto: false };
        if (k in valueMap) return { value: valueMap[k], isAuto: false };
        // Fallback ao auto/default
        const autoKey = `${code}::${period}`;
        if (autoKey in autoValues) return { value: autoValues[autoKey], isAuto: true };
        return { value: baseValues[code] ?? 0, isAuto: true };
      }

      const pendKey = `${code}::${period}`;
      if (pendKey in pendingChanges) return { value: pendingChanges[pendKey], isAuto: false };
      if (pendKey in valueMap) return { value: valueMap[pendKey], isAuto: false };
      const staticKey = `${code}::static`;
      if (staticKey in pendingChanges) return { value: pendingChanges[staticKey], isAuto: false };
      if (staticKey in valueMap) return { value: valueMap[staticKey], isAuto: false };
      if (pendKey in autoValues) return { value: autoValues[pendKey], isAuto: true };
      return { value: baseValues[code] ?? 0, isAuto: true };
    },
    [pendingChanges, valueMap, autoValues, baseValues],
  );

  // Para defs estáticas: editar qualquer célula atualiza o valor estático global
  const handleCellChange = (code: string, period: string, raw: string, periodicity?: string) => {
    const num = parseFloat(raw.replace(',', '.'));
    if (!isNaN(num)) {
      const key = periodicity === 'static' ? `${code}::static` : `${code}::${period}`;
      setPendingChanges((prev) => ({ ...prev, [key]: num }));
    }
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  // Bulk upsert — salva apenas mudanças pendentes
  const handleSave = async () => {
    if (!definitions || !values) return;
    setSaving(true);
    try {
      const updates: Partial<AssumptionValue>[] = Object.entries(pendingChanges).map(([key, num]) => {
        const [code, period] = key.split('::');
        const def = definitions.find((d) => d.code === code);
        return {
          assumption_definition_id: def?.id ?? '',
          code,
          period_date: period === 'static' ? undefined : period,
          numeric_value: num,
          source_type: 'manual' as const,
        };
      });
      await assumptionsApi.bulkUpsert(versionId, updates);
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['assumption-values', versionId] });
      setToast('Premissas salvas!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(`Erro: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Recalcular
  const recalcMutation = useMutation({
    mutationFn: () => calculationsApi.recalculate(versionId),
    onSuccess: (data) => {
      setToast(`Calculado: ${data.periods_calculated} períodos`);
      setTimeout(() => setToast(''), 3000);
      router.push(`/results/${versionId}`);
    },
    onError: (err) => setToast(`Erro: ${getErrorMessage(err)}`),
  });

  if (loadingVersion || loadingValues) return <LoadingScreen />;
  if (!version) return <div className="p-8 text-red-500">Versão não encontrada</div>;

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <>
      <Topbar title={`Orçamento — ${version.name}`} />
      <div className="flex-1 flex flex-col p-6">
        {/* Header da versão */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={version.status} />
            <span className="text-sm text-gray-500">
              {version.horizon_start} → {version.horizon_end}
              <span className="ml-2 text-gray-400">({availableYears.length} anos · {allPeriods.length} meses)</span>
            </span>
            {hasChanges && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {Object.keys(pendingChanges).length} alteração(ões) não salvas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button size="sm" onClick={() => recalcMutation.mutate()} loading={recalcMutation.isPending}>
              <PlayCircle className="h-4 w-4" /> Recalcular
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
            {toast}
          </div>
        )}

        {/* Legenda */}
        <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            Editado manualmente
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
            <Zap className="h-2.5 w-2.5 text-blue-400" />
            Auto-expandido (growth_rule)
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Regra de crescimento ativa
          </span>
        </div>

        {/* Navegação por ano */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                yr === activeYear
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Tabela de premissas para o ano selecionado */}
        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[240px]">
                  Premissa
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-400 min-w-[50px] whitespace-nowrap">
                  Regra
                </th>
                {visiblePeriods.map((p) => (
                  <th key={p} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 min-w-[90px] whitespace-nowrap">
                    {formatPeriod(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories
                ?.sort((a, b) => a.display_order - b.display_order)
                .map((cat) => {
                  const catDefs = definitions
                    ?.filter((d) => d.category_id === cat.id)
                    .sort((a, b) => a.display_order - b.display_order) ?? [];

                  if (catDefs.length === 0) return null;
                  const collapsed = collapsedCategories.has(cat.id);

                  return [
                    // Linha de categoria
                    <tr
                      key={`cat-${cat.id}`}
                      className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <td className="px-4 py-2 sticky left-0 bg-inherit" colSpan={visiblePeriods.length + 2}>
                        <div className="flex items-center gap-2">
                          {collapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{cat.name}</span>
                        </div>
                      </td>
                    </tr>,
                    // Linhas das definições
                    ...(collapsed ? [] : catDefs.map((def) => (
                      <tr key={def.id} className="border-b border-gray-50 hover:bg-blue-50/30 group">
                        <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">{def.name}</span>
                            {def.unit_of_measure && (
                              <span className="text-xs text-gray-400">({def.unit_of_measure})</span>
                            )}
                            {def.periodicity === 'static' && (
                              <span className="text-xs bg-gray-100 text-gray-400 px-1 rounded">fixo</span>
                            )}
                          </div>
                        </td>
                        {/* Coluna da regra de crescimento */}
                        <td className="px-1 py-1 text-center">
                          {def.growth_rule ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium whitespace-nowrap">
                              <TrendingUp className="h-2.5 w-2.5" />
                              {growthRuleLabel(def.growth_rule)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        {visiblePeriods.map((period) => {
                          const { value: val, isAuto } = getCellValue(def.code, period, def.periodicity);
                          const pendKey = def.periodicity === 'static'
                            ? `${def.code}::static`
                            : `${def.code}::${period}`;
                          const changed = pendKey in pendingChanges;
                          return (
                            <td key={period} className="px-1 py-1 text-center">
                              <input
                                type="number"
                                step="any"
                                defaultValue={val}
                                key={`${def.code}::${period}::${val}`}
                                onChange={(e) => handleCellChange(def.code, period, e.target.value, def.periodicity)}
                                title={isAuto && def.growth_rule ? `Auto: ${growthRuleLabel(def.growth_rule)}` : undefined}
                                className={`
                                  w-full text-right text-xs px-2 py-1 rounded border
                                  focus:outline-none focus:ring-1 focus:ring-brand-400
                                  ${changed
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : isAuto
                                      ? 'bg-blue-50/40 border-transparent text-blue-500 italic cursor-text'
                                      : 'bg-transparent border-transparent hover:border-gray-300 text-gray-600'
                                  }
                                `}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))),
                  ];
                })}
            </tbody>
          </table>
        </div>

        {/* Contratos de Financiamento */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Contratos de Financiamento</h2>
            <Button variant="secondary" size="sm" onClick={() => setShowAddContract(!showAddContract)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {showAddContract && (
            <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50 grid grid-cols-3 gap-3">
              <input
                className="col-span-3 rounded border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Nome do contrato (ex: Imóvel FINAME)"
                value={newContract.name}
                onChange={(e) => setNewContract((p) => ({ ...p, name: e.target.value }))}
              />
              <label className="text-xs text-gray-500">
                Valor financiado (R$)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.financed_amount}
                  onChange={(e) => setNewContract((p) => ({ ...p, financed_amount: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Taxa mensal (ex: 0.012)
                <input type="number" step="0.001" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.monthly_rate}
                  onChange={(e) => setNewContract((p) => ({ ...p, monthly_rate: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Prazo (meses)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.term_months}
                  onChange={(e) => setNewContract((p) => ({ ...p, term_months: parseInt(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Carência (meses)
                <input type="number" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.grace_period_months}
                  onChange={(e) => setNewContract((p) => ({ ...p, grace_period_months: parseInt(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-gray-500">
                Entrada (% — ex: 0.20)
                <input type="number" step="0.01" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={newContract.down_payment_pct}
                  onChange={(e) => setNewContract((p) => ({ ...p, down_payment_pct: parseFloat(e.target.value) || 0 }))}
                />
              </label>
              <div className="col-span-3 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddContract(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => addContractMutation.mutate()} loading={addContractMutation.isPending}
                  disabled={!newContract.name}>
                  Salvar contrato
                </Button>
              </div>
            </div>
          )}

          {contracts && contracts.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nome</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Valor Financiado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Taxa Mensal</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Prazo</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Carência</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Entrada</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c: FinancingContract) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {c.financed_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.term_months === 0 ? '—' : `${(c.monthly_rate * 100).toFixed(2)}% a.m.`}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.term_months === 0 ? 'Pagamento único' : `${c.term_months} meses`}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{c.grace_period_months}m</td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {c.down_payment_pct > 0 ? `${(c.down_payment_pct * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteContractMutation.mutate(c.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Nenhum contrato cadastrado. O motor usará as premissas de financiamento legadas.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
