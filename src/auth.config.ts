import type { NextAuthConfig } from 'next-auth'

/**
 * Config base do Auth.js — SEM providers e SEM acesso a banco, pra ser
 * edge-safe (o middleware roda no edge). O provider Credentials (Node: pg +
 * bcrypt) fica em src/auth.ts. Padrão recomendado do Auth.js v5.
 * O gating de rota fica no src/middleware.ts (custom, com redirects).
 */
export const authConfig = {
  // Vazio aqui (edge-safe); o Credentials real fica em src/auth.ts.
  providers: [],
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/admin/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.role = user.role
        token.secoes = user.secoes ?? {}
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string
        session.user.role = token.role!
        // O middleware lê as exceções por aqui (req.auth.user.secoes).
        session.user.secoes = token.secoes ?? {}
      }
      return session
    },
  },
} satisfies NextAuthConfig
