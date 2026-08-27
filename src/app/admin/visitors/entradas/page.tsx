import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../visitors-nav'
import { EntradasPainel } from './entradas-painel'

export const metadata = {
  title: 'Entradas — Visitor Intelligence',
  description: 'Em que página cada origem cai e quanto converte',
}

export default async function EntradasPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Entradas</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          A primeira página que cada visita abriu — e de onde veio quem abriu cada página. É
          onde se vê se o anúncio está mandando gente para a página certa.
        </p>
      </header>
      <VisitorsNav />
      <EntradasPainel />
    </div>
  )
}
