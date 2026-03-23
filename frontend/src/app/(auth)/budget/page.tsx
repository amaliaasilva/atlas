'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { unitsApi, versionsApi, scenariosApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/dashboard/EmptyState';
import type { BudgetVersion, Unit, Scenario } from '@/types/api';
import { FileSpreadsheet, Plus, ChevronRight, MapPin, Calendar, Lock, Edit3, Archive, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  draft:     { label: 'Rascunho',  icon: <Edit3   className="h-3.5 w-3.5" />, cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publicado', icon: <Lock    className="h-3.5 w-3.5" />, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  archived:  { label: 'Arquivado', icon: <Archive className="h-3.5 w-3.5" />, cls: 'bg-amber-50 text-amber-600 border border-amber-200' },
};

function formatDateBr(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Modal: Criar Nova Versão ──────────────────────────────────────────────────

interface CreateVersionModalProps {
  units: Unit[];
  scenarios: Scenario[];
  onClose: () => void;
  onCreated: (versionId: string, scenarioId: string) => void;
}

function CreateVersionModal({ units, scenarios, onClose, onCreated }: CreateVersionModalProps) {
  const queryClient = useQueryClient();
  const activeUnits = units.filter((u) => u.status !== 'closed');

  const [unitId, setUnitId] = useState(activeUnits[0]?.id ?? '');
  const [scenId, setScenId] = useState(scenarios[0]?.id ?? '');
  const [versionName, setVersionName] = useState('');
  const [horizonStart, setHorizonStart] = useState('');

  // Auto-populate opening date and name when unit/scenario changes
  useEffect(() => {
    const unit = units.find((u) => u.id === unitId);
    const scen = scenarios.find((s) => s.id === scenId);
    if (unit?.opening_date) {
      const d = new Date(unit.opening_date);
      setHorizonStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (unit && scen && !versionName) {
      setVersionName(`Orçamento ${scen.name} — ${unit.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, scenId]);

  const mutation = useMutation({
    mutationFn: () =>
      versionsApi.create({
        unit_id: unitId,
        scenario_id: scenId,
        name: versionName || `Orçamento — ${new Date().toLocaleDateString('pt-BR')}`,
        horizon_start: horizonStart || getCurrentYearMonth(),
        status: 'draft',
        projection_horizon_years: 10,
      } as Partial<BudgetVersion>),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      onCreated(newVersion.id, scenId);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nova Versão de Orçamento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Select
            label="Unidade"
            value={unitId}
            onChange={(e) => { setUnitId(e.target.value); setVersionName(''); }}
            options={activeUnits.map((u) => ({ value: u.id, label: `${u.name} (${u.code})` }))}
          />
          <Select
            label="Cenário"
            value={scenId}
            onChange={(e) => { setScenId(e.target.value); setVersionName(''); }}
            options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input
            label="Nome da versão"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Ex: Orçamento Agressivo — Laboratório"
          />
          <Input
            label="Início do horizonte (YYYY-MM)"
            value={horizonStart}
            onChange={(e) => setHorizonStart(e.target.value)}
            placeholder="Ex: 2026-01"
            hint="Padrão: data de abertura da unidade"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!unitId || !scenId}
          >
            <Plus className="h-4 w-4" /> Criar Versão
          </Button>
        </div>
        {mutation.isError && (
          <p className="px-6 pb-4 text-xs text-red-500">
            Erro ao criar versão. Verifique os dados e tente novamente.
          </p>
        )}
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { businessId, setScenario, setVersion } = useNavStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('all');
  const [openingDrafts, setOpeningDrafts] = useState<Record<string, string>>({});

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  useEffect(() => {
    // O filtro padrão de Orçamentos deve mostrar todos os cenários para evitar confusão.
    setSelectedScenarioId('all');
  }, [businessId]);

  useEffect(() => {
    const urlScenarioId = searchParams.get('scenario_id');
    if (urlScenarioId) setSelectedScenarioId(urlScenarioId);
  }, [searchParams]);

  const updateOpeningDateMutation = useMutation({
    mutationFn: ({ unitId, openingDate }: { unitId: string; openingDate: string }) =>
      unitsApi.update(unitId, { opening_date: openingDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', businessId] });
    },
  });

  // Buscar versões de TODAS as unidades ativas em paralelo
  const activeUnits = units.filter((u) => u.status !== 'closed');

  const versionsQueries = useQueries({
    queries: activeUnits.map((u) => ({
      queryKey: ['versions', u.id, selectedScenarioId],
      queryFn: () => versionsApi.list(u.id, selectedScenarioId === 'all' ? undefined : selectedScenarioId),
      enabled: !!u.id,
    })),
  });

  const isLoadingVersions = versionsQueries.some((q) => q.isLoading);

  // Montar estrutura: unidade → versões
  const unitRows = activeUnits.map((unit, i) => {
    const versions: BudgetVersion[] = versionsQueries[i]?.data ?? [];
    return { unit, versions };
  });

  const totalVersions = unitRows.reduce((acc, r) => acc + r.versions.length, 0);
  const publishedCount = unitRows.reduce(
    (acc, r) => acc + r.versions.filter((v) => v.status === 'published').length,
    0,
  );
  const draftCount = unitRows.reduce(
    (acc, r) => acc + r.versions.filter((v) => v.status === 'draft').length,
    0,
  );
  const activeUnitsCount = activeUnits.length;
  const today = new Date();
  const orderedOpenings = [...activeUnits]
    .filter((u): u is Unit & { opening_date: string } => !!u.opening_date)
    .sort((a, b) => new Date(a.opening_date).getTime() - new Date(b.opening_date).getTime());
  const nextOpening =
    orderedOpenings.find((u) => new Date(u.opening_date).getTime() >= today.getTime()) ??
    orderedOpenings[orderedOpenings.length - 1];

  if (loadingUnits) return <LoadingScreen />;

  return (
    <>
      {showCreateModal && (
        <CreateVersionModal
          units={units}
          scenarios={scenarios}
          onClose={() => setShowCreateModal(false)}
          onCreated={(vId, sId) => {
            setShowCreateModal(false);
            setScenario(sId);
            setVersion(vId);
            router.push(`/budget/${vId}`);
          }}
        />
      )}
      <Topbar title="Orçamentos" />
      <div className="flex-1 p-6 space-y-6 max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Orçamentos</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Versões de planejamento por unidade e cenário
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" /> Nova Versão
          </Button>
        </div>

        {/* Filtro de cenário — ANTES dos KPIs para que o usuário entenda o escopo dos números */}
        {businessId && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px] flex-1">
                <Select
                  label="Cenário da listagem"
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  options={[
                    { value: 'all', label: 'Todos os cenários' },
                    ...scenarios.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </div>
              <p className="text-xs text-gray-500 pb-1">
                O filtro acima afeta somente esta tela. O contexto global de cenário continua preservado.
              </p>
            </div>
          </div>
        )}

        {/* Resumo KPIs */}
        {totalVersions > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de versões', value: totalVersions, color: 'text-gray-900' },
              { label: 'Publicadas', value: publishedCount, color: 'text-emerald-600' },
              { label: 'Rascunhos', value: draftCount, color: 'text-gray-500' },
              { label: 'Unidades ativas', value: activeUnitsCount, color: 'text-brand-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={cn('text-3xl font-bold tabular-nums', color)}>{value}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {businessId && nextOpening && (
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-cyan-50 to-white px-5 py-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-blue-700">Próxima janela de abertura</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm text-blue-900 font-semibold">
                {nextOpening.code} · {nextOpening.name}
              </p>
              <p className="text-sm text-blue-700 font-medium">{formatDateBr(nextOpening.opening_date)}</p>
            </div>
          </div>
        )}

        {/* Sem contexto */}
        {!businessId && (
          <EmptyState
            icon={<FileSpreadsheet className="h-16 w-16" />}
            title="Selecione um negócio"
            description="Escolha um negócio para visualizar os orçamentos das unidades."
            action={
              <Button variant="secondary" size="sm" onClick={() => router.push('/businesses')}>
                Selecionar Negócio
              </Button>
            }
          />
        )}

        {/* Lista por unidade */}
        {businessId && (
          <div className="space-y-4">
            {isLoadingVersions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
                ))}
              </div>
            ) : unitRows.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-14 w-14" />}
                title="Sem unidades ativas"
                description="Cadastre unidades para começar a criar orçamentos."
                action={
                  <Button variant="secondary" size="sm" onClick={() => router.push('/units')}>
                    Gerenciar Unidades
                  </Button>
                }
              />
            ) : (
              unitRows.map(({ unit, versions }) => (
                <div key={unit.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Cabeçalho da unidade */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                    <div className="h-9 w-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{unit.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{unit.code}</span>
                        {unit.city && <span className="text-xs text-gray-400">· {unit.city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={unit.status} />
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">
                        <Calendar className="h-3 w-3" />
                        <span>Abertura:</span>
                        <input
                          type="date"
                          value={openingDrafts[unit.id] ?? toDateInputValue(unit.opening_date)}
                          onChange={(e) =>
                            setOpeningDrafts((prev) => ({
                              ...prev,
                              [unit.id]: e.target.value,
                            }))
                          }
                          className="h-6 rounded border border-gray-200 px-1.5 text-[11px] text-gray-600"
                        />
                        <button
                          type="button"
                          className="text-brand-600 hover:text-brand-700 disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextDate = openingDrafts[unit.id] ?? toDateInputValue(unit.opening_date);
                            if (!nextDate || nextDate === toDateInputValue(unit.opening_date)) return;
                            updateOpeningDateMutation.mutate({ unitId: unit.id, openingDate: nextDate });
                          }}
                          disabled={updateOpeningDateMutation.isPending}
                          title="Salvar nova data de abertura"
                        >
                          <Save className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-400">{versions.length} versão{versions.length !== 1 ? 'ões' : ''}</span>
                    </div>
                  </div>

                  {/* Versões desta unidade */}
                  {versions.length === 0 ? (
                    <div className="px-5 py-5 text-center">
                      <p className="text-xs text-gray-400 mb-2">Nenhuma versão de orçamento criada.</p>
                      <button
                        onClick={() => router.push(`/scenarios?unit_id=${unit.id}`)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Criar versão →
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {versions.map((version) => {
                        const scenario = scenarios.find((s) => s.id === version.scenario_id);
                        const statusMeta = STATUS_META[version.status] ?? STATUS_META.draft;

                        return (
                          <button
                            key={version.id}
                            onClick={() => {
                              if (scenario) setScenario(scenario.id);
                              setVersion(version.id);
                              router.push(`/budget/${version.id}`);
                            }}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group text-left"
                          >
                            {/* Status icon */}
                            <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', statusMeta.cls)}>
                              {statusMeta.icon}
                              {statusMeta.label}
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 group-hover:text-brand-600 truncate">
                                {version.name}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {scenario && (
                                  <span className="text-xs text-gray-400">
                                    {scenario.name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  {version.horizon_start} → {version.horizon_end}
                                </span>
                              </div>
                            </div>

                            {/* CTA */}
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-400 shrink-0 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
