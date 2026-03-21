import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const _raw = process.env.NEXT_PUBLIC_API_URL || 'https://atlas-backend-7cuu5kzxjq-rj.a.run.app';
// Garante https:// — evita Mixed Content caso env var chegue sem protocolo ou com http://
const BASE_URL = _raw.startsWith('http') ? _raw.replace(/^http:\/\//, 'https://') : `https://${_raw}`;

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // FastAPI espera arrays como ?key=v1&key=v2 (sem colchetes)
  paramsSerializer: (params) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => sp.append(key, String(v)));
      } else if (value !== null && value !== undefined) {
        sp.set(key, String(value));
      }
    }
    return sp.toString();
  },
});

// ── Interceptor: injeta Bearer token ────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('atlas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Interceptor: redireciona para /login em 401 ──────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('atlas_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
