import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../../visitors-nav'
import { SessaoDetalhe } from './sessao-detalhe'

export const metadata = {
  title: 'Sessão — Visitor Intelligence',
  description: 'A visita inteira: origem, marcação, páginas, contato e as outras visitas da mesma pessoa',
}

/**
 * Página de UMA sessão. Tem URL própria de propósito: o link pode ser colado
 * num WhatsApp ("olha essa visita") e a lista continua atrás, no botão voltar.
 */
export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  const { id } = await params

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VisitorsNav />
      <SessaoDetalhe sessionId={decodeURIComponent(id)} />
    </div>
  )
}
