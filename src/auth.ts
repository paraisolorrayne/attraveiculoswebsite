import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from '@/auth.config'
import { db } from '@/lib/db'
import { isAdminRole } from '@/lib/auth/roles'

/**
 * Config completa do Auth.js (Node) — Credentials validando email+senha
 * contra admin_users (Kysely + bcrypt). Ver docs/MIGRACAO_POSTGRES_PURO.md.
 *
 * Requer env `AUTH_SECRET` (gerar com `npx auth secret`). Substitui o GoTrue
 * do Supabase. Reset de senha: fluxo próprio (ver src/lib/admin-auth-supabase.ts).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').toLowerCase().trim()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const user = await db.selectFrom('admin_users')
          .select(['id', 'email', 'role', 'name', 'password_hash'])
          .where('email', '=', email)
          .where('is_active', '=', true)
          .executeTakeFirst()

        if (!user || !user.password_hash) return null
        if (!isAdminRole(user.role)) return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        // Atualiza last_login (fire-and-forget)
        db.updateTable('admin_users').set({ last_login_at: new Date() })
          .where('id', '=', user.id).execute()
          .catch((e) => console.error('[auth] last_login update failed:', e))

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
