import type { AdminRole } from '@/lib/auth/roles'
import 'next-auth'
import 'next-auth/jwt'

// Augmenta a sessão/token do Auth.js com o papel e o id do admin.
declare module 'next-auth' {
  interface User {
    role?: AdminRole
  }
  interface Session {
    user: {
      id: string
      role: AdminRole
      email?: string | null
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    role?: AdminRole
  }
}
