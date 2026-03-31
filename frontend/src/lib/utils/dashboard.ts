/**
 * Utilitários compartilhados para o módulo de dashboard.
 * Extraído de crescimento/estrategico/projecoes que tinham a mesma função local (P0.9 DRY).
 */

import type { AnnualSummaryBackend } from '@/types/api';

export interface AnnualRow {
  year: string;
  revenue: number;
  profit: number;
  margin: number;
}

/**
 * Agrega uma série temporal mensal em resumo anual.
 * Usado quando o backend não retorna annual_summaries ou como fallback.
 */
export function aggregateByYear(
  ts: Array<{ period: string; revenue: number; profit: number }>,
): AnnualRow[] {
  const byYear: Record<string, { revenue: number; profit: number }> = {};
  for (const d of ts) {
    const year = d.period.split('-')[0];
    if (!byYear[year]) byYear[year] = { revenue: 0, profit: 0 };
    byYear[year].revenue += d.revenue;
    byYear[year].profit += d.profit;
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({
      year,
      revenue: Math.round(v.revenue),
      profit: Math.round(v.profit),
      margin: v.revenue > 0 ? v.profit / v.revenue : 0,
    }));
}

/**
 * Converte o AnnualSummaryBackend do endpoint /annual para o formato AnnualRow usado nos charts.
 */
export function annualBackendToRows(summaries: AnnualSummaryBackend[]): AnnualRow[] {
  return summaries.map((s) => ({
    year: s.year,
    revenue: Math.round(s.revenue_total),
    profit: Math.round(s.net_result),
    margin: s.net_margin,
  }));
}

/**
 * FIX B11: resolve annual data preferindo annual_summaries do backend (mais preciso)
 * e fazendo fallback para agregação local do time_series.
 */
export function resolveAnnualData(
  annualSummaries: AnnualSummaryBackend[] | undefined,
  timeSeries: Array<{ period: string; revenue_total?: number; gross_revenue?: number; net_result: number }>,
): AnnualRow[] {
  if (annualSummaries && annualSummaries.length > 0) {
    return annualBackendToRows(annualSummaries);
  }
  return aggregateByYear(
    timeSeries.map((d) => ({
      period: d.period,
      revenue: d.revenue_total ?? d.gross_revenue ?? 0,
      profit: d.net_result,
    })),
  );
}
