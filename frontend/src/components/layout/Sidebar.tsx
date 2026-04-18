'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, MapPin, TrendingUp,
  FileSpreadsheet, Upload, ClipboardList, Settings, LogOut,
  ChevronDown, Briefcase, BarChart3, GitCompare, Scale,
  ChevronRight, Calculator,
} from 'lucide-react';
import { businessesApi } from '@/lib/api';
import { useAuthStore, useNavStore } from '@/store/auth';
import { useDashboardFilters } from '@/store/dashboard';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AtlasLogo } from '@/components/ui/AtlasLogo';

interface NavChild {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  href: string;
  matchPrefix?: string;
  icon: React.ReactNode;
  children?: NavChild[];
}
interface NavSection {
  label: string;
  items: NavItem[];
  hint?: string;
}

// ── BusinessSelector ────────────────────────────────────────────────────────
function BusinessSelector() {
  const { organizationId, businessId, setBusiness } = useNavStore();
  const filters = useDashboardFilters();
  const [open, setOpen] = useState(false);

  const { data: businesses = [] } = useQuery({
    queryKey: ['sidebar-businesses', organizationId],
    queryFn: () => businessesApi.list(organizationId ?? ''),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });

  const current = businesses.find((b) => b.id === businessId);

  const handleSelect = (id: string | null) => {
    setBusiness(id);
    // Propaga reset para o store de filtros de dashboard
    filters.setBusinessId(id);
    filters.setScenarioId(null);
    filters.setSelectedUnitIds([]);
    setOpen(false);
  };

  if (!organizationId) {
    return (
      <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/5">
        <p className="text-[10px] text-gray-500">Faça login para continuar.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all',
          'border border-white/10 bg-white/5 hover:bg-white/10',
          'text-left focus:outline-none focus:ring-1 focus:ring-atlas-teal/50',
          open && 'bg-white/10 border-white/20',
        )}
      >
        <div className="h-7 w-7 rounded-lg bg-atlas-teal/20 flex items-center justify-center shrink-0">
          <Briefcase className="h-3.5 w-3.5 text-atlas-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 leading-none mb-0.5">
            Negócio
          </p>
          <p className="text-xs font-semibold text-white truncate leading-tight">
            {current?.name ?? 'Selecionar...'}
          </p>
        </div>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-400 hover:bg-white/5 transition-colors',
              !businessId && 'text-white font-semibold',
            )}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {!businessId && <ChevronRight className="h-3 w-3 text-atlas-teal" />}
            </span>
            Nenhum selecionado
          </button>
          {businesses.length > 0 && <div className="border-t border-white/10" />}
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors',
                b.id === businessId ? 'text-white font-semibold' : 'text-gray-300',
              )}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {b.id === businessId && <ChevronRight className="h-3 w-3 text-atlas-teal" />}
              </span>
              <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NavItem component ────────────────────────────────────────────────────────
function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const prefix = item.matchPrefix ?? item.href;
  const active = pathname === item.href
    || pathname.startsWith(prefix + '/')
    || (prefix !== '/' && pathname.startsWith(prefix));

  const [expanded, setExpanded] = useState(active);

  const hasChildren = !!item.children?.length;

  const handleParentClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setExpanded((v) => !v);
      // Navega para a href do pai só se não tem children ativo
      if (!expanded) {
        window.location.href = item.href;
      }
    }
  };

  return (
    <div>
      <Link
        href={item.href}
        onClick={hasChildren ? handleParentClick : undefined}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group',
          active
            ? 'bg-white/10 text-white border-l-2 border-atlas-teal pl-[10px]'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent pl-[10px]',
        )}
      >
        <span className={cn('shrink-0 transition-colors', active ? 'text-atlas-teal' : 'text-gray-500 group-hover:text-gray-300')}>
          {item.icon}
        </span>
        <span className="flex-1 truncate">{item.label}</span>
        {hasChildren && (
          <ChevronDown
            className={cn('h-3 w-3 text-gray-500 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        )}
      </Link>

      {hasChildren && expanded && (
        <div className="ml-[26px] mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children!.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                  childActive
                    ? 'text-atlas-teal font-semibold bg-atlas-teal/10'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5',
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SidebarSection({ label, items, pathname, hint }: { label: string; items: NavItem[]; pathname: string; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
        {label}
      </p>
      {hint && (
        <p className="px-3 pb-1 text-[9px] text-gray-600 leading-relaxed">{hint}</p>
      )}
      {items.map((item) => (
        <SidebarItem key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const sections: NavSection[] = [
    {
      label: 'Análise',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard/visao-geral',
          matchPrefix: '/dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          label: 'Comparações',
          href: '/compare/units',
          matchPrefix: '/compare',
          icon: <GitCompare className="h-4 w-4" />,
          children: [
            { label: 'Entre Unidades', href: '/compare/units' },
            { label: 'Entre Cenários', href: '/compare/scenarios' },
          ],
        },
      ],
    },
    {
      label: 'Gestão',
      hint: '① Unidades → ② Cenários → ③ Orçamento',
      items: [
        {
          label: 'Unidades',
          href: '/units',
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          label: 'Negócios',
          href: '/businesses',
          icon: <Briefcase className="h-4 w-4" />,
        },
        {
          label: 'Cenários',
          href: '/scenarios',
          icon: <Scale className="h-4 w-4" />,
        },
      ],
    },
    {
      label: 'Orçamento',
      items: [
        {
          label: 'Versões de Orçamento',
          href: '/budget',
          icon: <FileSpreadsheet className="h-4 w-4" />,
        },
        {
          label: 'Cálculos',
          href: '/dashboard/calculos',
          matchPrefix: '/dashboard/calculos',
          icon: <Calculator className="h-4 w-4" />,
          children: [
            { label: 'Cálculo Kit Higiene', href: '/dashboard/calculo-kit-higiene' },
            { label: 'Cálculo de Caixa', href: '/dashboard/calculo-caixa' },
          ],
        },
        {
          label: 'Importar Excel',
          href: '/import',
          icon: <Upload className="h-4 w-4" />,
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          label: 'Log de Auditoria',
          href: '/audit',
          icon: <ClipboardList className="h-4 w-4" />,
        },
        {
          label: 'Configurações',
          href: '/settings',
          icon: <Settings className="h-4 w-4" />,
        },
      ],
    },
  ];

  return (
    <aside
      className="w-60 shrink-0 flex flex-col min-h-screen"
      style={{ background: 'linear-gradient(180deg, #1E2A44 0%, #111827 100%)' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <AtlasLogo variant="mark" size={28} />
          <div>
            <p className="text-xs font-bold text-white tracking-tight leading-none">Atlas Finance</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Gestão Financeira</p>
          </div>
        </div>
      </div>

      {/* Business selector */}
      <div className="px-3 py-3 border-b border-white/10">
        <BusinessSelector />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            pathname={pathname}
            hint={section.hint}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-atlas-teal/20 border border-atlas-teal/30 flex items-center justify-center text-atlas-teal text-xs font-bold shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-tight">{user?.full_name ?? 'Usuário'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
