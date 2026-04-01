'use client';

import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

export default function CompareScenariosPage() {
  return (
    <>
      <Topbar title="Comparação entre Cenários" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
            <LayoutDashboard className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Comparação de Cenários no Dashboard
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            A comparação entre cenários foi integrada ao <strong>Dashboard Estratégico</strong>, onde você pode visualizar KPIs lado a lado por unidade, cenário e período — com muito mais contexto.
          </p>
          <Link
            href="/dashboard/estrategico"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Abrir Dashboard Estratégico
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
