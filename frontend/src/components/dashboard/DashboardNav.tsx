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
  Layers,
  BarChart2,
  Network,
  SlidersHorizontal,
} from 'lucide-react';

// ── Estrutura de navegação em 4 grupos ────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  /** FIX B5: requer businessId para navegar */
  requiresBusiness?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard/visao-geral',   label: 'Visão Geral',  icon: LayoutDashboard, matchPrefix: '/dashboard/visao-geral' },
      { href: '/dashboard/dre',           label: 'DRE',          icon: Table2,          matchPrefix: '/dashboard/dre' },
      { href: '/dashboard/capex',         label: 'CAPEX',        icon: Wallet,          matchPrefix: '/dashboard/capex' },
      { href: '/dashboard/projecoes',     label: 'Projeções',    icon: LineChart,       matchPrefix: '/dashboard/projecoes' },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { href: '/dashboard/ocupacao',      label: 'Ocupação',        icon: Users,          matchPrefix: '/dashboard/ocupacao' },
      { href: '/dashboard/capacidade',    label: 'Capacidade',      icon: Gauge,          matchPrefix: '/dashboard/capacidade' },
      { href: '/dashboard/professores',   label: 'Professores',     icon: GraduationCap,  matchPrefix: '/dashboard/professores' },
      { href: '/dashboard/planos',        label: 'Planos',          icon: Layers,         matchPrefix: '/dashboard/planos' },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/dashboard/crescimento',   label: 'Crescimento',  icon: TrendingUp,    matchPrefix: '/dashboard/crescimento' },
      { href: '/dashboard/unidades',      label: 'Unidades',     icon: Building2,     matchPrefix: '/dashboard/unidades' },
      { href: '/dashboard/estrategico',   label: 'Estratégico',  icon: Target,        matchPrefix: '/dashboard/estrategico' },
      // FIX B5: href dinâmico substituído por placeholder; requiresBusiness=true
      { href: '/dashboard/consolidated',  label: 'Consolidado',  icon: Network,       matchPrefix: '/dashboard/consolidated', requiresBusiness: true },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { href: '/dashboard/sensibilidade',      label: 'Sensibilidade',  icon: SlidersHorizontal, matchPrefix: '/dashboard/sensibilidade' },
      { href: '/dashboard/beneficios-personal', label: 'Benefícios', icon: Gift,   matchPrefix: '/dashboard/beneficios-personal' },
      { href: '/dashboard/auditoria-calculo',   label: 'Auditoria',  icon: Search, matchPrefix: '/dashboard/auditoria-calculo' },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { businessId } = useNavStore();

  return (
    <div className="border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-stretch overflow-x-auto scrollbar-none px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-stretch">
            {/* Separador entre grupos */}
            {gi > 0 && <div className="w-px bg-gray-200/70 my-2 mx-1 shrink-0" />}

            {/* Grupo */}
            <div className="flex flex-col">
              {/* Label do grupo */}
              <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase px-3 pt-2 pb-0.5">
                {group.label}
              </span>
              {/* Tabs do grupo */}
              <div className="flex items-end gap-0.5 pb-0">
                {group.items.map((item) => {
                  const matchPrefix = item.matchPrefix ?? item.href;
                  const active = pathname === item.href || pathname.startsWith(matchPrefix + '/');

                  // FIX B5: Consolidado desabilitado quando sem businessId
                  const disabled = item.requiresBusiness && !businessId;
                  const href = item.requiresBusiness && businessId
                    ? `/dashboard/consolidated/${businessId}`
                    : item.href;

                  const Icon = item.icon;

                  const linkClasses = cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all',
                    'border-b-2 -mb-px',
                    active
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
                    disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                  );

                  return disabled ? (
                    <span
                      key={item.href}
                      title="Selecione um negócio para ver o consolidado"
                      className={linkClasses}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  ) : (
                    <Link key={item.href} href={href} className={linkClasses}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
