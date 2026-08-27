import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../visitors-nav'
import { OrigensPainel } from './origens-painel'

export const metadata = {
  title: 'Origens — Visitor Intelligence',
  description: 'Fonte e meio, referenciadores, tendência por canal e auditoria de UTM',
}

/**
 * Acesso por seção decidido no layout do admin (prefixo /admin/visitors):
 * quem tem a seção tem esta aba — não há permissão nova.
 */
export default async function OrigensPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Origens</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          De onde exatamente cada visita veio: fonte e meio como foram marcados, os sites que
          mandam gente, o dia a dia por canal e o que está errado na marcação.
        </p>
      </header>
      <VisitorsNav />
      <OrigensPainel />
    </div>
  )
}
