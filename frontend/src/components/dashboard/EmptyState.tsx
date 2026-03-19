'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title = 'Nenhum dado disponível',
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10' : 'py-20',
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-200">
          {icon}
        </div>
      )}
      <p className={cn('font-semibold text-gray-500', compact ? 'text-sm' : 'text-base')}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-7 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="bg-gray-100 rounded-xl" style={{ height }} />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
        <span className="text-rose-500 text-xl">!</span>
      </div>
      <p className="font-semibold text-gray-700">Erro ao carregar dados</p>
      <p className="text-sm text-gray-400 mt-1">{message ?? 'Tente novamente em instantes.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors font-medium"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ── No filters selected state ─────────────────────────────────────────────────

export function NoFiltersState({ message, compact }: { message?: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </div>
      <p className={compact ? 'text-sm font-semibold text-gray-500' : 'font-semibold text-gray-600'}>Selecione os filtros</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs leading-relaxed">
        {message ?? 'Selecione um negócio e cenário nos filtros acima para visualizar os dados.'}
      </p>
    </div>
  );
}
