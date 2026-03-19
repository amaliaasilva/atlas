'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { scenariosApi, versionsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TrendingUp, ChevronRight, Plus, FileText } from 'lucide-react';

export default function ScenariosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qUnitId = params.get('unit_id') ?? '';
  const { businessId, unitId: storeUnitId, setScenario, setVersion } = useNavStore();

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
          <Button size="sm"><Plus className="h-4 w-4" /> Novo Cenário</Button>
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
    </>
  );
}
