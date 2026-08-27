import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../../visitors-nav'
import { CampanhaPainel } from './campanha-painel'

export const metadata = {
  title: 'Campanha — Visitor Intelligence',
  description: 'Uma campanha por dentro: criativos, termos, entradas, veículos e leads',
}

/**
 * `chave` é a chave de agrupamento da Visão geral (nome em minúsculas ou
 * "campanha #id"), codificada na URL. A página é alcançada por link, não por
 * aba; a barra de abas fica sem item ativo.
 */
export default async function CampanhaPage({ params }: { params: Promise<{ chave: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  const { chave } = await params
  const decodificada = decodeURIComponent(chave)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <Link href="/admin/visitors" className="text-xs text-foreground-secondary hover:underline">
          ← Visão geral
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Campanha</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Tudo o que esta campanha trouxe: de onde as visitas chegaram, com que criativo e termo,
          em que página caíram, que carros abriram e quem virou conversa.
        </p>
      </header>
      <VisitorsNav />
      <CampanhaPainel chave={decodificada} />
    </div>
  )
}
