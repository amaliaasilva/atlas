'use client';

import { useState } from 'react';
import type { AuditTraceResponse, CalcTrace } from '@/types/api';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data: AuditTraceResponse;
}

function TraceSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({ name, value }: { name: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-slate-500">{name}: </span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function PeriodPanel({ trace: t }: { trace: CalcTrace }) {
  const [open, setOpen] = useState(false);
  const { trace } = t;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Cabeçalho clicável */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-slate-700">{t.period}</span>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Resultado: <strong className={trace.kpis.net_result >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatCurrency(trace.kpis.net_result)}</strong></span>
          <span>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 bg-white space-y-1">
          <TraceSection label="Receita">
            <Field name="Cowork" value={formatCurrency(trace.revenue.cowork_revenue)} />
            <Field name="Outros" value={formatCurrency(trace.revenue.other_revenue)} />
            <Field name="Preço/hora" value={formatCurrency(trace.revenue.avg_price_per_hour)} />
            <Field name="Ocupação" value={`${(trace.revenue.occupancy_rate * 100).toFixed(1)}%`} />
          </TraceSection>

          <TraceSection label="Custos Fixos">
            <Field name="Aluguel" value={formatCurrency(trace.fixed_costs.rent)} />
            <Field name="Pessoal" value={formatCurrency(trace.fixed_costs.staff)} />
            <Field name="Utilidades" value={formatCurrency(trace.fixed_costs.utilities)} />
            <Field name="Admin" value={formatCurrency(trace.fixed_costs.admin)} />
          </TraceSection>

          <TraceSection label="Custos Variáveis">
            <Field name="Kit higiene" value={formatCurrency(trace.variable_costs.hygiene_kit)} />
            <Field name="Comissão" value={formatCurrency(trace.variable_costs.sales_commission)} />
            <Field name="Taxa cartão" value={formatCurrency(trace.variable_costs.card_fee ?? 0)} />
          </TraceSection>

          <TraceSection label="Impostos & Financiamento">
            <Field name="Taxa" value={`${((trace.taxes.tax_rate ?? 0) * 100).toFixed(1)}%`} />
            <Field name="Impostos" value={formatCurrency(trace.taxes.taxes_on_revenue)} />
            <Field name="Financiamento" value={formatCurrency(trace.financing?.total_payment ?? 0)} />
          </TraceSection>

          <TraceSection label="KPIs">
            <Field name="Margem CM" value={`${((trace.kpis.contribution_margin_pct ?? 0) * 100).toFixed(1)}%`} />
            <Field name="BE Ocupação" value={`${((trace.kpis.break_even_occupancy_pct ?? 0) * 100).toFixed(1)}%`} />
            <Field name="BE Receita" value={formatCurrency(trace.kpis.break_even_revenue ?? 0)} />
            <Field name="EBITDA" value={formatCurrency(trace.kpis.ebitda ?? 0)} />
            <Field name="Prof. Pessimista" value={String(trace.kpis.teachers_needed_pessimistic ?? '-')} />
            <Field name="Prof. Otimista" value={String(trace.kpis.teachers_needed_optimistic ?? '-')} />
          </TraceSection>
        </div>
      )}
    </div>
  );
}

/**
 * AuditTracePanel — acordeão por período mostrando os traces de cálculo.
 */
export function AuditTracePanel({ data }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">
        {data.traces.length} períodos · Clique para expandir os detalhes de cálculo
      </p>
      {data.traces.map((t) => (
        <PeriodPanel key={t.period} trace={t} />
      ))}
    </div>
  );
}
