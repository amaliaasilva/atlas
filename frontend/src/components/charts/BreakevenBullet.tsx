'use client';

import { formatPercent } from '@/lib/utils';

interface Props {
  current: number;    // 0.0–1.0
  breakEven: number;  // 0.0–1.0
  className?: string;
}

/**
 * Bullet chart horizontal simples que mostra:
 *   - barra cinza de fundo = 100%
 *   - barra colorida = ocupação atual
 *   - marcador vertical = ponto de break-even
 */
export function BreakevenBullet({ current, breakEven, className = '' }: Props) {
  const occ = Math.min(Math.max(current, 0), 1) * 100;
  const be = Math.min(Math.max(breakEven, 0), 1) * 100;
  const overBE = current >= breakEven;

  return (
    <div className={`w-full ${className}`}>
      {/* Labels acima */}
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Ocupação: <strong className={overBE ? 'text-emerald-600' : 'text-amber-600'}>{formatPercent(current)}</strong></span>
        <span>BE: <strong className="text-gray-600">{formatPercent(breakEven)}</strong></span>
      </div>
      {/* Bullet track */}
      <div className="relative h-4 rounded-full bg-gray-100 overflow-visible">
        {/* Barra de ocupação atual */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${overBE ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${Math.min(occ, 100)}%` }}
        />
        {/* Marcador de break-even */}
        <div
          className="absolute top-[-4px] h-[calc(100%+8px)] w-0.5 bg-gray-700 rounded-full"
          style={{ left: `${Math.min(be, 100)}%` }}
        />
        {/* Tooltip estático do marcador */}
        <span
          className="absolute -top-6 text-[10px] font-bold text-gray-600 -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${Math.min(be, 100)}%` }}
        >
          BE
        </span>
      </div>
      {/* Gap */}
      {!overBE && (
        <p className="mt-1 text-[11px] text-amber-600 font-medium">
          Faltam {formatPercent(Math.max(breakEven - current, 0))} para o break-even
        </p>
      )}
    </div>
  );
}
