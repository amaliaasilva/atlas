import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPeriod(period: string): string {
  // "2026-08" → "ago/26"
  const [year, month] = period.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { detail?: unknown } } };
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    // FastAPI/Pydantic validation errors: detail is array of {type, loc, msg, input}
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as Record<string, unknown>;
      if (first?.msg) return String(first.msg);
      return 'Dados inválidos';
    }
    if (detail && typeof detail === 'object') {
      const d = detail as Record<string, unknown>;
      if (d.msg) return String(d.msg);
    }
    return 'Erro desconhecido';
  }
  if (error instanceof Error) return error.message;
  return 'Erro desconhecido';
}
