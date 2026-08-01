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
  // A rota da UI é /admin/usuarios (a API é /api/admin/users) — negamos as duas.
  owner: ['*', '!/admin/usuarios', '!/admin/users'],
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
 * Gestão de usuários: exclusiva do papel `admin` e IMUNE a exceção.
 * Conceder esta área a outro papel equivale a dar a ele o poder de editar
 * papéis e permissões — ou seja, de se promover a admin.
 */
export const AREAS_SO_ADMIN = ['/admin/usuarios', '/admin/users', '/api/admin/users']

function ehAreaSoAdmin(pathname: string): boolean {
  return AREAS_SO_ADMIN.some((p) => pathname.startsWith(p))
}

/**
 * Exceções de acesso por usuário: `{ '<prefixo>': true | false }`.
 * `true` concede uma seção que o papel não teria; `false` revoga uma que teria.
 */
export type SecoesExtras = Record<string, boolean>

/** Só prefixos de rota do admin, para lixo no JSONB não virar regra. */
function excecaoAplicavel(prefixo: string, pathname: string): boolean {
  return prefixo.startsWith('/admin/') && pathname.startsWith(prefixo)
}

/**
 * O usuário pode acessar a rota?
 *
 * Precedência, do mais forte para o mais fraco:
 *   1. login/reset — sempre liberados;
 *   2. `admin` — acesso total, e exceções NÃO se aplicam a ele (é quem
 *      administra os demais e não pode se trancar para fora);
 *   3. gestão de usuários — só `admin`, sem exceção que valha;
 *   4. exceção do usuário (`false` revoga, `true` concede);
 *   5. matriz do papel, como sempre foi.
 *
 * `secoes` é opcional: chamadas antigas de dois argumentos seguem válidas.
 */
export function canAccessRoute(
  role: AdminRole,
  pathname: string,
  secoes?: SecoesExtras | null,
): boolean {
  if (ALWAYS_ALLOWED.some((p) => pathname === p)) return true
  if (role === 'admin') return true
  if (ehAreaSoAdmin(pathname)) return false

  if (secoes) {
    // Prefixo mais específico ganha: uma exceção em /admin/blog/x deve pesar
    // mais que outra, contrária, em /admin/blog.
    const aplicaveis = Object.keys(secoes)
      .filter((p) => excecaoAplicavel(p, pathname))
      .sort((a, b) => b.length - a.length)
    if (aplicaveis.length > 0) return secoes[aplicaveis[0]] === true
  }

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
