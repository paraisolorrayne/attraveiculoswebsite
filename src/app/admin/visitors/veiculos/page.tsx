import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../visitors-nav'
import { VeiculosPainel } from './veiculos-painel'

export const metadata = {
  title: 'Veículos — Visitor Intelligence',
  description: 'Interesse por veículo, faixa procurada e silêncio após a visita',
}

export default async function VeiculosVisitantesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Veículos</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Quais carros o público abre, quais não geram conversa e se a faixa procurada é a que está no pátio.
        </p>
      </header>
      <VisitorsNav />
      <VeiculosPainel />
    </div>
  )
}
