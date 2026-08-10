import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'
import { AREAS_SO_ADMIN, isAdminRole } from '@/lib/auth/roles'

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
const comAutenticacao = auth((req) => {
  const { pathname } = req.nextUrl

  // Só protege /admin/*; login e reset são livres.
  if (!pathname.startsWith('/admin')) return
  if (pathname === '/admin/login' || pathname.startsWith('/admin/reset-password')) return

  const role = req.auth?.user?.role

  // Sem sessão válida → login
  if (!role || !isAdminRole(role)) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // Gestão de usuários é exclusiva do `admin` e imune a exceção — quem a
  // recebesse poderia editar papéis e se promover. Fica no gate mais externo
  // porque a decisão depende só do papel, que o token sempre traz.
  if (role !== 'admin' && AREAS_SO_ADMIN.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // /admin puro é o hub e todo papel autenticado vê; o carimbo segue junto
  // para o layout não precisar de exceção.
  const headers = new Headers(req.headers)
  headers.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers } })
})

/**
 * A rota de veículo também precisa do carimbo — mas SEM passar pela
 * autenticação.
 *
 * O `not-found.tsx` de `/veiculo/[slug]` não recebe params: é ele que atende o
 * carro que saiu do estoque, e sem saber QUAL carro foi pedido não tem como
 * sugerir semelhantes. O caminho vem por `x-pathname`, como no admin.
 *
 * O desvio antes de `comAutenticacao` é o que importa: envolver a rota pública
 * no `auth()` faria o JWT ser decodificado a cada visita de ficha de veículo —
 * trabalho de sessão numa página que não tem sessão, no caminho mais quente do
 * site.
 */
export default function middleware(
  req: Parameters<typeof comAutenticacao>[0],
  ctx: Parameters<typeof comAutenticacao>[1],
) {
  if (req.nextUrl.pathname.startsWith('/veiculo/')) {
    const headers = new Headers(req.headers)
    headers.set('x-pathname', req.nextUrl.pathname)
    return NextResponse.next({ request: { headers } })
  }
  return comAutenticacao(req, ctx)
}

export const config = {
  matcher: ['/admin/:path*', '/veiculo/:path*'],
}
