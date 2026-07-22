/**
 * Modelo de papéis do admin (Fase 5 — Auth.js).
 *
 * Níveis (definidos com a Lorrayne):
 *   admin     — acesso TOTAL, incluindo gestão de usuários  (Lorrayne)
 *   owner     — tudo, exceto gestão de usuários             (Cris)
 *   operador  — operação do dia a dia                        (Pedro Spini)
 *   marketing — marketing / conteúdo                         (Eduardo)
 *   gerente   — acesso limitado (visão restrita)             (a definir)
 *
 * A matriz abaixo é o DEFAULT proposto — ajustável a qualquer momento.
 * `admin` sempre passa; os demais liberam por prefixo de rota.
 */

export const ADMIN_ROLES = ['admin', 'owner', 'operador', 'marketing', 'gerente'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

/** Rótulos legíveis (UI). */
export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Admin (total)',
  owner: 'Owner',
  operador: 'Operador',
  marketing: 'Marketing',
  gerente: 'Gerente',
}

// Prefixos de rota liberados por papel (admin ignora isto — tem tudo).
// Sempre incluídos pra todos: /admin/login e /admin/reset-password.
const ROUTE_ACCESS: Record<Exclude<AdminRole, 'admin'>, string[]> = {
  // Owner: tudo menos gestão de usuários (isso é do admin total).
  owner: ['*', '!/admin/users'],
  // Operador: operação — sons, gerador, blog, news, CRM (leitura), visitantes.
  operador: [
    '/admin/engine-sounds',
    '/admin/gerador-criativos',
    '/admin/blog',
    '/admin/news',
    '/admin/crm',
    '/admin/visitors',
  ],
  // Marketing: marketing, conteúdo e disparos.
  marketing: [
    '/admin/marketing',
    '/admin/blog',
    '/admin/news',
    '/admin/newsletter',
    '/admin/gerador-criativos',
  ],
  // Gerente: limitado (mantém o comportamento antigo).
  gerente: [
    '/admin/engine-sounds',
    '/admin/gerador-criativos',
    '/admin/blog',
    '/admin/marketing',
  ],
}

const ALWAYS_ALLOWED = ['/admin/login', '/admin/reset-password']

/**
 * O papel pode acessar a rota? `admin` sempre; demais pela matriz.
 * Regras suportadas: '*' (tudo) e '!<prefixo>' (negação explícita).
 */
export function canAccessRoute(role: AdminRole, pathname: string): boolean {
  if (role === 'admin') return true
  if (ALWAYS_ALLOWED.some((p) => pathname === p)) return true

  const rules = ROUTE_ACCESS[role] ?? []
  // Negações têm prioridade
  if (rules.some((r) => r.startsWith('!') && pathname.startsWith(r.slice(1)))) {
    return false
  }
  if (rules.includes('*')) return true
  return rules.some((r) => !r.startsWith('!') && pathname.startsWith(r))
}

/** `admin` ou `owner` — os papéis "altos" (ex.: ver o CRM). */
export function isPrivileged(role: AdminRole): boolean {
  return role === 'admin' || role === 'owner'
}
