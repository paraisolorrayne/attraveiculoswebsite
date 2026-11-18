import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { BoletosAdmin } from './boletos-admin'

/**
 * Boletos dos clientes (18/11/2026): o financeiro cadastra um por vez ou sobe
 * a planilha, e a tela mostra o que vence hoje, o que atrasou e quem já foi
 * lembrado. Substitui a tela de cobranças do CRM antigo, removida em julho.
 */
export default async function BoletosPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  if (!canAccessRoute(admin.role, '/admin/boletos', admin.secoes)) redirect('/admin')

  // Os filtros ficam na URL (useSearchParams pede Suspense).
  return (
    <Suspense fallback={null}>
      <BoletosAdmin />
    </Suspense>
  )
}
