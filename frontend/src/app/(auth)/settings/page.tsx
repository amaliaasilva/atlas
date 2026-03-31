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
import type { ServicePlan } from '@/types/api';
import { Pencil, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { businessId } = useNavStore();
  const queryClient = useQueryClient();

  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServicePlan>>({});

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
          <Card title="Planos de Serviço (Bronze / Prata / Ouro / Diamante)">
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              Estes planos são os <strong>padrões globais do negócio</strong>. Qualquer alteração reflete em todos os cálculos futuros de todas as unidades. Versões de orçamento já calculadas <strong>não são afetadas automaticamente</strong> — recalcule cada versão para aplicar os novos valores.
            </div>
            {plans && plans.length > 0 ? (
              <>
                <table className="atlas-table">
                  <thead>
                    <tr>
                      <th>Plano</th>
                      <th className="text-right">R$/hora</th>
                      <th className="text-right">Mix %</th>
                      <th className="text-right">Aulas Mín</th>
                      <th className="text-right">Aulas Máx</th>
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
                                className="atlas-input w-20 text-right"
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
                            <td className="text-right">
                              {(plan.target_mix_pct * 100).toFixed(0)}%
                            </td>
                            <td className="text-right">{plan.min_classes_month}</td>
                            <td className="text-right">{plan.max_classes_month ?? '—'}</td>
                            <td className="text-right">
                              <button
                                onClick={() => startEdit(plan)}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
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
    </>
  );
}
