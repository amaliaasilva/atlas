'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, MapPin, TrendingUp,
  FileSpreadsheet, Upload, ClipboardList, Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuthStore, useNavStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  matchPrefix?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { businessId } = useNavStore();

  const items: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/visao-geral',
      matchPrefix: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Unidades',
      href: '/units',
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: 'Cenários',
      href: '/scenarios',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: 'Orçamento',
      href: '/budget',
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      label: 'Comparações',
      href: '/compare/units',
      icon: <Building2 className="h-4 w-4" />,
      children: [
        { label: 'Entre Unidades', href: '/compare/units' },
        { label: 'Entre Cenários', href: '/compare/scenarios' },
      ],
    },
    {
      label: 'Importar Excel',
      href: '/import',
      icon: <Upload className="h-4 w-4" />,
    },
    {
      label: 'Auditoria',
      href: '/audit',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-gray-900 min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-700/50 flex items-center gap-3">
        <Image
          src="/logo-atlas.svg"
          alt="Atlas Finance"
          width={130}
          height={32}
          className="h-8 w-auto object-contain brightness-0 invert"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const prefix = item.matchPrefix ?? item.href.split('?')[0];
          const active = pathname === item.href || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                {item.icon}
                {item.label}
                {item.children && <ChevronDown className="ml-auto h-3 w-3" />}
              </Link>
              {item.children && active && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={cn(
                        'block px-3 py-1.5 rounded-md text-xs transition-colors',
                        pathname === c.href
                          ? 'text-brand-300 font-medium'
                          : 'text-gray-500 hover:text-gray-300',
                      )}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-700/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0) ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name ?? 'Usuário'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
