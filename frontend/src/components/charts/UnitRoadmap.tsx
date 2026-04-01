'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { unitsApi, versionsApi, calculationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pencil, Check, X } from 'lucide-react';
import type { Unit } from '@/types/api';

interface UnitRoadmapProps {
  businessId: string;
  /** Se true, exibe inputs de edição inline de opening_date */
  editable?: boolean;
}

const STATUS_COLORS: Record<string, { dot: string; pill: string; label: string }> = {
  active:      { dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Ativa' },
  pre_opening: { dot: 'bg-sky-500 animate-pulse', pill: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Pré-abertura' },
  planning:    { dot: 'bg-indigo-400', pill: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Planejamento' },
  closed:      { dot: 'bg-gray-300', pill: 'bg-gray-100 text-gray-400 border-gray-200', label: 'Encerrada' },
};

function formatDateBr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function UnitCard({ unit, editable }: { unit: Unit; editable: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(unit.opening_date ?? '');

  const saveMutation = useMutation({
    mutationFn: async (date: string) => {
      await unitsApi.update(unit.id, { opening_date: date || undefined });
      const versions = await versionsApi.list(unit.id);
      const active = versions.filter((v) => v.status !== 'archived');
      await Promise.allSettled(active.map((v) => calculationsApi.recalculate(v.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['dre'] });
      queryClient.invalidateQueries({ queryKey: ['dre-consolidated'] });
      setEditing(false);
    },
  });

  const colors = STATUS_COLORS[unit.status] ?? STATUS_COLORS.planning;

  return (
    <div className="flex flex-col gap-2 min-w-[160px] max-w-[200px]">
      {/* Dot marker */}
      <div className="flex items-center gap-2">
        <span className={cn('h-3 w-3 rounded-full shrink-0 border-2 border-white shadow', colors.dot)} />
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold', colors.pill)}>
          {colors.label}
        </span>
      </div>

      {/* Nome da unidade */}
      <p className="text-xs font-bold text-gray-900 leading-tight">{unit.code} — {unit.name}</p>
      {unit.city && (
        <p className="text-[10px] text-gray-400">{unit.city}{unit.state ? `, ${unit.state}` : ''}</p>
      )}

      {/* Data de abertura + edição inline */}
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="text-[10px] border border-indigo-300 rounded px-1.5 py-0.5 w-[110px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              autoFocus
            />
            <button
              onClick={() => saveMutation.mutate(dateValue)}
              disabled={saveMutation.isPending}
              className="h-5 w-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
              title="Salvar"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => { setDateValue(unit.opening_date ?? ''); setEditing(false); }}
              className="h-5 w-5 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] text-gray-500 font-medium">
              {formatDateBr(unit.opening_date)}
            </span>
            {editable && (
              <button
                onClick={() => { setDateValue(unit.opening_date ?? ''); setEditing(true); }}
                className="h-4 w-4 flex items-center justify-center rounded text-gray-300 hover:text-indigo-500 transition-colors"
                title="Editar data de abertura"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function UnitRoadmap({ businessId, editable = false }: UnitRoadmapProps) {
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId),
    enabled: !!businessId,
  });

  if (isLoading) {
    return (
      <div className="h-28 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
    );
  }

  if (units.length === 0) return null;

  // Ordena: ativas/pré-abertura primeiro por data, depois planejadas, depois encerradas
  const STATUS_ORDER: Record<string, number> = { active: 0, pre_opening: 1, planning: 2, closed: 3 };
  const sorted = [...units].sort((a, b) => {
    const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (so !== 0) return so;
    if (a.opening_date && b.opening_date) return a.opening_date.localeCompare(b.opening_date);
    if (a.opening_date) return -1;
    if (b.opening_date) return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-bold text-gray-700">ROADMAP DE EXPANSÃO</span>
        <span className="text-[10px] text-gray-400">{sorted.length} unidade{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Linha do tempo */}
      <div className="relative">
        {/* Trilho */}
        <div className="absolute top-[5px] left-0 right-0 h-px bg-gray-200" />
        {/* Cards */}
        <div className="flex gap-6 min-w-max pb-2">
          {sorted.map((unit) => (
            <UnitCard key={unit.id} unit={unit} editable={editable} />
          ))}
        </div>
      </div>
    </div>
  );
}
