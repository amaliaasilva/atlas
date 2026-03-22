'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { businessesApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Dumbbell, ChevronRight, Plus, X } from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'cowork_gym', label: 'Academia Coworking' },
  { value: 'food_beverage', label: 'Alimentação' },
  { value: 'retail', label: 'Varejo' },
  { value: 'services', label: 'Serviços' },
  { value: 'other', label: 'Outro' },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CreateBusinessModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('cowork_gym');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      businessesApi.create({
        organization_id: orgId,
        name,
        slug: slug || slugify(name),
        business_type: businessType,
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      onClose();
    },
    onError: () => setError('Erro ao criar negócio. Verifique os dados.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Novo Negócio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex: Atlas Cowork Paulista"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              placeholder="atlas-cowork-paulista"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Negócio *</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {BUSINESS_TYPES.map((t) => (
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
            {mutation.isPending ? 'Criando...' : 'Criar Negócio'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get('org_id') ?? '';
  const { organizationId, setBusiness } = useNavStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const effectiveOrgId = orgId || organizationId || '';

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses', effectiveOrgId],
    queryFn: () => businessesApi.list(effectiveOrgId),
    enabled: !!effectiveOrgId,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Negócios" />
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Selecionar Negócio</h2>
              <p className="text-sm text-gray-500 mt-0.5">Escolha o negócio que deseja gerenciar.</p>
            </div>
            <Button size="sm" disabled={!effectiveOrgId} onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Negócio
            </Button>
          </div>

          <div className="space-y-3">
            {businesses?.map((biz) => (
              <button
                key={biz.id}
                onClick={() => {
                  setBusiness(biz.id);
                  router.push(`/units?business_id=${biz.id}`);
                }}
                className="w-full flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-400 hover:shadow-md transition-all group text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-brand-600">{biz.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{biz.business_type.replace(/_/g, ' ')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-brand-400" />
              </button>
            ))}
            {(!businesses || businesses.length === 0) && (
              <div className="text-center py-16 text-gray-400">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum negócio cadastrado.</p>
                <p className="text-xs mt-1">Clique em &quot;Novo Negócio&quot; para começar.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && effectiveOrgId && (
        <CreateBusinessModal orgId={effectiveOrgId} onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
