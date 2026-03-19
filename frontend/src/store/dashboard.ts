import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Dashboard Filter Store ────────────────────────────────────────────────────
// Estado global dos filtros do módulo de dashboards executivos

interface DashboardFiltersState {
  // Contexto de negócio (espelha navStore mas com controle independente)
  businessId: string | null;
  scenarioId: string | null;
  unitId: string | null; // null = visão de rede completa
  versionId: string | null;

  // Filtros temporais
  year: string | null; // ex: "2026"
  periodStart: string | null; // ex: "2026-01"
  periodEnd: string | null; // ex: "2026-12"

  // Comparação de cenários
  compareScenarioIds: string[];

  // Ações
  setBusinessId: (id: string | null) => void;
  setScenarioId: (id: string | null) => void;
  setUnitId: (id: string | null) => void;
  setVersionId: (id: string | null) => void;
  setYear: (year: string | null) => void;
  setPeriodRange: (start: string | null, end: string | null) => void;
  setCompareScenarios: (ids: string[]) => void;
  reset: () => void;
}

const defaults = {
  businessId: null,
  scenarioId: null,
  unitId: null,
  versionId: null,
  year: null,
  periodStart: null,
  periodEnd: null,
  compareScenarioIds: [],
};

export const useDashboardFilters = create<DashboardFiltersState>()(
  persist(
    (set) => ({
      ...defaults,
      setBusinessId: (id) => set({ businessId: id }),
      setScenarioId: (id) => set({ scenarioId: id }),
      setUnitId: (id) => set({ unitId: id }),
      setVersionId: (id) => set({ versionId: id }),
      setYear: (year) => set({ year }),
      setPeriodRange: (start, end) => set({ periodStart: start, periodEnd: end }),
      setCompareScenarios: (ids) => set({ compareScenarioIds: ids }),
      reset: () => set(defaults),
    }),
    { name: 'atlas-dashboard-filters' },
  ),
);
