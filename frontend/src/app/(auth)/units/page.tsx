'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { unitsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MapPin, ChevronRight, Plus } from 'lucide-react';

export default function UnitsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qBusinessId = params.get('business_id') ?? '';
  const { businessId, setUnit } = useNavStore();

  const effectiveBusinessId = qBusinessId || businessId || '';

  const { data: units, isLoading } = useQuery({
    queryKey: ['units', effectiveBusinessId],
    queryFn: () => unitsApi.list(effectiveBusinessId),
    enabled: !!effectiveBusinessId,
  });

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
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nova Unidade
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units?.map((unit) => (
            <button
              key={unit.id}
              onClick={() => {
                setUnit(unit.id);
                router.push(`/scenarios?unit_id=${unit.id}`);
              }}
              className="flex flex-col bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-400 hover:shadow-md transition-all group text-left"
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
              </div>
              <div className="flex items-center justify-end mt-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs">Ver cenários</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </button>
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
    </>
  );
}
