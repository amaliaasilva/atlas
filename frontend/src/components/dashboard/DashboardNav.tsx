'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Gauge,
  Users,
  GraduationCap,
  LineChart,
  Target,
  Table2,
  Wallet,
  Search,
  Gift,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard/visao-geral', label: 'Visão Geral', icon: LayoutDashboard, short: 'Geral' },
  { href: '/dashboard/crescimento', label: 'Crescimento', icon: TrendingUp, short: 'Crescimento' },
  { href: '/dashboard/unidades', label: 'Unidades', icon: Building2, short: 'Unidades' },
  { href: '/dashboard/capacidade', label: 'Capacidade', icon: Gauge, short: 'Capacidade' },
  { href: '/dashboard/ocupacao', label: 'Ocupação', icon: Users, short: 'Ocupação' },
  { href: '/dashboard/professores', label: 'Professores', icon: GraduationCap, short: 'Professores' },
  { href: '/dashboard/projecoes', label: 'Projeções', icon: LineChart, short: 'Projeções' },
  { href: '/dashboard/estrategico', label: 'Estratégico', icon: Target, short: 'Estratégico' },
  { href: '/dashboard/dre', label: 'DRE', icon: Table2, short: 'DRE' },
  { href: '/dashboard/capex', label: 'CAPEX', icon: Wallet, short: 'CAPEX' },
  { href: '/dashboard/beneficios-personal', label: 'Benefícios', icon: Gift, short: 'Benefícios' },
  { href: '/dashboard/planos', label: 'Planos', icon: Target, short: 'Planos' },
  { href: '/dashboard/auditoria-calculo', label: 'Auditoria', icon: Search, short: 'Auditoria' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="px-4 border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all',
                'border-b-2 -mb-px',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
