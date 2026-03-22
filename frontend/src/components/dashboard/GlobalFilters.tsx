'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessesApi, scenariosApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { useNavStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, RefreshCw, ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

function FilterSelect({ label, value, onChange, options, placeholder = 'Todos', disabled = false }: SelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:border-gray-300 transition-colors',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Multiselect dropdown para unidades
interface MultiSelectUnitProps {
  label: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function MultiSelectUnit({ label, selectedIds, onChange, options, disabled = false }: MultiSelectUnitProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((v) => v !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const displayLabel =
    selectedIds.length === 0
      ? 'Todas as unidades'
      : selectedIds.length === 1
        ? options.find((o) => o.value === selectedIds[0])?.label ?? '1 unidade'
        : `${selectedIds.length} unidades`;

  return (
    <div className="flex flex-col gap-1 min-w-[160px]" ref={ref}>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-between gap-2 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
          'hover:border-gray-300 transition-colors',
          selectedIds.length > 0 ? 'text-indigo-700 border-indigo-200 bg-indigo-50' : 'text-gray-700',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className="truncate max-w-[140px]">{displayLabel}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] max-h-60 overflow-y-auto">
          {/* Opção "Todas" */}
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
              selectedIds.length === 0 && 'text-indigo-700 font-semibold',
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded border border-gray-300">
              {selectedIds.length === 0 && <Check className="h-3 w-3 text-indigo-600" />}
            </span>
            Todas as unidades
          </button>
          <div className="border-t border-gray-100 my-0.5" />
          {options.map((o) => {
            const checked = selectedIds.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300',
                  )}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Gera opções mês+ano de Jan/2026 até Dez/2036
function generateMonthYearOptions() {
  const options: { value: string; label: string }[] = [];
  for (let y = 2026; y <= 2036; y++) {
    for (let m = 1; m <= 12; m++) {
      const value = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[m - 1]}/${y}`;
      options.push({ value, label });
    }
  }
  return options;
}

// Mantém presets anuais
function generateProjectionYears() {
  return Array.from({ length: 11 }, (_, i) => ({
    value: String(2026 + i),
    label: String(2026 + i),
  }));
}

const MONTH_YEAR_OPTIONS = generateMonthYearOptions();

interface GlobalFiltersProps {
  className?: string;
  showUnit?: boolean;
}

export function GlobalFilters({ className, showUnit = false }: GlobalFiltersProps) {
  const nav = useNavStore();
  const filters = useDashboardFilters();

  // Sincroniza filtros com o nav store ao montar
  useEffect(() => {
    if (nav.businessId && !filters.businessId) {
      filters.setBusinessId(nav.businessId);
    }
    if (nav.scenarioId && !filters.scenarioId) {
      filters.setScenarioId(nav.scenarioId);
    }
    // Sync unitId do nav para o filtro (apenas na primeira carga / quando vazio)
    if (showUnit && nav.unitId && filters.selectedUnitIds.length === 0) {
      filters.setSelectedUnitIds([nav.unitId]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.businessId, nav.scenarioId, nav.unitId]);

  // Busca businesses da organização selecionada
  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses', nav.organizationId],
    queryFn: () => businessesApi.list(nav.organizationId!),
    enabled: !!nav.organizationId,
  });

  // Busca cenários do business selecionado
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', filters.businessId],
    queryFn: () => scenariosApi.list(filters.businessId!),
    enabled: !!filters.businessId,
  });

  // Busca unidades do business selecionado
  const { data: units = [] } = useQuery({
    queryKey: ['units', filters.businessId],
    queryFn: () => unitsApi.list(filters.businessId!),
    enabled: !!filters.businessId && showUnit,
  });

  const scenarioTypeLabel: Record<string, string> = {
    base: 'Base',
    conservative: 'Conservador',
    aggressive: 'Otimista',
    custom: 'Personalizado',
  };

  const fromPeriod = filters.periodStart ?? '';
  const toPeriod = filters.periodEnd ?? '';

  return (
    <div
      className={cn(
        'bg-white border-b border-gray-100 px-6 py-3',
        'flex items-center gap-4 flex-wrap',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-gray-400 shrink-0">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Filtros</span>
      </div>

      <div className="h-5 w-px bg-gray-200 shrink-0" />

      <div className="flex items-end gap-3 flex-wrap">
        {/* Negócio */}
        {businesses.length > 0 && (
          <FilterSelect
            label="Negócio"
            value={filters.businessId ?? ''}
            onChange={(v) => {
              filters.setBusinessId(v || null);
              filters.setScenarioId(null);
              filters.setSelectedUnitIds([]);
            }}
            options={businesses.map((b) => ({ value: b.id, label: b.name }))}
          />
        )}

        {/* Cenário */}
        <FilterSelect
          label="Cenário"
          value={filters.scenarioId ?? ''}
          onChange={(v) => filters.setScenarioId(v || null)}
          options={scenarios.map((s) => ({
            value: s.id,
            label: `${s.name} (${scenarioTypeLabel[s.scenario_type] ?? s.scenario_type})`,
          }))}
          disabled={!filters.businessId}
        />

        {/* Unidade — multiselect */}
        {showUnit && (
          <MultiSelectUnit
            label="Unidade"
            selectedIds={filters.selectedUnitIds}
            onChange={(ids) => filters.setSelectedUnitIds(ids)}
            options={units.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))}
            disabled={!filters.businessId}
          />
        )}

        {/* Período De — granularidade mês */}
        <FilterSelect
          label="De"
          value={fromPeriod}
          onChange={(v) => {
            if (!v) {
              filters.setPeriodRange(null, null);
              filters.setYear(null);
              return;
            }
            const newEnd = toPeriod && toPeriod >= v ? toPeriod : v;
            filters.setYear(v.slice(0, 4));
            filters.setPeriodRange(v, newEnd);
          }}
          options={MONTH_YEAR_OPTIONS}
          placeholder="Início"
        />

        {/* Período Até — granularidade mês */}
        <FilterSelect
          label="Até"
          value={toPeriod}
          onChange={(v) => {
            if (!v) {
              filters.setPeriodRange(filters.periodStart, null);
              return;
            }
            const newStart = fromPeriod && fromPeriod <= v ? fromPeriod : v;
            filters.setPeriodRange(newStart, v);
          }}
          options={MONTH_YEAR_OPTIONS}
          placeholder="Final"
        />
      </div>

      {/* Reset */}
      {(filters.scenarioId || filters.selectedUnitIds.length > 0 || filters.year || filters.periodStart) && (
        <>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          {/* Presets rápidos de ano */}
          <div className="flex items-center gap-1">
            {['2026', '2027', '2028'].map((y) => (
              <button
                key={y}
                onClick={() => {
                  filters.setYear(y);
                  filters.setPeriodRange(`${y}-01`, `${y}-12`);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                  filters.year === y && filters.periodStart?.startsWith(y)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          <button
            onClick={() => {
              filters.setScenarioId(null);
              filters.setSelectedUnitIds([]);
              filters.setYear(null);
              filters.setPeriodRange(null, null);
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Limpar
          </button>
        </>
      )}
    </div>
  );
}

