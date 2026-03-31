'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { X, Plus, AlertTriangle } from 'lucide-react';

const EXCEPTION_TYPES = [
  { value: 'holiday_national', label: 'Feriado Nacional' },
  { value: 'holiday_state', label: 'Feriado Estadual' },
  { value: 'holiday_municipal', label: 'Feriado Municipal' },
  { value: 'manual_close', label: 'Fechamento Manual' },
  { value: 'manual_open', label: 'Abertura Manual (override)' },
];

interface Props {
  unitId: string | null;  // null = nacional
  year: number;
  onClose: () => void;
}

export function HolidayOverrideForm({ unitId, year, onClose }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [type, setType] = useState('holiday_municipal');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const calKey = unitId
    ? ['calendar-unit', unitId, year]
    : ['calendar-national', year];

  const { data: calData } = useQuery({
    queryKey: calKey,
    queryFn: () =>
      unitId ? calendarApi.getUnit(unitId, year) : calendarApi.getNational(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      calendarApi.createException({
        unit_id: unitId,
        exception_date: date,
        exception_type: type,
        description,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calKey });
      setDate('');
      setDescription('');
      setNotes('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description) return;
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">
              {unitId ? 'Exceções de Calendário da Unidade' : 'Feriados Nacionais'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Ano {year}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          {calData && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-lg font-bold text-gray-900">{calData.total_working_days}</p>
                <p className="text-xs text-gray-400">dias úteis</p>
              </div>
              <div>
                <p className="text-lg font-bold text-indigo-600">{calData.total_holiday_days}</p>
                <p className="text-xs text-gray-400">feriados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500">
                  {calData.months.filter((m) => m.is_estimate).length}
                </p>
                <p className="text-xs text-gray-400">meses estimados</p>
              </div>
            </div>
          )}

          {calData?.has_estimates && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Alguns meses ainda usam estimativa de 22 dias úteis. Cadastre os feriados para
                que o motor financeiro use valores reais.
              </span>
            </div>
          )}

          {/* Add exception form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Adicionar Exceção
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="atlas-label">Data *</label>
                <input
                  type="date"
                  className="atlas-input"
                  value={date}
                  min={`${year}-01-01`}
                  max={`${year}-12-31`}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="atlas-label">Tipo *</label>
                <select
                  className="atlas-input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {EXCEPTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="atlas-label">Descrição *</label>
                <input
                  className="atlas-input"
                  placeholder="Ex: Aniversário da cidade"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="atlas-label">Notas internas</label>
                <input
                  className="atlas-input"
                  placeholder="Opcional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              {createMutation.isError && (
                <span className="text-xs text-red-500 self-center">
                  Erro ao salvar. Data pode já existir.
                </span>
              )}
              <Button type="submit" size="sm" disabled={createMutation.isPending || !date || !description}>
                <Plus className="h-3.5 w-3.5" />
                {createMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
