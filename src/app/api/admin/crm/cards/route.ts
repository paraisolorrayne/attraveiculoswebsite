import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Visão CRM (somente leitura) — dados populados pelo Fykos via webhook.
// Acesso: admin e owner.
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin || !['admin', 'owner'].includes(admin.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  // IMPORTANTE: o retorno precisa incluir o JSONB `dados` (atribuido_em,
  // encerrado_em, observacoes_alerta, ultima_resposta_vendedor, ...) — o
  // modal de detalhes do painel depende dele. `select('*')` já o inclui.
  const { data, error } = await supabase
    .from('crm_cards')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ cards: data ?? [] })
}
