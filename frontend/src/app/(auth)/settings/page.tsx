'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { LoadingScreen } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: !!user?.is_superuser,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Configurações" />
      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        {/* Perfil */}
        <Card title="Meu Perfil">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nome</span>
              <span className="font-medium text-gray-900">{user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">E-mail</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Perfil</span>
              <StatusBadge status={user?.is_superuser ? 'admin' : 'user'} />
            </div>
          </div>
        </Card>

        {/* Lista de usuários (apenas superuser) */}
        {user?.is_superuser && (
          <Card title="Usuários do Sistema">
            <table className="atlas-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td className="text-gray-500 text-xs">{u.email}</td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'closed'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Versão */}
        <div className="text-xs text-gray-400 text-center pt-4">
          Atlas Finance · v1.0.0 · Build {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
}
