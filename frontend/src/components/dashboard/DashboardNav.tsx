'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavStore } from '@/store/auth';
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
  BarChart2,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard/visao-geral', label: 'Visão Geral', icon: LayoutDashboard, short: 'Geral', matchPrefix: '/dashboard/visao-geral' },
  { href: '/dashboard/crescimento', label: 'Crescimento', icon: TrendingUp, short: 'Crescimento', matchPrefix: '/dashboard/crescimento' },
  { href: '/dashboard/unidades', label: 'Unidades', icon: Building2, short: 'Unidades', matchPrefix: '/dashboard/unidades' },
  { href: '/dashboard/capacidade', label: 'Capacidade', icon: Gauge, short: 'Capacidade', matchPrefix: '/dashboard/capacidade' },
  { href: '/dashboard/ocupacao', label: 'Ocupação', icon: Users, short: 'Ocupação', matchPrefix: '/dashboard/ocupacao' },
  { href: '/dashboard/professores', label: 'Professores', icon: GraduationCap, short: 'Professores', matchPrefix: '/dashboard/professores' },
  { href: '/dashboard/projecoes', label: 'Projeções', icon: LineChart, short: 'Projeções', matchPrefix: '/dashboard/projecoes' },
  { href: '/dashboard/estrategico', label: 'Estratégico', icon: Target, short: 'Estratégico', matchPrefix: '/dashboard/estrategico' },
  { href: '/dashboard/dre', label: 'DRE', icon: Table2, short: 'DRE', matchPrefix: '/dashboard/dre' },
  { href: '/dashboard/capex', label: 'CAPEX', icon: Wallet, short: 'CAPEX', matchPrefix: '/dashboard/capex' },
  { href: '/dashboard/beneficios-personal', label: 'Benefícios', icon: Gift, short: 'Benefícios', matchPrefix: '/dashboard/beneficios-personal' },
  { href: '/dashboard/planos', label: 'Planos', icon: Target, short: 'Planos', matchPrefix: '/dashboard/planos' },
  { href: '/dashboard/auditoria-calculo', label: 'Auditoria', icon: Search, short: 'Auditoria', matchPrefix: '/dashboard/auditoria-calculo' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { businessId } = useNavStore();
  const items = [
    ...navItems,
    {
      href: businessId ? `/dashboard/consolidated/${businessId}` : '/dashboard/visao-geral',
      label: 'Consolidado',
      icon: BarChart2,
      short: 'Consolidado',
      matchPrefix: '/dashboard/consolidated',
    },
  ];

  return (
    <div className="px-4 border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {items.map((item) => {
          const matchPrefix = item.matchPrefix ?? item.href;
          const active = pathname === item.href || pathname.startsWith(matchPrefix + '/');
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
