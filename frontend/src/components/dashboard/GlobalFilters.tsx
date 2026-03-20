'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessesApi, scenariosApi, unitsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { useNavStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';

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

// Anos de projeção do negócio (2026–2036)
function generateProjectionYears() {
  return Array.from({ length: 11 }, (_, i) => ({
    value: String(2026 + i),
    label: String(2026 + i),
  }));
}

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
  }, [nav.businessId, nav.scenarioId]);

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
              filters.setUnitId(null);
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

        {/* Unidade */}
        {showUnit && (
          <FilterSelect
            label="Unidade"
            value={filters.unitId ?? ''}
            onChange={(v) => filters.setUnitId(v || null)}
            options={units.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))}
            disabled={!filters.businessId}
            placeholder="Todas as unidades"
          />
        )}

        {/* Período De */}
        <FilterSelect
          label="De"
          value={filters.periodStart ? filters.periodStart.slice(0, 4) : ''}
          onChange={(v) => {
            filters.setYear(v || null);
            filters.setPeriodRange(v ? `${v}-01` : null, filters.periodEnd);
          }}
          options={generateProjectionYears()}
          placeholder="Início"
        />

        {/* Período Até */}
        <FilterSelect
          label="Até"
          value={filters.periodEnd ? filters.periodEnd.slice(0, 4) : ''}
          onChange={(v) => {
            filters.setPeriodRange(filters.periodStart, v ? `${v}-12` : null);
          }}
          options={generateProjectionYears()}
          placeholder="Final"
        />
      </div>

      {/* Reset */}
      {(filters.businessId || filters.scenarioId || filters.unitId || filters.year || filters.periodStart) && (
        <>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          <button
            onClick={() => {
              filters.setScenarioId(null);
              filters.setUnitId(null);
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
