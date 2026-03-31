/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        atlas: {
          teal:  '#22C7E6',
          cyan:  '#22C7E6',
          sky:   '#60A5FA',
          blue:  '#3B82F6',
          navy:  '#1E2A44',
          dark:  '#111827',
          night: '#1E2A44',
        },
        // Status semântico (ok/warn/alert/neutral)
        status: {
          ok:      { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
          warn:    { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
          alert:   { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
          neutral: { DEFAULT: '#6B7280', light: '#F3F4F6', dark: '#374151' },
        },
        // Hierarquia de superfície (substitui gray-* ad hoc)
        surface: {
          base:   '#FFFFFF',
          subtle: '#F9FAFB',
          inset:  '#F3F4F6',
          border: '#E5E7EB',
          muted:  '#D1D5DB',
        },
        // Tipo de dado financeiro
        real:      { DEFAULT: '#1E293B', light: '#F8FAFC', badge: '#CBD5E1' },
        projected: { DEFAULT: '#1E40AF', light: '#EFF6FF', badge: '#BFDBFE' },
        breakeven: { DEFAULT: '#92400E', light: '#FFFBEB', badge: '#FDE68A' },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'atlas-gradient': 'linear-gradient(135deg, #1E2A44 0%, #3B82F6 55%, #22C7E6 100%)',
        'atlas-dark': 'linear-gradient(180deg, #1E2A44 0%, #111827 100%)',
        'teal-glow': 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
      },
      keyframes: {
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(11,172,184,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(11,172,184,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)', opacity: '0.3' },
          '33%': { transform: 'translateY(-30px) translateX(10px)', opacity: '0.7' },
          '66%': { transform: 'translateY(-15px) translateX(-10px)', opacity: '0.5' },
        },
      },
      animation: {
        'float-up': 'float-up 0.6s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'particle-float': 'particle-float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
