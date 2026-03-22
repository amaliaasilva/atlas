'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { scenariosApi, versionsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TrendingUp, ChevronRight, Plus, FileText, X } from 'lucide-react';

const SCENARIO_TYPES = [
  { value: 'base', label: 'Base' },
  { value: 'conservative', label: 'Conservador' },
  { value: 'aggressive', label: 'Agressivo' },
  { value: 'custom', label: 'Personalizado' },
];

function CreateScenarioModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [scenarioType, setScenarioType] = useState('base');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      scenariosApi.create({ business_id: businessId, name, scenario_type: scenarioType, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', businessId] });
      onClose();
    },
    onError: () => setError('Erro ao criar cenário. Verifique os dados (o nome deve ser único por negócio).'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Novo Cenário</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex: Cenário Base 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SCENARIO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Descrição opcional..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Criando...' : 'Criar Cenário'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qUnitId = params.get('unit_id') ?? '';
  const { businessId, unitId: storeUnitId, setScenario, setVersion } = useNavStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const effectiveUnitId = qUnitId || storeUnitId || '';

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  const { data: versions } = useQuery({
    queryKey: ['versions', effectiveUnitId],
    queryFn: () => versionsApi.list(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Cenários & Versões" />
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cenários de Planejamento</h2>
            <p className="text-sm text-gray-500 mt-0.5">Selecione um cenário para acessar o orçamento</p>
          </div>
          <Button size="sm" disabled={!businessId} onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Novo Cenário
          </Button>
        </div>

        <div className="space-y-4">
          {scenarios?.map((scenario) => {
            const scenarioVersions = versions?.filter((v) => v.scenario_id === scenario.id) ?? [];
            return (
              <div key={scenario.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{scenario.name}</p>
                      <StatusBadge status={scenario.scenario_type} />
                    </div>
                    {scenario.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{scenario.description}</p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setScenario(scenario.id);
                      router.push(`/budget?scenario_id=${scenario.id}&unit_id=${effectiveUnitId}`);
                    }}
                  >
                    <Plus className="h-3 w-3" /> Nova Versão
                  </Button>
                </div>

                {/* Versões deste cenário */}
                {scenarioVersions.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {scenarioVersions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setScenario(scenario.id);
                          setVersion(v.id);
                          router.push(`/budget/${v.id}`);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group text-left"
                      >
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-brand-600">{v.name}</span>
                          <span className="text-xs text-gray-400 ml-3">{v.horizon_start} → {v.horizon_end}</span>
                        </div>
                        <StatusBadge status={v.status} />
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-xs text-gray-400">Nenhuma versão criada ainda.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && businessId && (
        <CreateScenarioModal businessId={businessId} onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
