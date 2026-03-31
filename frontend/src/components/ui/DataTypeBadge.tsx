'use client';

import { cn } from '@/lib/utils';

export type DataType = 'projected' | 'real' | 'breakeven';

interface Props {
  type: DataType;
  className?: string;
}

const TYPE_CONFIG: Record<DataType, { label: string; classes: string }> = {
  projected: {
    label: 'Projetado',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  real: {
    label: 'Realizado',
    classes: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  breakeven: {
    label: 'Breakeven',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

/**
 * DataTypeBadge — badge que indica se um KPI é um valor realizado, projetado ou de breakeven.
 * Decisão D-06: separação visual e semântica consistente entre os três tipos de dado.
 */
export function DataTypeBadge({ type, className }: Props) {
  const { label, classes } = TYPE_CONFIG[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider',
        classes,
        className,
      )}
    >
      {label}
    </span>
  );
}
