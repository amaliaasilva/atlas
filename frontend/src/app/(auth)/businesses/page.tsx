'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { businessesApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Dumbbell, ChevronRight } from 'lucide-react';

export default function BusinessesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get('org_id') ?? '';
  const { organizationId, setBusiness } = useNavStore();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses', orgId || organizationId],
    queryFn: () => businessesApi.list(orgId || organizationId || ''),
    enabled: !!(orgId || organizationId),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Negócios" />
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Selecionar Negócio</h2>
          <p className="text-sm text-gray-500 mb-8">Escolha o negócio que deseja gerenciar.</p>

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
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{biz.business_type.replace('_', ' ')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-brand-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
