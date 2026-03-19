'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { getErrorMessage } from '@/lib/utils';

/* ── Particle ───────────────────────────────────────────────────────── */
function Particle({ x, y, size, delay, duration }: {
  x: number; y: number; size: number; delay: number; duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(96,165,250,0.2) 70%, transparent 100%)`,
      }}
      animate={{
        y: [0, -40, -20, 0],
        x: [0, 12, -8, 0],
        opacity: [0.2, 0.7, 0.4, 0.2],
        scale: [1, 1.3, 1.1, 1],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/* ── Grid overlay ────────────────────────────────────────────────────── */
function GridOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3B82F6" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

const PARTICLES = [
  { x: 8,  y: 15, size: 5,  delay: 0,   duration: 7  },
  { x: 20, y: 70, size: 8,  delay: 1,   duration: 9  },
  { x: 35, y: 40, size: 4,  delay: 2.5, duration: 6  },
  { x: 55, y: 20, size: 6,  delay: 0.5, duration: 8  },
  { x: 70, y: 55, size: 10, delay: 3,   duration: 11 },
  { x: 80, y: 30, size: 5,  delay: 1.5, duration: 7  },
  { x: 92, y: 75, size: 7,  delay: 4,   duration: 9  },
  { x: 15, y: 88, size: 4,  delay: 2,   duration: 6  },
  { x: 60, y: 85, size: 6,  delay: 0.8, duration: 8  },
  { x: 48, y: 60, size: 3,  delay: 3.5, duration: 10 },
];

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokens = await authApi.login(email, password);
      setToken(tokens.access_token);
      const user = await authApi.me();
      setUser(user);
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{ background: 'linear-gradient(145deg, #0a0f1e 0%, #1E2A44 50%, #0d1a2e 100%)' }}
    >
      <GridOverlay />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(59,130,246,0.10) 0%, transparent 70%)',
        }}
      />

      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 w-full max-w-[440px] px-6">

        {/* Logo */}
        <motion.div
          className="flex flex-col items-center mb-0"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative"
            animate={{ filter: [
              'drop-shadow(0 0 24px rgba(59,130,246,0.5))',
              'drop-shadow(0 0 40px rgba(96,165,250,0.7))',
              'drop-shadow(0 0 24px rgba(59,130,246,0.5))',
            ]}}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/logo-atlas.svg"
              alt="Atlas Finance"
              width={650}
              height={300}
              priority
              style={{ height: '180px', width: 'auto', display: 'block' }}
            />
          </motion.div>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(59,130,246,0.15)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <motion.h2
            className="text-lg font-semibold mb-6"
            style={{ color: '#1e2a44' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            Acesse sua conta
          </motion.h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(30,42,68,0.65)' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="seu@email.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                style={{
                  color: '#1e2a44',
                  background: focusedField === 'email' ? 'rgba(59,130,246,0.06)' : 'rgba(30,42,68,0.04)',
                  border: focusedField === 'email' ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(30,42,68,0.15)',
                  boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(59,130,246,0.10)' : 'none',
                }}
              />
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.5 }}
            >
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(30,42,68,0.65)' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                style={{
                  color: '#1e2a44',
                  background: focusedField === 'password' ? 'rgba(59,130,246,0.06)' : 'rgba(30,42,68,0.04)',
                  border: focusedField === 'password' ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(30,42,68,0.15)',
                  boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(59,130,246,0.10)' : 'none',
                }}
              />
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white relative overflow-hidden transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? 'rgba(59,130,246,0.5)'
                    : 'linear-gradient(135deg, #1E2A44 0%, #3B82F6 55%, #60A5FA 100%)',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(59,130,246,0.4)',
                }}
              >
                {!loading && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando…
                  </span>
                ) : 'Entrar'}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>

        <motion.p
          className="mt-6 text-xs text-center"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          Atlas Finance © {new Date().getFullYear()} — plataforma de uso interno
        </motion.p>
      </div>
    </div>
  );
}
