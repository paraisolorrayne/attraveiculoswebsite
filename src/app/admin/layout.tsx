import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { AdminHeader } from '@/components/admin/admin-header'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute, isAdminRole, type AdminRole } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Admin Panel | Attra Veículos',
  description: 'Painel administrativo Attra Veículos',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get current admin user (may be null on login page)
  const admin = await getCurrentAdmin()

  // Ponto AUTORITATIVO de acesso por seção.
  //
  // Fica aqui, e não no middleware, porque o middleware roda no edge (sem
  // banco): ele só conheceria as exceções por um token que pode estar velho, e
  // o pior modo de falha seria bloquear um acesso que o admin acabou de
  // conceder. Aqui a leitura é fresca e vale para toda página de /admin/*,
  // inclusive as que não fazem checagem nenhuma por conta própria.
  //
  // O caminho vem do header que o middleware carimba (x-pathname): um layout
  // do App Router não recebe a rota atual de outra forma.
  if (admin) {
    const pathname = (await headers()).get('x-pathname') ?? ''
    // DIAGNOSTICO TEMPORARIO — remover depois
    console.error('[layout-diag] x-pathname=' + JSON.stringify(pathname) +
      ' role=' + admin.role + ' secoes=' + JSON.stringify(admin.secoes))
    const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
    if (pathname.startsWith('/admin/') && !canAccessRoute(role, pathname, admin.secoes)) {
      redirect('/admin')
    }
  }

  // Admin pages have a clean layout without main site header/footer
  return (
    <div className="min-h-screen bg-background">
      {admin && <AdminHeader admin={admin} />}
      {children}
    </div>
  )
}
