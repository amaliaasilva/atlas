'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePlansApi, aiApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { Topbar } from '@/components/layout/Topbar';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { GeoPricingReport, ServicePlan } from '@/types/api';
import { MapPin, Sparkles, X, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PlanosPage() {
  const { businessId, selectedUnitIds } = useDashboardFilters();
  const queryClient = useQueryClient();
  const unitId = selectedUnitIds.length === 1 ? selectedUnitIds[0] : null;

  const [showGeoModal, setShowGeoModal] = useState(false);
  const [geoLocation, setGeoLocation] = useState('');
  const [geoReport, setGeoReport] = useState<GeoPricingReport | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServicePlan>>({});

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['service-plans', businessId],
    queryFn: () => servicePlansApi.list(businessId!),
    enabled: !!businessId,
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServicePlan> }) =>
      servicePlansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans', businessId] });
      setEditingPlanId(null);
      setEditForm({});
    },
  });

  const startEdit = (plan: ServicePlan) => {
    setEditingPlanId(plan.id);
    setEditForm({
      price_per_hour: plan.price_per_hour,
      target_mix_pct: plan.target_mix_pct,
    });
  };

  const saveEdit = (planId: string) => {
    updatePlanMutation.mutate({ id: planId, data: editForm });
  };

  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  const activeUnit = units.find((u) => u.id === unitId) ?? units[0];

  const geoPricingMutation = useMutation({
    mutationFn: () =>
      aiApi.geoPricing(activeUnit!.id, geoLocation || activeUnit?.city || undefined),
    onSuccess: (data) => {
      setGeoReport(data);
    },
  });

  if (!businessId) {
    return (
      <>
        <Topbar title="Planos de Serviço" />
        <div className="flex-1 p-6 text-center text-sm text-gray-500">
          Selecione um negócio para visualizar os planos.
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Planos de Serviço" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Planos de Serviço</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configuração de preços e mix de planos B2B</p>
          </div>
          {activeUnit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowGeoModal(true); setGeoReport(null); }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Precificação Inteligente por Região
            </Button>
          )}
        </div>

        {/* Tabela de planos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500 animate-pulse">Carregando planos...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">Nenhum plano cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Plano</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Preço/hora</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Mix alvo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Aulas mín/máx</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Ação</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isEditing = editingPlanId === plan.id;
                  return (
                  <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{plan.name}</span>
                      {plan.description && (
                        <span className="ml-2 text-xs text-gray-400">{plan.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-800">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={editForm.price_per_hour ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, price_per_hour: parseFloat(e.target.value) || 0 }))}
                          className="w-24 rounded border border-gray-300 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      ) : (
                        `${formatCurrency(plan.price_per_hour)}/h`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={editForm.target_mix_pct ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, target_mix_pct: parseFloat(e.target.value) || 0 }))}
                          className="w-20 rounded border border-gray-300 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      ) : (
                        formatPercent(plan.target_mix_pct)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {plan.min_classes_month} – {plan.max_classes_month} aulas/mês
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => saveEdit(plan.id)}
                            disabled={updatePlanMutation.isPending}
                            className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                            title="Salvar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditingPlanId(null); setEditForm({}); }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(plan)}
                          className="text-gray-400 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-2 text-xs text-gray-500 font-semibold">TOTAL / MÉDIO</td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                    {plans.length > 0 && formatCurrency(
                      plans.reduce((acc, p) => acc + p.price_per_hour * p.target_mix_pct, 0) /
                      Math.max(plans.reduce((acc, p) => acc + p.target_mix_pct, 0), 1)
                    )}/h médio
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                    {formatPercent(plans.reduce((acc, p) => acc + p.target_mix_pct, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Modal Precificação Inteligente */}
        {showGeoModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-gray-900">Precificação Inteligente por Região</h2>
                </div>
                <button onClick={() => setShowGeoModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Analisa o perfil socioeconômico e competitivo da região para sugerir preços ótimos.
              </p>

              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">
                  Localização (CEP, bairro ou cidade) — opcional
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder={`${activeUnit?.city || 'São Paulo'}, ${activeUnit?.state || 'SP'}`}
                  value={geoLocation}
                  onChange={(e) => setGeoLocation(e.target.value)}
                />
              </div>

              <Button
                onClick={() => geoPricingMutation.mutate()}
                loading={geoPricingMutation.isPending}
                disabled={!activeUnit}
                className="w-full mb-4"
              >
                <Sparkles className="h-4 w-4" /> Analisar Região
              </Button>

              {geoReport && (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      geoReport.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      geoReport.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      Confiança: {geoReport.confidence}
                    </span>
                    <span className="text-xs text-gray-500">{geoReport.city}, {geoReport.state}</span>
                  </div>

                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Plano</th>
                        <th className="px-3 py-2 text-right text-gray-600">Atual</th>
                        <th className="px-3 py-2 text-right text-gray-600">Sugerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geoReport.suggested_prices.map((sp) => (
                        <tr key={sp.plan} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-semibold text-gray-800 capitalize">{sp.plan}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(sp.current)}/h</td>
                          <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatCurrency(sp.suggested)}/h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {geoReport.caveats.length > 0 && (
                    <p className="text-xs text-gray-400 italic">{geoReport.caveats[0]}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
