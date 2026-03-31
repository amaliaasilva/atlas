'use client';

/**
 * FE-B-11: Sincroniza useNavStore (businessId) → useDashboardFilters.
 * Resolve Bug B9: quando o usuário troca de negócio na Sidebar estando em
 * rotas sem GlobalFilters, o dashboardFilters ficava desatualizado.
 *
 * Esse componente é renderizado no layout do dashboard executivo (server component)
 * como filho client, ouvindo mudanças no navStore e propagando ao dashboardFilters.
 */

import { useEffect, useRef } from 'react';
import { useNavStore } from '@/store/auth';
import { useDashboardFilters } from '@/store/dashboard';

export function StoreSync() {
  const navBusinessId = useNavStore((s) => s.businessId);
  const navScenarioId = useNavStore((s) => s.scenarioId);
  const { businessId, setBusinessId, setScenarioId, setSelectedUnitIds } =
    useDashboardFilters();

  // Ref para evitar loop: só sincroniza quando o navStore REALMENTE mudou
  const prevNavBusiness = useRef<string | null>(undefined);
  const prevNavScenario = useRef<string | null>(undefined);

  useEffect(() => {
    if (prevNavBusiness.current === undefined) {
      // Primeira montagem: inicializa dashboardFilters com estado atual do nav
      prevNavBusiness.current = navBusinessId;
      prevNavScenario.current = navScenarioId;
      if (navBusinessId && navBusinessId !== businessId) {
        setBusinessId(navBusinessId);
        setSelectedUnitIds([]);
      }
      if (navScenarioId) {
        setScenarioId(navScenarioId);
      }
      return;
    }

    if (navBusinessId !== prevNavBusiness.current) {
      prevNavBusiness.current = navBusinessId;
      setBusinessId(navBusinessId);
      setScenarioId(null);
      setSelectedUnitIds([]);
    }

    if (navScenarioId !== prevNavScenario.current) {
      prevNavScenario.current = navScenarioId;
      setScenarioId(navScenarioId);
    }
  }, [navBusinessId, navScenarioId, businessId, setBusinessId, setScenarioId, setSelectedUnitIds]);

  return null; // componente puramente reativo, sem UI
}
