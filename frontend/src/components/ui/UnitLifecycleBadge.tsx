'use client';

import { Calendar, Clock, MapPin, TrendingUp, Pencil } from 'lucide-react';
import type { Unit } from '@/types/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatOpeningDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ── UnitLifecycleBadge ────────────────────────────────────────────────────────

interface BadgeProps {
  unit: Pick<Unit, 'opening_date' | 'status' | 'months_since_opening' | 'days_to_opening' | 'opening_phase'>;
  size?: 'sm' | 'md';
}

/**
 * Badge semântico que comunica o ciclo de vida de uma unidade em relação
 * à data de abertura:
 *
 *   🟡  "Abre em 45 dias — 15/mai/2026"   (phase=future)
 *   🟢  "Aberta há 14 meses — jan/2025"   (phase=operating)
 *   🔵  "Encerrada — abriu em jan/2023"   (phase=closed)
 *   ⬜  "Sem data definida"               (sem opening_date)
 */
export function UnitLifecycleBadge({ unit, size = 'md' }: BadgeProps) {
  const sm = size === 'sm';
  const base = sm
    ? 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border'
    : 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border';

  if (!unit.opening_date) {
    return (
      <span className={`${base} bg-gray-50 border-gray-200 text-gray-400`}>
        <Calendar className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        Sem data definida
      </span>
    );
  }

  const phase = unit.opening_phase;

  if (phase === 'future') {
    const days = unit.days_to_opening ?? 0;
    return (
      <span className={`${base} bg-amber-50 border-amber-200 text-amber-700`}>
        <Clock className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        Abre em {pluralize(days, 'dia', 'dias')} · {formatOpeningDate(unit.opening_date)}
      </span>
    );
  }

  if (phase === 'operating') {
    const months = unit.months_since_opening ?? 0;
    return (
      <span className={`${base} bg-emerald-50 border-emerald-200 text-emerald-700`}>
        <TrendingUp className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        {months === 0
          ? `Abriu hoje · ${formatOpeningDate(unit.opening_date)}`
          : `${pluralize(months, 'mês', 'meses')} de operação · desde ${formatOpeningDate(unit.opening_date)}`}
      </span>
    );
  }

  if (phase === 'closed') {
    return (
      <span className={`${base} bg-gray-100 border-gray-200 text-gray-500`}>
        <MapPin className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        Encerrada · abriu em {formatOpeningDate(unit.opening_date)}
      </span>
    );
  }

  // Fallback — opening_date existe mas phase não veio do backend (versão antiga)
  return (
    <span className={`${base} bg-sky-50 border-sky-200 text-sky-700`}>
      <Calendar className={sm ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      Abertura: {formatOpeningDate(unit.opening_date)}
    </span>
  );
}

// ── UnitOpeningProgress ───────────────────────────────────────────────────────

/**
 * Barra de progresso mostrando posição da unidade no ciclo pré/pós abertura.
 * Útil em cards de dashboard.
 */
interface ProgressProps {
  unit: Pick<Unit, 'opening_date' | 'opening_phase' | 'months_since_opening' | 'days_to_opening'>;
  targetMonths?: number; // meta de payback / referência (default: 24)
}

export function UnitOpeningProgress({ unit, targetMonths = 24 }: ProgressProps) {
  if (!unit.opening_date || unit.opening_phase === 'future') {
    return null;
  }

  const months = unit.months_since_opening ?? 0;
  const pct = Math.min(months / targetMonths, 1);

  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>Abertura</span>
        <span>{months}m / {targetMonths}m referência</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 1 ? 'bg-emerald-400' : pct >= 0.5 ? 'bg-indigo-400' : 'bg-amber-400'
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── UnitDateChip ──────────────────────────────────────────────────────────────

/**
 * Chip compacto de data de abertura para cards densos.
 * Mostra apenas quando é contextualmente relevante:
 *   - Unidade com abertura futura → countdown em dias (amber)
 *   - Unidade recém-aberta (≤ 6 meses) → meses de operação (green)
 *   - Unidade estabelecida → nada (ou ícone sutil de edição)
 *   - Sem data → botão "Definir" (se onEdit fornecido)
 *
 * O pencil icon aparece no hover quando `onEdit` é passado.
 */
interface ChipProps {
  unit: Pick<Unit, 'opening_date' | 'opening_phase' | 'months_since_opening' | 'days_to_opening'>;
  onEdit?: () => void;
}

export function UnitDateChip({ unit, onEdit }: ChipProps) {
  const phase = unit.opening_phase;
  const months = unit.months_since_opening ?? 0;

  if (!unit.opening_date) {
    if (!onEdit) return null;
    return (
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
      >
        <Calendar className="h-2.5 w-2.5" />
        Definir data de abertura
      </button>
    );
  }

  if (phase === 'future') {
    const days = unit.days_to_opening ?? 0;
    return (
      <span className="inline-flex items-center gap-1 group/chip">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          {days}d para abrir
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover/chip:opacity-100 transition-opacity text-gray-300 hover:text-gray-600"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
        )}
      </span>
    );
  }

  if (phase === 'operating' && months <= 6) {
    return (
      <span className="inline-flex items-center gap-1 group/chip">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {months === 0 ? 'Abriu hoje' : `${months}m de operação`}
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover/chip:opacity-100 transition-opacity text-gray-300 hover:text-gray-600"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
        )}
      </span>
    );
  }

  // Unidade estabelecida (operando há > 6 meses) — só mostra se houver edição disponível
  if (onEdit) {
    const abbr = new Date(unit.opening_date + 'T00:00:00').toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
    return (
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-[10px] text-gray-300 hover:text-gray-500 transition-colors group/chip"
      >
        <Calendar className="h-2.5 w-2.5" />
        <span>desde {abbr}</span>
        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/chip:opacity-100 transition-opacity" />
      </button>
    );
  }

  return null;
}
