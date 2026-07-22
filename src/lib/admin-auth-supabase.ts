/**
 * Admin Authentication Service — agora sobre **Auth.js** (Credentials + Kysely
 * + bcrypt), substituindo o Supabase GoTrue. Ver docs/MIGRACAO_POSTGRES_PURO.md.
 *
 * O nome do arquivo é mantido pra não quebrar os ~40 imports existentes.
 * Interface preservada: getCurrentAdmin / isAuthenticated / signInWithEmail /
 * signOut / hasRole / canAccessRoute.
 */

import { auth, signIn, signOut as authSignOut } from '@/auth'
import { db } from '@/lib/db'
import { canAccessRoute as canAccessRouteForRole, type AdminRole } from '@/lib/auth/roles'

export type { AdminRole }

export interface AdminUser {
  id: string
  email: string
  role: AdminRole
  name: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: AdminUser
}

function iso(v: Date | string | null): string | null {
  if (v == null) return null
  return v instanceof Date ? v.toISOString() : String(v)
}

/**
 * Login com email e senha (Auth.js Credentials). Seta o cookie de sessão.
 * Use em route handler / server action.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    // Auth.js lança AuthError (ex.: CredentialsSignin) em falha de login
    return { success: false, error: 'Email ou senha inválidos, ou acesso não autorizado' }
  }
  const user = await getCurrentAdmin()
  if (!user) return { success: false, error: 'Acesso não autorizado ao painel admin' }
  return { success: true, user }
}

/** Logout — limpa o cookie de sessão. */
export async function signOut(): Promise<void> {
  await authSignOut({ redirect: false })
}

/**
 * Admin autenticado atual. Lê a sessão (JWT) e busca o registro fresco em
 * admin_users (garante is_active atualizado e os campos completos).
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  // DEV BYPASS: só quando explicitamente ligado em desenvolvimento local
  if (process.env.NODE_ENV === 'development' && process.env.ADMIN_AUTH_BYPASS === 'true') {
    const now = new Date().toISOString()
    return {
      id: 'dev-admin-bypass', email: 'dev@localhost', role: 'admin',
      name: 'Dev Admin', is_active: true, last_login_at: now, created_at: now, updated_at: now,
    }
  }

  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const row = await db.selectFrom('admin_users').selectAll()
    .where('id', '=', id).where('is_active', '=', true).executeTakeFirst()
  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    role: row.role as AdminRole,
    name: row.name,
    is_active: row.is_active,
    last_login_at: iso(row.last_login_at),
    created_at: iso(row.created_at)!,
    updated_at: iso(row.updated_at)!,
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null
}

/** admin tem acesso a tudo; senão, precisa bater o papel exato. */
export async function hasRole(requiredRole: AdminRole): Promise<boolean> {
  const admin = await getCurrentAdmin()
  if (!admin) return false
  if (admin.role === 'admin') return true
  return admin.role === requiredRole
}

/** Delegga pra matriz de acesso por papel (src/lib/auth/roles.ts). */
export async function canAccessRoute(pathname: string): Promise<boolean> {
  const admin = await getCurrentAdmin()
  if (!admin) return false
  return canAccessRouteForRole(admin.role, pathname)
}

/**
 * Reset de senha — TODO da Fase 5. O fluxo antigo usava o email do GoTrue.
 * No Auth.js próprio precisa de: tabela de tokens de reset + envio via Resend
 * (já disponível no site) + endpoint de verificação. Fica pra fatia seguinte.
 */
export async function requestPasswordReset(_email: string): Promise<AuthResult> {
  return { success: false, error: 'Reset de senha ainda não migrado (Fase 5 — fatia de reset pendente)' }
}

export async function updatePassword(_newPassword: string): Promise<AuthResult> {
  return { success: false, error: 'Reset de senha ainda não migrado (Fase 5 — fatia de reset pendente)' }
}
