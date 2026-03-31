'use client';

import { useNavStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { businessesApi, scenariosApi, unitsApi } from '@/lib/api';
import { Bell, ChevronRight } from 'lucide-react';

export function Topbar({ title }: { title?: string }) {
  const { organizationId, businessId, scenarioId, unitId } = useNavStore();

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', organizationId],
    queryFn: () => businessesApi.list(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', businessId],
    queryFn: () => scenariosApi.list(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const businessName = businesses.find((b) => b.id === businessId)?.name;
  const scenarioName = scenarios.find((s) => s.id === scenarioId)?.name;
  const unitName = units.find((u) => u.id === unitId)?.name;

  const SCENARIO_TYPE_LABEL: Record<string, string> = {
    base: 'Moderado',
    conservative: 'Pessimista',
    aggressive: 'Otimista',
    custom: 'Personalizado',
  };
  const scenarioType = scenarios.find((s) => s.id === scenarioId)?.scenario_type;

  return (
    <header className="px-6 py-3 bg-white border-b border-gray-100 shrink-0 flex items-center justify-between gap-3">
      {/* Título da página */}
      {title ? (
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
      ) : (
        <span />
      )}

      {/* Breadcrumb de contexto (somente leitura) + notificação */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          {businessName && (
            <>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                {businessName}
              </span>
            </>
          )}
          {scenarioName && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-200">
                {scenarioName}
                {scenarioType && SCENARIO_TYPE_LABEL[scenarioType] && (
                  <span className="ml-1 opacity-60">· {SCENARIO_TYPE_LABEL[scenarioType]}</span>
                )}
              </span>
            </>
          )}
          {unitName && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-medium border border-sky-100">
                {unitName}
              </span>
            </>
          )}
        </div>

        <button className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
