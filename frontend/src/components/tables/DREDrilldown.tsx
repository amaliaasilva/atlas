'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { PeriodTraceResponse, PeriodCodeBreakdownResponse } from '@/types/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatPeriodHeader(period: string): string {
  const [year, month] = period.split('-');
  const m = Number(month);
  if (!year || !m || m < 1 || m > 12) return period;
  return `${MONTH_ABBR[m - 1]}/${year.slice(2)}`;
}

function fmtPct(rate: number, decimals = 1) {
  return `${(rate * 100).toFixed(decimals)}%`;
}

// ── Primitivos ────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-slate-100 my-2" />;
}

function Row({
  label,
  value,
  sub,
  highlight = false,
  negative = false,
  indent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  negative?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={`flex justify-between items-start gap-3 ${indent ? 'pl-3' : ''}`}>
      <span className={`text-xs ${highlight ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
        {label}
        {sub && <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{sub}</span>}
      </span>
      <span
        className={`text-xs font-medium whitespace-nowrap ${
          highlight
            ? negative
              ? 'text-rose-700 font-bold'
              : 'text-emerald-700 font-bold'
            : negative
              ? 'text-rose-600'
              : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Seções de conteúdo ────────────────────────────────────────────────────────

function RevenueSection({ data }: { data: PeriodTraceResponse }) {
  const r = data.revenue;
  if (!r) return null;

  return (
    <div className="space-y-2">
      <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Capacidade instalada</span>
          <span className="font-medium text-slate-700">
            {Math.round(r.capacity_hours_month).toLocaleString('pt-BR')} h/mês
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Taxa de ocupação</span>
          <span className="font-semibold text-blue-700">{fmtPct(r.occupancy_rate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Horas vendidas</span>
          <span className="font-medium text-slate-700">
            {Math.round(r.active_hours_month).toLocaleString('pt-BR')} h/mês
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Preço médio/hora</span>
          <span className="font-medium text-slate-700">{formatCurrency(r.avg_price_per_hour, 2)}</span>
        </div>
      </div>

      {r.service_plans && r.service_plans.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Mix de planos</p>
          {r.service_plans.map((p) => (
            <div key={p.name} className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{p.name}</span>
              <div className="text-right">
                <span className="text-slate-600 font-medium">{fmtPct(p.mix)}</span>
                <span className="text-slate-400 ml-2 text-[11px]">{formatCurrency(p.price, 2)}/h</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Divider />
      <Row label="Receita Coworking" value={formatCurrency(r.cowork_revenue)} />
      {r.other_revenue > 0 && (
        <Row label="Outras Receitas" value={formatCurrency(r.other_revenue)} />
      )}
      <Row label="Total Receitas" value={formatCurrency(r.total)} highlight />
    </div>
  );
}

function FixedCostsSection({ data }: { data: PeriodTraceResponse }) {
  const fc = data.fixed_costs;
  if (!fc) return null;

  const items = [
    { label: 'Aluguel + Condomínio + IPTU', value: fc.rent },
    { label: 'Pessoal', value: fc.staff },
    { label: 'Utilidades (Energia, Água, Internet)', value: fc.utilities },
    { label: 'Administração', value: fc.admin },
    { label: 'Marketing', value: fc.marketing },
    { label: 'Equipamentos', value: fc.equipment },
    { label: 'Seguros', value: fc.insurance },
    { label: 'Outros fixos', value: fc.other },
  ].filter((i) => i.value > 0);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between items-center text-xs">
          <span className="text-slate-500">{item.label}</span>
          <div className="text-right">
            <span className="text-slate-700 font-medium">{formatCurrency(item.value)}</span>
            {fc.total > 0 && (
              <span className="text-slate-400 ml-1 text-[10px]">
                ({((item.value / fc.total) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      ))}
      <Divider />
      <Row label="Total Custos Fixos" value={formatCurrency(fc.total)} highlight negative />
    </div>
  );
}

function StaffSection({ data, rowCode }: { data: PeriodTraceResponse; rowCode: string }) {
  const s = data.staff;
  if (!s) return null;

  return (
    <div className="space-y-2">
      <Row
        label="Pro-labore (sem encargos)"
        value={formatCurrency(s.pro_labore)}
        highlight={rowCode === 'fc_pro_labore'}
      />
      <Row
        label="Folha CLT (base)"
        value={formatCurrency(s.clt_base)}
        highlight={rowCode === 'fc_clt_base'}
      />
      <Row
        label="Encargos sociais"
        sub="≈ 80% × CLT (INSS + FGTS + 13º + férias)"
        value={formatCurrency(s.social_charges)}
        highlight={rowCode === 'fc_social_charges'}
      />
      <Row label="Benefícios" value={formatCurrency(s.benefits)} />
      <Divider />
      <Row label="Total Pessoal" value={formatCurrency(s.total)} highlight negative />
    </div>
  );
}

function UtilitiesSection({ data, rowCode }: { data: PeriodTraceResponse; rowCode: string }) {
  const u = data.utilities;
  if (!u) return null;

  const showElec = !['fc_water', 'fc_internet'].includes(rowCode);
  const showWater = !['fc_electricity', 'fc_internet'].includes(rowCode);
  const showInternet = !['fc_electricity', 'fc_water'].includes(rowCode);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Taxa de ocupação:&nbsp;<strong className="text-blue-700">{fmtPct(u.occupancy_rate_used)}</strong>
      </div>

      {showElec && (
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span className="text-sm font-medium text-slate-700">Energia Elétrica</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(u.electricity)}</span>
          </div>
          <div className="px-4 py-2 space-y-1 bg-white">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Parcela fixa</span>
              <span>{formatCurrency(u.electricity_fixed)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Variável ({fmtPct(u.occupancy_rate_used)} occ.)</span>
              <span>{formatCurrency(u.electricity_variable)}</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
              = (fixo + variável_máx × occ) × (1 − automação)
            </div>
          </div>
        </div>
      )}

      {showWater && (
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-50">
            <div className="flex items-center gap-2">
              <span className="text-base">💧</span>
              <span className="text-sm font-medium text-slate-700">Água e Esgoto</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(u.water)}</span>
          </div>
          <div className="px-4 py-2 space-y-1 bg-white">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Parcela fixa</span>
              <span>{formatCurrency(u.water_fixed)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Variável ({fmtPct(u.occupancy_rate_used)} occ.)</span>
              <span>{formatCurrency(u.water_variable)}</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5 font-mono">= fixo + variável_máx × occ</div>
          </div>
        </div>
      )}

      {showInternet && (
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-base">📡</span>
              <span className="text-sm font-medium text-slate-700">Internet + Telefonia</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(u.internet_phone)}</span>
          </div>
          <div className="px-4 py-2 bg-white">
            <span className="text-xs text-slate-400">Custo fixo mensal</span>
          </div>
        </div>
      )}

      {rowCode === 'utility_costs' && (
        <>
          <Divider />
          <Row label="Total Utilidades" value={formatCurrency(u.total)} highlight negative />
        </>
      )}
    </div>
  );
}

function VariableCostsSection({ data, rowCode }: { data: PeriodTraceResponse; rowCode: string }) {
  const vc = data.variable_costs;
  const rev = data.revenue;
  if (!vc) return null;

  const revTotal = rev?.total || 0;

  return (
    <div className="space-y-2">
      {vc.hygiene_kit > 0 && (
        <Row
          label="Kit de higiene"
          value={formatCurrency(vc.hygiene_kit)}
          highlight={rowCode === 'hygiene_kit_cost'}
        />
      )}
      {vc.sales_commission > 0 && (
        <Row
          label="Comissão de vendas"
          value={formatCurrency(vc.sales_commission)}
          sub={revTotal > 0 ? `${((vc.sales_commission / revTotal) * 100).toFixed(1)}% da receita` : undefined}
          highlight={rowCode === 'sales_commission_cost'}
        />
      )}
      {vc.card_fee > 0 && (
        <Row
          label="Taxa de cartão"
          value={formatCurrency(vc.card_fee)}
          sub={revTotal > 0 ? `${((vc.card_fee / revTotal) * 100).toFixed(1)}% da receita` : undefined}
          highlight={rowCode === 'card_fee_cost'}
        />
      )}
      {vc.other > 0 && <Row label="Outros variáveis" value={formatCurrency(vc.other)} />}
      <Divider />
      <Row label="Total Variáveis" value={formatCurrency(vc.total)} highlight negative />
    </div>
  );
}

function TaxesSection({ data }: { data: PeriodTraceResponse }) {
  const t = data.taxes;
  const r = data.revenue;
  if (!t) return null;

  const revTotal = r?.total || 0;

  return (
    <div className="space-y-2">
      <div className="bg-orange-50 rounded-lg px-3 py-2 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Alíquota</span>
          <span className="font-semibold text-orange-700">{fmtPct(t.tax_rate)} (Simples Nacional)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Base de cálculo</span>
          <span className="text-slate-700">{formatCurrency(revTotal)}</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 font-mono px-1">
        = {fmtPct(t.tax_rate)} × {formatCurrency(revTotal)}
      </div>
      <Divider />
      <Row label="Impostos sobre Receita" value={formatCurrency(t.taxes_on_revenue)} highlight negative />
    </div>
  );
}

function FinancingSection({ data }: { data: PeriodTraceResponse }) {
  const f = data.financing;
  if (!f) return null;

  return (
    <div className="space-y-2">
      <Row label="Amortização (principal)" value={formatCurrency(f.principal)} />
      <Row label="Juros" value={formatCurrency(f.interest)} />

      {f.contracts && f.contracts.length > 0 && (
        <>
          <Divider />
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Contratos</p>
          {f.contracts.map((c, i) => (
            <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="font-medium text-slate-700">{c.name || `Contrato ${i + 1}`}</div>
              <div className="flex justify-between text-slate-500">
                <span>Parcela</span>
                <span>{formatCurrency(c.payment || 0)}</span>
              </div>
              {(c.principal || 0) > 0 && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>· Amortização</span>
                  <span>{formatCurrency(c.principal || 0)}</span>
                </div>
              )}
              {(c.interest || 0) > 0 && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>· Juros</span>
                  <span>{formatCurrency(c.interest || 0)}</span>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <Divider />
      <Row label="Total Financiamento" value={formatCurrency(f.total_payment)} highlight negative />
    </div>
  );
}

function ResultsSection({ data, rowCode }: { data: PeriodTraceResponse; rowCode: string }) {
  const k = data.kpis;
  const r = data.revenue;
  const fc = data.fixed_costs;
  const vc = data.variable_costs;
  const t = data.taxes;
  const f = data.financing;
  if (!k) return null;

  const revTotal = r?.total || 0;
  const fcTotal = fc?.total || 0;
  const vcTotal = vc?.total || 0;
  const taxTotal = t?.taxes_on_revenue || 0;
  const finTotal = f?.total_payment || 0;

  if (rowCode === 'operating_result') {
    return (
      <div className="space-y-2">
        <Row label="Receita Total" value={formatCurrency(revTotal)} />
        <Row label="− Custos Fixos" value={`−${formatCurrency(fcTotal)}`} negative indent />
        <Row label="− Custos Variáveis" value={`−${formatCurrency(vcTotal)}`} negative indent />
        <Row label="− Impostos" value={`−${formatCurrency(taxTotal)}`} negative indent />
        <Divider />
        <Row
          label="= Resultado Operacional"
          value={formatCurrency(k.operating_result)}
          highlight
          negative={k.operating_result < 0}
        />
        {revTotal > 0 && (
          <div className="text-[10px] text-slate-400 text-right">
            Margem: {((k.operating_result / revTotal) * 100).toFixed(1)}% da receita
          </div>
        )}
      </div>
    );
  }

  if (rowCode === 'net_result') {
    return (
      <div className="space-y-2">
        <Row
          label="Resultado Operacional"
          value={formatCurrency(k.operating_result)}
          negative={k.operating_result < 0}
        />
        <Row label="− Financiamento" value={`−${formatCurrency(finTotal)}`} negative indent />
        <Divider />
        <Row
          label="= Resultado Líquido"
          value={formatCurrency(k.net_result)}
          highlight
          negative={k.net_result < 0}
        />
        {revTotal > 0 && (
          <div className="text-[10px] text-slate-400 text-right">
            Margem: {((k.net_result / revTotal) * 100).toFixed(1)}% da receita
          </div>
        )}
      </div>
    );
  }

  if (rowCode === 'ebitda') {
    return (
      <div className="space-y-2">
        <Row label="EBITDA" value={formatCurrency(k.ebitda)} highlight negative={k.ebitda < 0} />
        {revTotal > 0 && (
          <div className="text-[10px] text-slate-400 text-right">
            Margem EBITDA: {((k.ebitda / revTotal) * 100).toFixed(1)}% da receita
          </div>
        )}
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-[10px] text-slate-400 space-y-0.5 mt-1">
          <div>EBITDA = Resultado Líquido + Juros + Depreciação</div>
          <div>(depreciação inclusa nos custos de equipamentos)</div>
        </div>
        <Divider />
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Indicadores</p>
        <Row label="Break-even Receita" value={formatCurrency(k.break_even_revenue)} />
        <Row label="Break-even Ocupação" value={fmtPct(k.break_even_occupancy_pct)} />
        <Row label="Margem de Contribuição" value={fmtPct(k.contribution_margin_pct)} />
      </div>
    );
  }

  return null;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function DrilldownContent({
  rowCode,
  rowName,
  data,
}: {
  rowCode: string;
  rowName: string;
  data: PeriodTraceResponse;
}) {
  if (!data.has_trace) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        Nenhum cálculo encontrado.
        <br />
        <span className="text-xs">Recalcule a versão e tente novamente.</span>
      </p>
    );
  }

  // Receitas
  if (['revenue_total', 'membership_revenue', 'personal_training_revenue', 'other_revenue'].includes(rowCode)) {
    return <RevenueSection data={data} />;
  }

  // Visão geral custos fixos
  if (rowCode === 'total_fixed_costs') {
    return <FixedCostsSection data={data} />;
  }

  // Aluguel (sem breakdown no trace)
  if (rowCode === 'rent_total') {
    const fc = data.fixed_costs;
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">Soma de Aluguel + Condomínio + IPTU conforme premissas.</p>
        {fc && <Row label="Aluguel + Condomínio + IPTU" value={formatCurrency(fc.rent)} highlight negative />}
      </div>
    );
  }

  // Pessoal
  if (['staff_costs', 'fc_pro_labore', 'fc_clt_base', 'fc_social_charges'].includes(rowCode)) {
    return <StaffSection data={data} rowCode={rowCode} />;
  }

  // Utilidades
  if (['utility_costs', 'fc_electricity', 'fc_water', 'fc_internet'].includes(rowCode)) {
    return <UtilitiesSection data={data} rowCode={rowCode} />;
  }

  // Adm + Contabilidade — com breakdown detalhado
  if (rowCode === 'admin_costs') {
    const fc = data.fixed_costs;
    const total = fc?.admin || 0;
    const d = fc?.admin_detail;
    const items: Array<{ label: string; value: number }> = d
      ? [
          { label: 'Material de escritório', value: d.office_supplies },
          { label: 'Higiene e limpeza (adm)', value: d.hygiene_cleaning },
          { label: 'Software de gestão', value: d.management_software },
          { label: 'Honorários jurídicos', value: d.legal_fees },
          { label: 'Honorários contábeis', value: d.accounting_fees },
          { label: 'Serviços administrativos', value: d.administrative_services },
        ].filter((i) => i.value !== 0)
      : [];
    const extraItems = d?.extra_items ?? [];
    const dataTypeLabel = (dt: string) => {
      if (dt === 'percentage') return '%';
      if (dt === 'integer') return 'un';
      return '';
    };
    return (
      <div className="space-y-2">
        <Row label="Adm + Contabilidade" value={formatCurrency(total)} highlight negative />
        {(items.length > 0 || extraItems.length > 0) ? (
          <>
            <Divider />
            <div className="space-y-1.5">
              {items.map((item) => (
                <Row key={item.label} label={item.label} value={formatCurrency(item.value)} negative indent />
              ))}
              {extraItems.length > 0 && (
                <>
                  {items.length > 0 && <Divider />}
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium px-0.5">Premissas individuais</p>
                  {extraItems.map((ex) => (
                    <div key={ex.code} className="flex justify-between items-start gap-3 pl-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        {ex.name}
                        {dataTypeLabel(ex.data_type) && (
                          <span className="text-[9px] bg-slate-100 text-slate-400 rounded px-1 font-mono">{dataTypeLabel(ex.data_type)}</span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-rose-600 whitespace-nowrap">
                        {ex.data_type === 'percentage' ? fmtPct(ex.value) : formatCurrency(ex.value)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-[10px] text-slate-400">Detalhamento disponível nas premissas do orçamento.</p>
        )}
      </div>
    );
  }

  // Marketing / Equip. / Seguros / Outros (sem breakdown)
  if (['marketing_costs', 'equipment_costs', 'insurance_costs', 'other_fixed_costs'].includes(rowCode)) {
    const fc = data.fixed_costs;
    type DetailItem = { label: string; value: number };

    let total = 0;
    let items: DetailItem[] = [];

    if (rowCode === 'marketing_costs') {
      total = fc?.marketing || 0;
      const d = fc?.marketing_detail;
      if (d) items = [
        { label: 'Marketing digital', value: d.digital_marketing },
        { label: 'Material de marca', value: d.brand_materials },
        { label: 'Material promocional', value: d.promotional_materials },
      ].filter((i) => i.value !== 0);
    } else if (rowCode === 'equipment_costs') {
      total = fc?.equipment || 0;
      const d = fc?.equipment_detail;
      if (d) items = [
        { label: 'Depreciação de equipamentos', value: d.depreciation_equipment },
        { label: 'Depreciação de obras/reforma', value: d.depreciation_renovation },
        { label: 'Manutenção de equipamentos', value: d.maintenance_equipment },
      ].filter((i) => i.value !== 0);
    } else if (rowCode === 'insurance_costs') {
      total = fc?.insurance || 0;
      const d = fc?.insurance_detail;
      if (d) items = [
        { label: 'Seguro patrimonial', value: d.property_insurance },
        { label: 'Seguro de equipamentos', value: d.equipment_insurance },
      ].filter((i) => i.value !== 0);
    } else if (rowCode === 'other_fixed_costs') {
      total = fc?.other || 0;
      const d = fc?.other_detail;
      if (d) items = [
        { label: 'Sistemas de segurança', value: d.security_systems },
        { label: 'Tarifas financeiras', value: d.financial_fees },
        { label: 'Outros custos fixos (base)', value: d.other_fixed_costs },
      ].filter((i) => i.value !== 0);
    }

    // Extras (premissas adicionais roteadas para este bucket)
    const extraItems =
      rowCode === 'other_fixed_costs' ? (fc?.other_detail?.extra_items ?? []) :
      rowCode === 'marketing_costs'   ? (fc?.marketing_detail?.extra_items ?? []) :
      rowCode === 'equipment_costs'   ? (fc?.equipment_detail?.extra_items ?? []) :
      rowCode === 'insurance_costs'   ? (fc?.insurance_detail?.extra_items ?? []) :
      [];

    const dataTypeLabel = (dt: string) => {
      if (dt === 'percentage') return '%';
      if (dt === 'integer') return 'un';
      return '';
    };

    return (
      <div className="space-y-2">
        <Row label={rowName} value={formatCurrency(total)} highlight negative />
        {(items.length > 0 || extraItems.length > 0) ? (
          <>
            <Divider />
            <div className="space-y-1.5">
              {items.map((item) => (
                <Row key={item.label} label={item.label} value={formatCurrency(item.value)} negative indent />
              ))}
              {extraItems.length > 0 && (
                <>
                  {items.length > 0 && <Divider />}
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium px-0.5">Premissas individuais</p>
                  {extraItems.map((ex) => (
                    <div key={ex.code} className="flex justify-between items-start gap-3 pl-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        {ex.name}
                        {dataTypeLabel(ex.data_type) && (
                          <span className="text-[9px] bg-slate-100 text-slate-400 rounded px-1 font-mono">{dataTypeLabel(ex.data_type)}</span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-rose-600 whitespace-nowrap">
                        {ex.data_type === 'percentage'
                          ? fmtPct(ex.value)
                          : formatCurrency(ex.value)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-[10px] text-slate-400">Detalhamento disponível nas premissas do orçamento.</p>
        )}
      </div>
    );
  }

  // Custos variáveis
  if (['total_variable_costs', 'hygiene_kit_cost', 'sales_commission_cost', 'card_fee_cost'].includes(rowCode)) {
    return <VariableCostsSection data={data} rowCode={rowCode} />;
  }

  // Impostos
  if (rowCode === 'taxes_on_revenue') {
    return <TaxesSection data={data} />;
  }

  // Financiamento
  if (rowCode === 'financing_payment') {
    return <FinancingSection data={data} />;
  }

  // Resultados
  if (['operating_result', 'net_result', 'ebitda'].includes(rowCode)) {
    return <ResultsSection data={data} rowCode={rowCode} />;
  }

  // Default — mostra valores básicos disponíveis
  const val = data.kpis
    ? (data.kpis as Record<string, number>)[rowCode]
    : undefined;
  return (
    <div className="space-y-2">
      {val !== undefined ? (
        <Row label={rowName} value={formatCurrency(val)} highlight negative={val < 0} />
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">Sem detalhamento adicional para esta linha.</p>
      )}
    </div>
  );
}

// ── DrilldownPanel (exportado) ────────────────────────────────────────────────

export interface DrilldownState {
  code: string;
  period: string;
  name: string;
}

export interface ConsolidatedCtx {
  businessId: string;
  scenarioId: string;
  unitIds: string[];
}

// ── UnitBreakdownPanel — modo multi-unidade ───────────────────────────────────

function UnitBreakdownSection({ data }: { data: PeriodCodeBreakdownResponse }) {
  const total = data.total;
  const isExpense = total < 0;

  return (
    <div className="space-y-2">
      {data.units.length === 0 ? (
        <p className="text-xs text-slate-400 py-2 text-center">
          Nenhuma unidade com cálculo para este período.
        </p>
      ) : (
        <>
          {data.units.map((u) => {
            const pct = Math.abs(u.pct_of_total);
            const barColor = isExpense ? 'bg-rose-400' : 'bg-emerald-400';
            return (
              <div key={u.unit_id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium truncate max-w-[60%]">{u.unit_name}</span>
                  <div className="text-right shrink-0">
                    <span className={`font-semibold ${isExpense ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatCurrency(Math.abs(u.value))}
                    </span>
                    <span className="text-slate-400 ml-1.5 text-[10px]">({(pct * 100).toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all`}
                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <Divider />
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700">Total Consolidado</span>
            <span className={isExpense ? 'text-rose-700' : 'text-emerald-700'}>
              {formatCurrency(Math.abs(total))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

interface DrilldownPanelProps {
  drilldown: DrilldownState;
  onClose: () => void;
  /** Modo single-unit: usa period-trace */
  versionId?: string;
  /** Modo multi-unit: usa period-code-breakdown */
  consolidatedCtx?: ConsolidatedCtx;
}

function PanelShell({
  drilldown,
  onClose,
  children,
  subtitle,
}: {
  drilldown: DrilldownState;
  onClose: () => void;
  children: React.ReactNode;
  subtitle?: string;
}) {
  const periodLabel = formatPeriodHeader(drilldown.period);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {periodLabel}{subtitle ? ` · ${subtitle}` : ''}
            </p>
            <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{drilldown.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function DrilldownPanel({ versionId, consolidatedCtx, drilldown, onClose }: DrilldownPanelProps) {
  // Modo single-unit
  const { data: traceData, isLoading: traceLoading } = useQuery<PeriodTraceResponse>({
    queryKey: ['period-trace', versionId, drilldown.period],
    queryFn: () => dashboardApi.periodTrace(versionId!, drilldown.period),
    staleTime: 5 * 60 * 1000,
    enabled: !!versionId,
  });

  // Modo multi-unit
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery<PeriodCodeBreakdownResponse>({
    queryKey: ['period-code-breakdown', consolidatedCtx?.businessId, consolidatedCtx?.scenarioId, drilldown.period, drilldown.code, consolidatedCtx?.unitIds],
    queryFn: () =>
      dashboardApi.periodCodeBreakdown(
        consolidatedCtx!.businessId,
        consolidatedCtx!.scenarioId,
        drilldown.period,
        drilldown.code,
        consolidatedCtx!.unitIds,
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!consolidatedCtx && !versionId,
  });

  const isLoading = traceLoading || breakdownLoading;

  if (consolidatedCtx && !versionId) {
    return (
      <PanelShell drilldown={drilldown} onClose={onClose} subtitle="consolidado por unidade">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            Carregando breakdown...
          </div>
        ) : breakdownData ? (
          <UnitBreakdownSection data={breakdownData} />
        ) : (
          <p className="text-sm text-slate-400 py-4 text-center">Erro ao carregar dados.</p>
        )}
      </PanelShell>
    );
  }

  return (
    <PanelShell drilldown={drilldown} onClose={onClose}>
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          Carregando cálculo...
        </div>
      ) : traceData ? (
        <DrilldownContent rowCode={drilldown.code} rowName={drilldown.name} data={traceData} />
      ) : (
        <p className="text-sm text-slate-400 py-4 text-center">Erro ao carregar dados.</p>
      )}
    </PanelShell>
  );
}
