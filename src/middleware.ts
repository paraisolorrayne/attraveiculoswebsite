import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'
import { canAccessRoute, isAdminRole } from '@/lib/auth/roles'

// Auth.js edge-safe (sem providers/DB) só pra ler a sessão (JWT) no middleware.
// Migrado do Supabase GoTrue → Auth.js (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Substitui o bypass temporário que existia aqui.
const { auth } = NextAuth(authConfig)

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

  // /admin puro → landing
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/engine-sounds', req.url))
  }

  // Gate por papel
  if (!canAccessRoute(role, pathname)) {
    return NextResponse.redirect(new URL('/admin/engine-sounds', req.url))
  }
})

export const config = {
  matcher: ['/admin/:path*'],
}
