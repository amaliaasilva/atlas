'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '@/lib/api';
import { AlertTriangle, Calendar, Settings } from 'lucide-react';
import type { MonthSummaryOut } from '@/types/api';
import { HolidayOverrideForm } from './HolidayOverrideForm';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function EstimateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      <AlertTriangle className="h-3 w-3" />
      estimativa
    </span>
  );
}

interface Props {
  unitId: string;
  year: number;
}

export function CalendarCapacityBlock({ unitId, year }: Props) {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['calendar-unit', unitId, year],
    queryFn: () => calendarApi.getUnit(unitId, year),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasEstimates = data.has_estimates;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Calendário Operacional {year}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {hasEstimates && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Alguns meses usam estimativa (22 dias úteis)
            </span>
          )}
          <span>Total: <strong className="text-gray-700">{data.total_working_days} dias úteis</strong></span>
          <span>{data.total_holiday_days} feriados</span>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Settings className="h-3 w-3" />
            Gerenciar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {data.months.map((m: MonthSummaryOut) => {
          const monthIdx = parseInt(m.year_month.split('-')[1], 10) - 1;
          const monthName = MONTH_NAMES[monthIdx] ?? m.year_month;
          const fillPct = Math.min(m.effective_working_days / 23, 1);
          const fillColor =
            m.is_estimate
              ? 'bg-amber-400'
              : m.holiday_days > 0
              ? 'bg-indigo-400'
              : 'bg-emerald-400';

          return (
            <div
              key={m.year_month}
              className="relative rounded-lg border border-gray-100 bg-gray-50 p-2 flex flex-col items-center gap-1 overflow-hidden"
              title={`${m.year_month}: ${m.effective_working_days} dias úteis, ${m.holiday_days} feriados${m.is_estimate ? ' (estimativa)' : ''}`}
            >
              {/* fill bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 ${fillColor} opacity-20 transition-all`}
                style={{ height: `${fillPct * 100}%` }}
              />
              <span className="relative text-[10px] font-bold text-gray-500">{monthName}</span>
              <span className="relative text-sm font-bold text-gray-800">{m.effective_working_days}</span>
              {m.holiday_days > 0 && (
                <span className="relative text-[9px] text-indigo-500 font-semibold">
                  {m.holiday_days}🎌
                </span>
              )}
              {m.saturday_days > 0 && (
                <span className="relative text-[9px] text-gray-400">{m.saturday_days}sáb</span>
              )}
              {m.is_estimate && (
                <span className="relative text-[9px] text-amber-600 font-semibold">est.</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-emerald-400 opacity-70" />
          Dados reais
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-indigo-400 opacity-70" />
          Com feriados
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-amber-400 opacity-70" />
          Estimativa (22 dias)
        </span>
      </div>

      {showForm && (
        <HolidayOverrideForm
          unitId={unitId}
          year={year}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
