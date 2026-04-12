'use client';

import { usePathname } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { CalculationsSubNav } from '@/components/dashboard/CalculationsSubNav';

function isCalcRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/calculos'
    || pathname.startsWith('/dashboard/calculo-kit-higiene')
    || pathname.startsWith('/dashboard/calculo-caixa')
  );
}

export function ExecutiveSubNav() {
  const pathname = usePathname();

  if (isCalcRoute(pathname)) {
    return <CalculationsSubNav />;
  }

  return <DashboardNav />;
}
