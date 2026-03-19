'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Input, Select } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/ui/Spinner';

const ENTITY_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'assumption_value', label: 'Premissas' },
  { value: 'budget_version',   label: 'Versões de Orçamento' },
  { value: 'unit',             label: 'Unidades' },
  { value: 'scenario',         label: 'Cenários' },
  { value: 'user',             label: 'Usuários' },
];

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-600',
  update: 'text-blue-600',
  delete: 'text-red-500',
  publish: 'text-purple-600',
  archive: 'text-amber-600',
  login: 'text-gray-600',
  recalculate: 'text-indigo-600',
};

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', entityType, page],
    queryFn: () => auditApi.list({ entity_type: entityType || undefined, skip: page * LIMIT, limit: LIMIT }),
  });

  const filtered = logs?.filter((l) =>
    !search || l.user_email.includes(search) || l.entity_type.includes(search) || l.action.includes(search),
  ) ?? [];

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Auditoria" />
      <div className="flex-1 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Log de Auditoria</h2>
          <p className="text-sm text-gray-500 mt-0.5">Todas as ações realizadas no sistema</p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuário, ação…"
            className="w-64"
          />
          <Select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
            options={ENTITY_TYPES}
            className="w-48"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="atlas-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>ID</th>
                <th>Alterações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="text-xs text-gray-700">{log.user_email}</td>
                  <td>
                    <span className={`text-xs font-semibold uppercase ${ACTION_COLORS[log.action] ?? 'text-gray-500'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">{log.entity_type}</td>
                  <td className="text-xs text-gray-400 font-mono">{log.entity_id.slice(0, 8)}</td>
                  <td className="text-xs text-gray-400 max-w-[200px] truncate">
                    {log.changes ? JSON.stringify(log.changes) : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{filtered.length} registros</span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs text-brand-600 hover:underline disabled:text-gray-300"
              >
                ← Anterior
              </button>
              <button
                disabled={(logs?.length ?? 0) < LIMIT}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs text-brand-600 hover:underline disabled:text-gray-300"
              >
                Próxima →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
