'use client';

/**
 * AtlasLogo — logo 100% em código SVG.
 *
 * variant="mark"    → só o ícone (3 barras ascendentes), usado no sidebar
 * variant="full"    → ícone + tipografia "Atlas / Finance", usado no login
 */

interface AtlasLogoProps {
  variant?: 'mark' | 'full';
  /** px do ícone (usado em variant=mark) */
  size?: number;
  className?: string;
}

function LogoMark({ w = 54, h = 44 }: { w?: number; h?: number }) {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 54 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="af-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22C7E6" />
        </linearGradient>
      </defs>

      {/* Bar 1 — baixa */}
      <rect x="0" y="22" width="14" height="22" rx="3" fill="url(#af-g)" fillOpacity="0.80" />
      {/* Bar 2 — média */}
      <rect x="20" y="10" width="14" height="34" rx="3" fill="url(#af-g)" fillOpacity="0.92" />
      {/* Bar 3 — alta */}
      <rect x="40" y="0"  width="14" height="44" rx="3" fill="url(#af-g)" />

      {/* Linha de base sutil */}
      <line x1="0" y1="44" x2="54" y2="44" stroke="#22C7E6" strokeOpacity="0.25" strokeWidth="1.5" />
    </svg>
  );
}

export function AtlasLogo({ variant = 'full', size = 28, className = '' }: AtlasLogoProps) {
  /* ── Sidebar / icon-only ─────────────────────────────────────── */
  if (variant === 'mark') {
    const ratio = 54 / 44;
    return (
      <LogoMark w={Math.round(size * ratio)} h={size} />
    );
  }

  /* ── Full (login) ────────────────────────────────────────────── */
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <LogoMark w={108} h={88} />

      <div className="mt-4 flex flex-col items-center leading-none">
        <span
          className="text-[44px] font-extrabold tracking-tight"
          style={{ color: '#FFFFFF', fontFamily: 'Manrope, ui-sans-serif, system-ui' }}
        >
          Atlas
        </span>
        <span
          className="text-[15px] font-semibold tracking-[0.35em] uppercase mt-0.5"
          style={{ color: '#22C7E6' }}
        >
          Finance
        </span>
      </div>
    </div>
  );
}
