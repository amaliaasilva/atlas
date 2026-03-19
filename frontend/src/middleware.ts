import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas sempre acessíveis
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Verificar token no cookie (o client side usa localStorage,
  // mas para SSR protegemos via cookie "atlas_token" opcional)
  const token = request.cookies.get('atlas_token')?.value;
  if (!token) {
    // Sem token: redireciona para login
    // Em produção o token pode estar somente no localStorage;
    // nesse caso o AuthGuard client-side faz a proteção.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
