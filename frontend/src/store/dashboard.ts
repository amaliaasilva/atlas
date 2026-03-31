import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Dashboard Filter Store ────────────────────────────────────────────────────
// Estado global dos filtros do módulo de dashboards executivos

export type GranularityType = 'monthly' | 'annual' | 'period';

interface DashboardFiltersState {
  // Contexto de negócio (espelha navStore mas com controle independente)
  businessId: string | null;
  scenarioId: string | null;
  /** Seleção de unidades (vazio = todas — visão consolidada) */
  selectedUnitIds: string[];
  /** @deprecated use selectedUnitIds; mantido para compat. com páginas existentes */
  unitId: string | null;

  // Filtros temporais
  year: string | null; // ex: "2026"
  periodStart: string | null; // ex: "2026-01"
  periodEnd: string | null;   // ex: "2026-12"

  // Granularidade da visão (mensal, anual ou período customizado)
  granularity: GranularityType;

  // Comparação de cenários
  compareScenarioIds: string[];

  // Ações
  setBusinessId: (id: string | null) => void;
  setScenarioId: (id: string | null) => void;
  setSelectedUnitIds: (ids: string[]) => void;
  setUnitId: (id: string | null) => void;
  setYear: (year: string | null) => void;
  setPeriodRange: (start: string | null, end: string | null) => void;
  setGranularity: (g: GranularityType) => void;
  setCompareScenarios: (ids: string[]) => void;
  /** Aplica um ano completo (Jan→Dez) como filtro ativo */
  applyYearPreset: (year: string) => void;
  /** Remove todos os filtros de período, mantendo negócio e cenário */
  clearPeriod: () => void;
  reset: () => void;
}

const defaults = {
  businessId: null,
  scenarioId: null,
  selectedUnitIds: [] as string[],
  unitId: null,
  year: null,
  periodStart: null,
  periodEnd: null,
  granularity: 'annual' as GranularityType,
  compareScenarioIds: [],
};

export const useDashboardFilters = create<DashboardFiltersState>()(
  persist(
    (set) => ({
      ...defaults,
      setBusinessId: (id) => set({ businessId: id }),
      setScenarioId: (id) => set({ scenarioId: id }),
      setSelectedUnitIds: (ids) =>
        set({ selectedUnitIds: ids, unitId: ids.length === 1 ? ids[0] : null }),
      setUnitId: (id) => set({ unitId: id, selectedUnitIds: id ? [id] : [] }),
      setYear: (year) => set({ year }),
      setPeriodRange: (start, end) => set({ periodStart: start, periodEnd: end }),
      setGranularity: (g) => set({ granularity: g }),
      setCompareScenarios: (ids) => set({ compareScenarioIds: ids }),
      applyYearPreset: (year) =>
        set({
          year,
          periodStart: `${year}-01`,
          periodEnd: `${year}-12`,
          granularity: 'annual',
        }),
      clearPeriod: () =>
        set({ year: null, periodStart: null, periodEnd: null }),
      reset: () => set(defaults),
    }),
    { name: 'atlas-dashboard-filters' },
  ),
);

