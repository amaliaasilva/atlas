'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useNavStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingScreen } from '@/components/ui/Spinner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();
  const { businessId } = useNavStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    // Se está em uma sub-rota do dashboard e não tem negócio selecionado,
    // redireciona para /dashboard (seletor de organização/negócio).
    if (pathname.startsWith('/dashboard/') && !businessId) {
      router.replace('/dashboard');
    }
  }, [mounted, token, businessId, pathname, router]);

  if (!mounted || !token) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
