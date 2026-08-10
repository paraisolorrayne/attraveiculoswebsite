import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { VisitorsDashboard } from './visitors-dashboard'
import { VisitorsNav } from './visitors-nav'

export const metadata = {
  title: 'Visitor Intelligence',
  description: 'Dashboard de inteligência de visitantes e leads',
}

export default async function VisitorsPage() {
  const admin = await getCurrentAdmin()
  
  if (!admin) {
    redirect('/admin/login')
  }

  // O acesso por seção é decidido no layout do admin (src/app/admin/layout.tsx),
  // que considera papel + exceções por usuário. A regra fixa que existia aqui
  // ("só admin") contradizia a própria matriz — nem o operador, que a matriz
  // libera, entrava — e impediria conceder a seção a alguém por exceção.

  return (
    <>
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <VisitorsNav />
      </div>
      <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
        <VisitorsDashboard adminId={admin.id} />
      </Suspense>
    </>
  )
}

