'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Droplets, Wallet } from 'lucide-react';

const CALC_TABS = [
  {
    href: '/dashboard/calculo-kit-higiene',
    label: 'Cálculo Kit Higiene',
    icon: Droplets,
  },
  {
    href: '/dashboard/calculo-caixa',
    label: 'Cálculo de Caixa',
    icon: Wallet,
  },
] as const;

function isCalcRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/calculos'
    || pathname.startsWith('/dashboard/calculo-kit-higiene')
    || pathname.startsWith('/dashboard/calculo-caixa')
  );
}

export function CalculationsSubNav() {
  const pathname = usePathname();

  if (!isCalcRoute(pathname)) return null;

  return (
    <div className="border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-stretch overflow-x-auto scrollbar-none px-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase px-3 pt-2 pb-0.5">
            Cálculos
          </span>
          <div className="flex items-end gap-0.5 pb-0">
            {CALC_TABS.map((item, index) => {
              const Icon = item.icon;
              const active = pathname === '/dashboard/calculos'
                ? index === 0
                : pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all',
                    'border-b-2 -mb-px',
                    active
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
