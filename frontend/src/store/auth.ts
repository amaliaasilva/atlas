import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';

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
  setOrganization: (id: string) => void;
  setBusiness: (id: string) => void;
  setUnit: (id: string) => void;
  setScenario: (id: string) => void;
  setVersion: (id: string) => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      organizationId: null,
      businessId: null,
      unitId: null,
      scenarioId: null,
      versionId: null,
      setOrganization: (id) => set({ organizationId: id, businessId: null, unitId: null, scenarioId: null, versionId: null }),
      setBusiness: (id) => set({ businessId: id, unitId: null, scenarioId: null, versionId: null }),
      setUnit: (id) => set({ unitId: id, versionId: null }),
      setScenario: (id) => set({ scenarioId: id, versionId: null }),
      setVersion: (id) => set({ versionId: id }),
    }),
    { name: 'atlas-nav' },
  ),
);
