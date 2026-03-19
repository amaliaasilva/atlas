'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingScreen } from '@/components/ui/Spinner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();
  // 'mounted' garante que não redirecionamos durante o render SSR (antes do localStorage).
  // O zustand/persist com localStorage é síncrono, então após o mount o token já está disponível.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) router.replace('/login');
  }, [mounted, token, router]);

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
