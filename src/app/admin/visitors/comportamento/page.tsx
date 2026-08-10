import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../visitors-nav'
import { ComportamentoPainel } from './comportamento-painel'

export const metadata = {
  title: 'Comportamento — Visitor Intelligence',
  description: 'Leitura, rolagem e contato por página',
}

/**
 * O acesso por seção é decidido no layout do admin, que lê `x-pathname` e
 * aplica as exceções por usuário. Como a regra é por prefixo, quem tem
 * `/admin/visitors` liberado tem esta subpágina junto — não há permissão nova
 * a conceder.
 */
export default async function ComportamentoPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Comportamento</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          O que a pessoa faz depois de chegar: quanto lê, até onde desce e onde decide falar.
        </p>
      </header>
      <VisitorsNav />
      <ComportamentoPainel />
    </div>
  )
}
