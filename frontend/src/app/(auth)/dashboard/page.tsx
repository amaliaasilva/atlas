'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { organizationsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { LoadingScreen } from '@/components/ui/Spinner';
import { Building2, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { setOrganization, businessId } = useNavStore();

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  });

  // Se já tem business selecionado, vai direto para o dashboard executivo
  if (businessId) {
    router.replace('/dashboard/visao-geral');
    return <LoadingScreen />;
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Selecionar Organização" />
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Bem-vindo ao Atlas Finance</h2>
          <p className="text-sm text-gray-500 mb-8">Selecione uma organização para começar.</p>

          <div className="space-y-3">
            {orgs?.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setOrganization(org.id);
                  router.push(`/businesses?org_id=${org.id}`);
                }}
                className="w-full flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-400 hover:shadow-md transition-all group text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-brand-600">{org.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{org.slug}</p>
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
