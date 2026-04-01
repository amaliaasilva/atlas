import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';
// FIX B9: importado para sincronizar os dois stores ao trocar de negócio/cenário
import { useDashboardFilters } from './dashboard';

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('atlas_token', token);
          // Cookie para SSR middleware guard (7 dias).
          // Deve ser '__session' — Firebase Hosting só encaminha esse nome para o Cloud Run.
          document.cookie = `__session=1; path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 7}`;
        }
        set({ token });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('atlas_token');
          document.cookie = '__session=; path=/; max-age=0';
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'atlas-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

// ── Store de contexto de navegação ────────────────────────────────────────────

interface NavState {
  organizationId: string | null;
  businessId: string | null;
  unitId: string | null;
  scenarioId: string | null;
  versionId: string | null;
  setOrganization: (id: string | null) => void;
  setBusiness: (id: string | null) => void;
  setUnit: (id: string | null) => void;
  setScenario: (id: string | null) => void;
  setVersion: (id: string | null) => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      organizationId: null,
      businessId: null,
      unitId: null,
      scenarioId: null,
      versionId: null,
      setOrganization: (id) => {
        set({ organizationId: id, businessId: null, unitId: null, scenarioId: null, versionId: null });
        // FIX B9: propaga para dashboardFilters independente de GlobalFilters estar montado
        useDashboardFilters.getState().setBusinessId(null);
        useDashboardFilters.getState().setScenarioId(null);
        useDashboardFilters.getState().setSelectedUnitIds([]);
      },
      setBusiness: (id) => {
        set({ businessId: id, unitId: null, scenarioId: null, versionId: null });
        // FIX B9: propaga para dashboardFilters independente de GlobalFilters estar montado
        useDashboardFilters.getState().setBusinessId(id);
        useDashboardFilters.getState().setScenarioId(null);
        useDashboardFilters.getState().setSelectedUnitIds([]);
      },
      setUnit: (id) => set({ unitId: id, versionId: null }),
      setScenario: (id) => {
        set({ scenarioId: id, versionId: null });
        // FIX B9: propaga para dashboardFilters
        useDashboardFilters.getState().setScenarioId(id);
      },
      setVersion: (id) => set({ versionId: id }),
    }),
    { name: 'atlas-nav' },
  ),
);
