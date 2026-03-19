import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware é passthrough total — a proteção de rotas é feita client-side em (auth)/layout.tsx.
// Firebase Hosting CDN não encaminha cookies de sessão confiáveis ao Cloud Run
// (redireciona server-side causaria loop ou cache de redirect no CDN).
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
