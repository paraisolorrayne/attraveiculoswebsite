import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { sincronizarCampanhasDaMeta } from '@/lib/meta-campanhas'

export const dynamic = 'force-dynamic'

// POST — botão "Atualizar da Meta": sincroniza agora, sem esperar os 15 minutos.
export async function POST() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const meta = await sincronizarCampanhasDaMeta({ forcar: true })
  return NextResponse.json({ meta }, { status: meta.erro ? 502 : 200 })
}
