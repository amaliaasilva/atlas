'use client';

import Link from 'next/link';
import { useDashboardFilters } from '@/store/dashboard';
import { NoFiltersState } from '@/components/dashboard/EmptyState';
import { Calculator, Droplets, ArrowRight, Wallet, CalendarClock } from 'lucide-react';

export default function CalculosHubPage() {
  const { businessId, scenarioId } = useDashboardFilters();

  if (!businessId || !scenarioId) {
    return (
      <div className="p-6">
        <NoFiltersState message="Selecione negócio e cenário para acessar os cálculos." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cálculos</h1>
            <p className="text-sm text-slate-300 mt-0.5">
              Hub de ferramentas financeiras e operacionais.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link
          href="/dashboard/calculo-kit-higiene"
          className="group rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-700 px-2.5 py-1 text-xs font-semibold">
                <Droplets className="h-3.5 w-3.5" />
                Operacional
              </div>
              <h3 className="text-base font-bold text-gray-900 group-hover:text-sky-700 transition-colors">
                Cálculo Kit Higiene
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Projeta custo mensal e anual de sachês, lavagem de toalhas e reposições por ano de ocupação.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-sky-500 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
          </div>
        </Link>

        <Link
          href="/dashboard/calculo-caixa"
          className="group rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                <Wallet className="h-3.5 w-3.5" />
                Financeiro
              </div>
              <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Cálculo de Caixa
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Analisa runway, burn rate, caixa necessário e resultado médio mensal a partir das colunas I e J.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {['Runway', 'Caixa', 'Burn rate médio mensal', 'Período (meses)', 'Caixa necessário', 'Resultado médio mensal'].map((item) => (
                  <span key={item} className="text-[11px] rounded-md border border-emerald-100 bg-white/70 px-2 py-1 text-emerald-700/90">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <CalendarClock className="h-5 w-5 text-emerald-500" />
              <ArrowRight className="h-5 w-5 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

    </div>
  );
}
