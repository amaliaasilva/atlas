'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { DataTypeBadge, type DataType } from '@/components/ui/DataTypeBadge';

interface MetricCardProps {
  label: string;
  value: string;
  rawValue?: number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string; // ex: "+12%" ou "−R$ 4k"
  icon?: React.ReactNode;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  /** D-06: badge indicando tipo de dado (projected/real/breakeven) */
  dataType?: DataType;
}

const accent = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-500 bg-indigo-100',
    value: 'text-indigo-700',
    bar: 'bg-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-500 bg-emerald-100',
    value: 'text-emerald-700',
    bar: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-500 bg-amber-100',
    value: 'text-amber-700',
    bar: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-500 bg-rose-100',
    value: 'text-rose-700',
    bar: 'bg-rose-500',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'text-sky-500 bg-sky-100',
    value: 'text-sky-700',
    bar: 'bg-sky-500',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-500 bg-violet-100',
    value: 'text-violet-700',
    bar: 'bg-violet-500',
  },
};

export function MetricCard({
  label,
  value,
  sub,
  trend,
  trendValue,
  icon,
  accentColor = 'indigo',
  tooltip,
  size = 'md',
  loading = false,
  onClick,
  dataType,
}: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colors = accent[accentColor];

  // Intersection observer para animação de entrada
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }[size];

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  if (loading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', sizeClasses)}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-7 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300',
        'hover:shadow-md hover:-translate-y-0.5',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        onClick && 'cursor-pointer',
        sizeClasses,
      )}
      style={{ transitionProperty: 'opacity, transform, box-shadow' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-none">
            {label}
          </span>
          {dataType && <DataTypeBadge type={dataType} />}
          {tooltip && (
            <div className="group relative">
              <Info className="h-3 w-3 text-gray-300 cursor-help" />
              <div className="absolute bottom-5 left-0 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl z-50 leading-relaxed">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {icon && (
          <span className={cn('h-8 w-8 rounded-xl flex items-center justify-center', colors.icon)}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-2 mb-1">
        <span className={cn('font-bold text-gray-900 leading-none financial-value', valueSizeClasses)}>
          {value}
        </span>
        {trendValue && (
          <span
            className={cn(
              'text-xs font-semibold pb-0.5 flex items-center gap-0.5',
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-gray-400',
            )}
          >
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {trendValue}
          </span>
        )}
        {!trendValue && trend && (
          <span className={cn(
            'text-xs font-medium pb-0.5',
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-gray-400',
          )}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
          </span>
        )}
      </div>

      {/* Sub */}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Metric Card com barra de progresso ────────────────────────────────────────

interface ProgressCardProps {
  label: string;
  value: string;
  progress: number; // 0-1
  progressLabel?: string;
  icon?: React.ReactNode;
  accentColor?: keyof typeof accent;
  loading?: boolean;
  tooltip?: string;
}

export function ProgressCard({
  label,
  value,
  progress,
  progressLabel,
  icon,
  accentColor = 'indigo',
  loading = false,
  tooltip,
}: ProgressCardProps) {
  const [animated, setAnimated] = useState(false);
  const colors = accent[accentColor];
  const pct = Math.min(Math.max(progress * 100, 0), 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-7 bg-gray-200 rounded w-1/2" />
          <div className="h-2 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
          {tooltip && (
            <div className="group relative">
              <Info className="h-3 w-3 text-gray-300 cursor-help" />
              <div className="absolute bottom-5 left-0 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl z-50">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {icon && (
          <span className={cn('h-8 w-8 rounded-xl flex items-center justify-center', colors.icon)}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-3">{value}</div>
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-out', colors.bar)}
            style={{ width: animated ? `${pct}%` : '0%' }}
          />
        </div>
        {progressLabel && (
          <p className="text-xs text-gray-400 flex justify-between">
            <span>{progressLabel}</span>
            <span className="font-medium">{pct.toFixed(1)}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Stat Row (para tabelas de comparação compacta) ────────────────────────────

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  bar?: number; // 0-1, mostra barra relativa se presente
  barColor?: string;
  rank?: number;
}

export function StatRow({ label, value, sub, bar, barColor = 'bg-indigo-500', rank }: StatRowProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group hover:bg-gray-50/80 rounded-lg px-2 -mx-2 transition-colors">
      {rank !== undefined && (
        <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-right">{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {bar !== undefined && (
          <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
              style={{ width: animated ? `${Math.min(bar * 100, 100)}%` : '0%' }}
            />
          </div>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{value}</span>
    </div>
  );
}
