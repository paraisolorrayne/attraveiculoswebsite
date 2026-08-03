import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'
import { canAccessRoute, isAdminRole } from '@/lib/auth/roles'

// Auth.js edge-safe (sem providers/DB) só pra ler a sessão (JWT) no middleware.
// Migrado do Supabase GoTrue → Auth.js (ver docs/MIGRACAO_POSTGRES_PURO.md).
const { auth } = NextAuth(authConfig)

/**
 * Divisão de responsabilidade entre middleware e layout do admin:
 *
 *   middleware (edge, SEM banco) → autenticação, mais o bloqueio que não pode
 *     depender de dado fresco (gestão de usuários é só do `admin`, e isso se
 *     decide pelo papel, que o token sempre carrega);
 *   layout do admin (servidor, COM banco) → autorização por seção, lendo as
 *     permissões do banco a cada request.
 *
 * O middleware não decide mais as exceções por usuário. Ele julgava pelo token,
 * que é emitido no login e congela as permissões daquele instante: conceder uma
 * seção só passava a valer no login seguinte e, nesse meio-tempo, o hub do
 * admin — que lê o banco — exibia um card que o middleware barrava ao clicar.
 *
 * Para o layout saber qual rota está sendo pedida, o caminho vai carimbado em
 * `x-pathname`: um layout do App Router não recebe a rota de outra forma. Esse
 * carimbo nunca existiu, e sem ele a checagem do layout jamais rodou — na
 * prática, toda a autorização por seção dependia só do token.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Só protege /admin/*; login e reset são livres.
  if (!pathname.startsWith('/admin')) return
  if (pathname === '/admin/login' || pathname.startsWith('/admin/reset-password')) return

  const role = req.auth?.user?.role

  // Sem sessão válida → login
  if (!role || !isAdminRole(role)) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // Gate por papel + exceções do token. NÃO basta sozinho (o token congela as
  // permissões do login), mas é o único gate que comprovadamente bloqueia:
  // delegar tudo ao layout abriu /admin/crm para o papel marketing.
  if (pathname !== '/admin' && !canAccessRoute(role, pathname, req.auth?.user?.secoes ?? null)) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // /admin puro é o hub e todo papel autenticado vê; o carimbo segue junto
  // para o layout não precisar de exceção.
  const headers = new Headers(req.headers)
  headers.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers } })
})

export const config = {
  matcher: ['/admin/:path*'],
}
