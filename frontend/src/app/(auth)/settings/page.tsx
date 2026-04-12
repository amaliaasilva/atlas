'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, servicePlansApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import type { ServicePlan, ServicePlanInput } from '@/types/api';
import { Pencil, Check, X, Trash2, Plus } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { businessId } = useNavStore();
  const queryClient = useQueryClient();

  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServicePlan>>({});
  const [deletingPlan, setDeletingPlan] = useState<ServicePlan | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<ServicePlanInput>>({
    name: '', code: '', price_per_hour: 0, target_mix_pct: 0.25,
    min_classes_month: 4, max_classes_month: 12, sort_order: 99, is_active: true,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: !!user?.is_superuser,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['service-plans', businessId],
    queryFn: () => servicePlansApi.list(businessId!),
    enabled: !!businessId,
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServicePlan> }) =>
      servicePlansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans', businessId] });
      setEditingPlan(null);
      setEditForm({});
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: ServicePlanInput) => servicePlansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans', businessId] });
      setShowCreatePlan(false);
      setCreateForm({ name: '', code: '', price_per_hour: 0, target_mix_pct: 0.25, min_classes_month: 4, max_classes_month: 12, sort_order: 99, is_active: true });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => servicePlansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans', businessId] });
      setDeletingPlan(null);
    },
  });

  const rebalanceMixMutation = useMutation({
    mutationFn: async () => {
      if (!plans?.length) return;
      await Promise.all(
        plans.map((plan) =>
          servicePlansApi.update(plan.id, { target_mix_pct: 0.25 }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans', businessId] });
    },
  });

  const startEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    setEditForm({
      price_per_hour: plan.price_per_hour,
      target_mix_pct: plan.target_mix_pct,
      min_classes_month: plan.min_classes_month,
      max_classes_month: plan.max_classes_month,
    });
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    updatePlanMutation.mutate({ id: editingPlan.id, data: editForm });
  };

  const weightedAvgPrice = plans
    ? plans.reduce((acc, p) => acc + p.price_per_hour * p.target_mix_pct, 0) /
      Math.max(plans.reduce((acc, p) => acc + p.target_mix_pct, 0), 0.001)
    : 0;

  if (isLoading || plansLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Configurações" />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Perfil */}
        <Card title="Meu Perfil">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nome</span>
              <span className="font-medium text-gray-900">{user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">E-mail</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Perfil</span>
              <StatusBadge status={user?.is_superuser ? 'admin' : 'user'} />
            </div>
          </div>
        </Card>

        {/* Planos de Serviço */}
        {businessId && (
          <Card
            title="Planos de Serviço (Bronze / Prata / Ouro / Diamante)"
            actions={
              user?.is_superuser ? (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => rebalanceMixMutation.mutate()}
                    loading={rebalanceMixMutation.isPending}
                  >
                    Igualar mix 25%
                  </Button>
                  <Button size="sm" onClick={() => setShowCreatePlan(true)}>
                    <Plus className="h-4 w-4" /> Novo Plano
                  </Button>
                </div>
              ) : undefined
            }
          >
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              Estes valores são os <strong>padrões globais do negócio</strong> e alimentam automaticamente o <strong>ticket médio do plano mensal</strong> usado no orçamento. Ao editar aqui, recalcule cada versão para aplicar o novo valor.
            </div>
            {plans && plans.length > 0 ? (
              <>
                <table className="atlas-table">
                  <thead>
                    <tr>
                      <th>Plano</th>
                      <th className="text-right">Ticket médio</th>
                      <th className="text-right">Mix %</th>
                      <th className="text-right">Mín</th>
                      <th className="text-right">Máx</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="font-medium">{plan.name}</td>
                        {editingPlan?.id === plan.id ? (
                          <>
                            <td className="text-right">
                              <input
                                type="number"
                                className="atlas-input w-24 text-right"
                                step="0.5"
                                value={editForm.price_per_hour ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, price_per_hour: +e.target.value }))}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                className="atlas-input w-20 text-right"
                                step="0.01"
                                min="0"
                                max="1"
                                value={editForm.target_mix_pct ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, target_mix_pct: +e.target.value }))}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                className="atlas-input w-20 text-right"
                                value={editForm.min_classes_month ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, min_classes_month: +e.target.value }))}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                className="atlas-input w-20 text-right"
                                value={editForm.max_classes_month ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, max_classes_month: +e.target.value }))}
                              />
                            </td>
                            <td className="text-right">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={saveEdit}
                                  disabled={updatePlanMutation.isPending}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingPlan(null); setEditForm({}); }}
                                  className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="text-right">
                              {plan.price_per_hour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="text-right">{(plan.target_mix_pct * 100).toFixed(0)}%</td>
                            <td className="text-right">{plan.min_classes_month}</td>
                            <td className="text-right">{plan.max_classes_month ?? '—'}</td>
                            <td className="text-right">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => startEdit(plan)}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {user?.is_superuser && (
                                  <button
                                    onClick={() => setDeletingPlan(plan)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">Preço médio ponderado pelo mix</span>
                  <span className="font-semibold text-gray-900">
                    {weightedAvgPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">Nenhum plano cadastrado.</p>
            )}
          </Card>
        )}

        {/* Lista de usuários (apenas superuser) */}
        {user?.is_superuser && (
          <Card title="Usuários do Sistema">
            <table className="atlas-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td className="text-gray-500 text-xs">{u.email}</td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Versão */}
        <div className="text-xs text-gray-400 text-center pt-4">
          Atlas Finance · v1.0.0 · Build {new Date().getFullYear()}
        </div>
      </div>

      {/* Modal: Criar Plano */}
      {showCreatePlan && businessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Novo Plano de Serviço</h3>
              <button onClick={() => setShowCreatePlan(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nome"
                  value={createForm.name ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Ouro"
                />
                <Input
                  label="Código"
                  value={createForm.code ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Ex: GOLD"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Ticket médio"
                  type="number"
                  step="0.5"
                  value={String(createForm.price_per_hour ?? '')}
                  onChange={(e) => setCreateForm((f) => ({ ...f, price_per_hour: +e.target.value }))}
                />
                <Input
                  label="Mix % (0-1)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={String(createForm.target_mix_pct ?? '')}
                  onChange={(e) => setCreateForm((f) => ({ ...f, target_mix_pct: +e.target.value }))}
                />
                <Input
                  label="Ordem"
                  type="number"
                  value={String(createForm.sort_order ?? '')}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sort_order: +e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mín"
                  type="number"
                  value={String(createForm.min_classes_month ?? '')}
                  onChange={(e) => setCreateForm((f) => ({ ...f, min_classes_month: +e.target.value }))}
                />
                <Input
                  label="Máx"
                  type="number"
                  value={String(createForm.max_classes_month ?? '')}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_classes_month: +e.target.value }))}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowCreatePlan(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() =>
                  createPlanMutation.mutate({
                    ...(createForm as ServicePlanInput),
                    business_id: businessId,
                    is_active: true,
                  })
                }
                loading={createPlanMutation.isPending}
                disabled={!createForm.name || !createForm.code}
              >
                <Plus className="h-4 w-4" /> Criar Plano
              </Button>
            </div>
            {createPlanMutation.isError && (
              <p className="px-6 pb-4 text-xs text-red-500">Erro ao criar plano. Verifique os dados.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão de plano */}
      {deletingPlan && (
        <ConfirmDeleteModal
          title="Excluir Plano de Serviço"
          description={`Tem certeza que deseja excluir o plano "${deletingPlan.name}"?`}
          warningItems={[
            'A exclusão impacta a soma do mix percentual dos planos restantes.',
            'Versões de orçamento já calculadas não são afetadas automaticamente.',
          ]}
          onConfirm={() => deletePlanMutation.mutate(deletingPlan.id)}
          onClose={() => setDeletingPlan(null)}
          isPending={deletePlanMutation.isPending}
        />
      )}
    </>
  );
}
