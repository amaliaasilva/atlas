'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatPercent } from '@/lib/utils';

interface Props {
  occupancyRate: number;       // 0.0–1.0 — ocupação atual
  breakEvenRate: number;       // 0.0–1.0 — mínimo para break-even
  label?: string;
  size?: number;
}

const COLORS = {
  occupied: '#6366f1',   // indigo — horas vendidas
  breakeven: '#e0e7ff',  // light indigo — gap até o BE
  free: '#f3f4f6',       // gray — capacidade ociosa
};

/**
 * Gauge semicircular de ocupação do espaço.
 * Mostra:  [ocupado] [gap-até-BE (se necessário)] [livre]
 * onde o marcador de break-even separa o verde do cinza.
 */
export function OccupancyGauge({ occupancyRate, breakEvenRate, label = 'Ocupação', size = 180 }: Props) {
  const occ = Math.min(Math.max(occupancyRate, 0), 1);
  const be = Math.min(Math.max(breakEvenRate, 0), 1);

  // O gauge é um semicírculo (180°) transformado em pie de 180°
  // Normalized values para o halfPie trick (adiciona um segmento transparente igual ao total)
  const needsGap = occ < be;
  const gapToBE = needsGap ? be - occ : 0;
  const free = Math.max(1 - Math.max(occ, be), 0);

  const data = [
    { name: 'Ocupado', value: occ },
    { name: 'Gap BE', value: gapToBE },
    { name: 'Livre', value: free },
    // Segmento fantasma para fechar o semicírculo
    { name: 'hidden', value: 1 },
  ];

  const cellColors = [COLORS.occupied, COLORS.breakeven, COLORS.free, 'transparent'];

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size / 2 + 20, position: 'relative' }}>
        <ResponsiveContainer width="100%" height={size}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={size * 0.38}
              outerRadius={size * 0.50}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={cellColors[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'hidden' ? null : [formatPercent(v), name]
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Label central */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-2"
          style={{ pointerEvents: 'none' }}
        >
          <span className="text-2xl font-bold text-gray-900">{formatPercent(occ)}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
      {/* Legenda breaking-even */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
          Ocupado ({formatPercent(occ)})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 inline-block border border-indigo-200" />
          Break-even ({formatPercent(be)})
        </span>
      </div>
    </div>
  );
}
