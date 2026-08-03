import type { AdminRole, SecoesExtras } from '@/lib/auth/roles'
import 'next-auth'
import 'next-auth/jwt'

// Augmenta a sessão/token do Auth.js com o papel e o id do admin.
declare module 'next-auth' {
  interface User {
    role?: AdminRole
    secoes?: SecoesExtras | null
  }
  interface Session {
    user: {
      id: string
      role: AdminRole
      secoes?: SecoesExtras | null
      email?: string | null
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    role?: AdminRole
    // O middleware roda no edge, sem banco: sem as exceções aqui ele decidia
    // só pela matriz do papel e ignorava as seções concedidas por usuário.
    secoes?: SecoesExtras | null
  }
}
