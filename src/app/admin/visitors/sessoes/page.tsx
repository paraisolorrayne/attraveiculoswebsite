import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsNav } from '../visitors-nav'
import { SessoesPainel } from './sessoes-painel'

export const metadata = {
  title: 'Sessões — Visitor Intelligence',
  description: 'Cada sessão com sua atribuição completa, e a jornada primeira × última origem',
}

export default async function SessoesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Sessões</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Uma a uma: de onde veio, com que marcação, em que página caiu, o que abriu e se falou
          com a Attra. E, no fim, o que trouxe cada cliente pela primeira vez.
        </p>
      </header>
      <VisitorsNav />
      {/* useSearchParams exige Suspense no App Router. */}
      <Suspense fallback={<div className="p-8 text-center text-sm text-foreground-secondary">Carregando…</div>}>
        <SessoesPainel />
      </Suspense>
    </div>
  )
}
