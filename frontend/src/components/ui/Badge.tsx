'use client';

interface BadgeProps {
  label: string;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colors: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: BadgeProps['color'] }> = {
    draft:       { label: 'Rascunho', color: 'gray' },
    published:   { label: 'Publicado', color: 'green' },
    archived:    { label: 'Arquivado', color: 'yellow' },
    active:      { label: 'Ativo', color: 'green' },
    inactive:    { label: 'Inativo', color: 'gray' },
    planning:    { label: 'Planejamento', color: 'blue' },
    pre_opening: { label: 'Pré-abertura', color: 'purple' },
    closed:      { label: 'Fechado', color: 'red' },
    pending:     { label: 'Pendente', color: 'gray' },
    processing:  { label: 'Processando', color: 'blue' },
    completed:   { label: 'Concluído', color: 'green' },
    failed:      { label: 'Falhou', color: 'red' },
    base:        { label: 'Base', color: 'blue' },
    conservative:{ label: 'Conservador', color: 'yellow' },
    aggressive:  { label: 'Agressivo', color: 'green' },
    custom:      { label: 'Custom', color: 'purple' },
  };
  const cfg = map[status] ?? { label: status, color: 'gray' };
  return <Badge label={cfg.label} color={cfg.color} />;
}
