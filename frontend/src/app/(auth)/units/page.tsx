'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { unitsApi, versionsApi, calculationsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Unit } from '@/types/api';
import { MapPin, ChevronRight, Plus, X, Pencil, Calendar } from 'lucide-react';
import { UnitLifecycleBadge } from '@/components/ui/UnitLifecycleBadge';

const EMPTY_FORM = {
  name: '',
  code: '',
  city: '',
  state: '',
  opening_date: '',
  slots_per_hour: 10,
  hours_open_weekday: 17,
  hours_open_saturday: 7,
};

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'pre_opening', label: 'Pré-abertura' },
  { value: 'active', label: 'Ativa' },
  { value: 'closed', label: 'Encerrada' },
];

function UnitFormFields({
  form,
  setForm,
}: {
  form: Record<string, string | number>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string | number>>>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="atlas-label">Nome da Unidade *</label>
          <input
            className="atlas-input"
            placeholder="Ex: Laboratório"
            value={form.name as string}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="atlas-label">Código *</label>
          <input
            className="atlas-input uppercase"
            placeholder="LAB"
            value={form.code as string}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            required
          />
        </div>
        <div>
          <label className="atlas-label">Status</label>
          <select
            className="atlas-input"
            value={form.status as string}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="atlas-label">Data de Abertura</label>
          <input
            type="date"
            className="atlas-input"
            value={form.opening_date as string}
            onChange={(e) => setForm((f) => ({ ...f, opening_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="atlas-label">Área (m²)</label>
          <input
            type="number"
            className="atlas-input"
            min={0}
            value={form.area_m2 as number || ''}
            onChange={(e) => setForm((f) => ({ ...f, area_m2: +e.target.value }))}
          />
        </div>
        <div>
          <label className="atlas-label">Cidade</label>
          <input
            className="atlas-input"
            placeholder="São Paulo"
            value={form.city as string}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div>
          <label className="atlas-label">Estado</label>
          <input
            className="atlas-input uppercase"
            placeholder="SP"
            maxLength={2}
            value={form.state as string}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Capacidade Operacional</p>
        <p className="text-xs text-gray-400 mb-3">
          Esses valores definem o breakeven e a receita máxima do motor financeiro.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="atlas-label">Slots/hora</label>
            <input
              type="number"
              className="atlas-input"
              min={1}
              value={form.slots_per_hour as number}
              onChange={(e) => setForm((f) => ({ ...f, slots_per_hour: +e.target.value }))}
            />
          </div>
          <div>
            <label className="atlas-label">Horas/dia útil</label>
            <input
              type="number"
              className="atlas-input"
              min={1}
              max={24}
              value={form.hours_open_weekday as number}
              onChange={(e) => setForm((f) => ({ ...f, hours_open_weekday: +e.target.value }))}
            />
          </div>
          <div>
            <label className="atlas-label">Horas/sábado</label>
            <input
              type="number"
              className="atlas-input"
              min={0}
              max={24}
              value={form.hours_open_saturday as number}
              onChange={(e) => setForm((f) => ({ ...f, hours_open_saturday: +e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="atlas-label">Notas internas</label>
        <textarea
          className="atlas-input resize-none"
          rows={2}
          placeholder="Observações sobre a unidade..."
          value={form.notes as string || ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </>
  );
}

export default function UnitsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qBusinessId = params.get('business_id') ?? '';
  const { businessId, setUnit } = useNavStore();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>(EMPTY_FORM);
  const [dateModalUnit, setDateModalUnit] = useState<Unit | null>(null);
  const [dateValue, setDateValue] = useState('');

  const effectiveBusinessId = qBusinessId || businessId || '';

  const { data: units, isLoading } = useQuery({
    queryKey: ['units', effectiveBusinessId],
    queryFn: () => unitsApi.list(effectiveBusinessId),
    enabled: !!effectiveBusinessId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Unit> & { business_id: string }) => unitsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', effectiveBusinessId] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, recalc }: { id: string; data: Partial<Unit>; recalc: boolean }) => {
      await unitsApi.update(id, data);
      if (recalc) {
        const versions = await versionsApi.list(id);
        const active = versions.filter((v) => v.status !== 'archived');
        await Promise.allSettled(active.map((v) => calculationsApi.recalculate(v.id)));
      }
    },
    onSuccess: (_, { recalc }) => {
      queryClient.invalidateQueries({ queryKey: ['units', effectiveBusinessId] });
      if (recalc) {
        queryClient.invalidateQueries({ queryKey: ['dre'] });
        queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
      }
      setEditUnit(null);
    },
  });

  // Mutation específica para abertura: salva + recalcula todas as versões ativas
  const updateOpeningDateMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string | null }) => {
      await unitsApi.update(id, { opening_date: date ?? undefined });
      const versions = await versionsApi.list(id);
      const active = versions.filter((v) => v.status !== 'archived');
      await Promise.allSettled(active.map((v) => calculationsApi.recalculate(v.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', effectiveBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['dre'] });
      queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
      setDateModalUnit(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    createMutation.mutate({ ...(form as unknown as Partial<Unit>), business_id: effectiveBusinessId });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUnit || !form.name || !form.code) return;
    const recalc = (form.opening_date || null) !== (editUnit.opening_date || null);
    updateMutation.mutate({ id: editUnit.id, data: form as unknown as Partial<Unit>, recalc });
  };

  const openEdit = (unit: Unit) => {
    setEditUnit(unit);
    setForm({
      name: unit.name,
      code: unit.code,
      status: unit.status,
      city: unit.city ?? '',
      state: unit.state ?? '',
      opening_date: unit.opening_date ?? '',
      area_m2: unit.area_m2 ?? 0,
      notes: unit.notes ?? '',
      slots_per_hour: unit.slots_per_hour ?? 10,
      hours_open_weekday: unit.hours_open_weekday ?? 17,
      hours_open_saturday: unit.hours_open_saturday ?? 7,
    });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Unidades" />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Unidades</h2>
            <p className="text-sm text-gray-500 mt-0.5">{units?.length ?? 0} unidades cadastradas</p>
          </div>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }} disabled={!effectiveBusinessId}>
            <Plus className="h-4 w-4" /> Nova Unidade
          </Button>
        </div>

        {/* Banner de orientação de fluxo */}
        {effectiveBusinessId && (
          <div className="mb-6 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3 flex items-center gap-3 text-sm text-indigo-700">
            <span className="font-semibold whitespace-nowrap">Fluxo de uso:</span>
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium">① Unidade</span>
              <span className="text-indigo-400">→</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium">② Cenário</span>
              <span className="text-indigo-400">→</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium">③ Versão de Orçamento</span>
              <span className="text-indigo-400">→</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium">④ Calcular</span>
            </span>
            <span className="ml-auto text-xs text-indigo-500 whitespace-nowrap">Clique em uma unidade para começar</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units?.map((unit) => (
            <div
              key={unit.id}
              className="flex flex-col bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-400 hover:shadow-md transition-all group relative"
            >
              {/* Botão editar */}
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(unit); }}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Editar unidade"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => {
                  setUnit(unit.id);
                  router.push(`/scenarios?unit_id=${unit.id}`);
                }}
                className="flex flex-col flex-1 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <StatusBadge status={unit.status} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-brand-600">{unit.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{unit.code}</p>
                  {unit.city && (
                    <p className="text-xs text-gray-400 mt-1">
                      {unit.city}{unit.state ? `, ${unit.state}` : ''}
                      {unit.area_m2 ? ` · ${unit.area_m2}m²` : ''}
                    </p>
                  )}
                  {/* Badge de ciclo de vida — clicável para editar a data */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateModalUnit(unit);
                      setDateValue(unit.opening_date ?? '');
                    }}
                    className="mt-2 text-left"
                    title="Clique para definir ou alterar a data de inauguração"
                  >
                    <UnitLifecycleBadge unit={unit} size="sm" />
                  </button>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>{unit.slots_per_hour ?? 10} slots/h</span>
                    <span>·</span>
                    <span>{unit.hours_open_weekday ?? 17}h dias úteis</span>
                    {(unit.hours_open_saturday ?? 0) > 0 && (
                      <><span>·</span><span>{unit.hours_open_saturday}h sáb</span></>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end mt-4 text-brand-500 gap-1">
                  <span className="text-xs font-medium">Ver cenários e orçamentos</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            </div>
          ))}
        </div>

        {!effectiveBusinessId && (
          <div className="text-center py-16 text-gray-400">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione um negócio primeiro</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => router.push('/businesses')}
            >
              Selecionar Negócio
            </Button>
          </div>
        )}
      </div>

      {/* Modal Nova Unidade */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">Nova Unidade</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <UnitFormFields form={form} setForm={setForm} />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Unidade'}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-xs text-red-500 text-center">Erro ao criar unidade. Verifique os dados.</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Unidade */}
      {editUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-semibold text-gray-900">Editar Unidade</h3>
                <p className="text-xs text-gray-400 mt-0.5">Alterações geram registro de auditoria</p>
              </div>
              <button onClick={() => setEditUnit(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <UnitFormFields form={form} setForm={setForm} />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditUnit(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
              {updateMutation.isError && (
                <p className="text-xs text-red-500 text-center">Erro ao salvar. Verifique os dados.</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal de Data de Abertura */}
      {dateModalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Data de Inauguração</h3>
                <p className="text-xs text-gray-400 mt-0.5">{dateModalUnit.name}</p>
              </div>
              <button onClick={() => setDateModalUnit(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Contexto semântico */}
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="h-4 w-4" />
                  Para que serve a data de abertura?
                </div>
                <ul className="space-y-1 list-disc list-inside text-indigo-600">
                  <li>Calcula há quantos meses a unidade está em operação</li>
                  <li>Determina se está em fase pré-abertura ou já ativa</li>
                  <li>Ancora a curva de payback no dashboard de projeções</li>
                  <li>Alimenta o widget de próximas aberturas na visão geral</li>
                  <li>O horizonte do cálculo financeiro é definido separadamente na versão de orçamento</li>
                </ul>
              </div>

              {/* Estado atual */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Estado atual</p>
                <UnitLifecycleBadge unit={dateModalUnit} size="md" />
              </div>

              {/* Input */}
              <div>
                <label className="atlas-label">Nova data de inauguração</label>
                <input
                  type="date"
                  className="atlas-input"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Deixe em branco para remover a data. Alterações são registradas em auditoria.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDateModalUnit(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={updateOpeningDateMutation.isPending}
                  onClick={() => {
                    updateOpeningDateMutation.mutate({ id: dateModalUnit.id, date: dateValue || null });
                  }}
                >
                  {updateOpeningDateMutation.isPending ? 'Salvando e recalculando...' : 'Salvar Data'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
