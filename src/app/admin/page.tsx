import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { sectionsForRole } from '@/lib/admin-sections'
import { ROLE_LABELS, isAdminRole, type AdminRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  const role = (isAdminRole(admin.role) ? admin.role : 'gerente') as AdminRole
  const sections = sectionsForRole(role, admin.secoes)
  const firstName = (admin.name || admin.email.split('@')[0]).split(' ')[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
        <p className="mt-1 text-foreground-secondary">
          Bem-vindo(a), <span className="text-foreground">{firstName}</span>
          {' · '}
          <span className="text-primary">{ROLE_LABELS[role]}</span>
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-foreground-secondary">
          Seu perfil ainda não tem seções liberadas. Fale com um administrador.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(({ label, href, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col gap-3 rounded-xl border border-border bg-background-card p-5 transition-colors hover:border-primary/50 hover:bg-background"
            >
              <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-foreground-secondary opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{label}</div>
                <div className="mt-0.5 text-sm text-foreground-secondary">{description}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
