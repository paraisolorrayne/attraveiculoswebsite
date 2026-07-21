import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

// Visão CRM (somente leitura) — dados populados pelo Fykos via webhook.
// Acesso: admin e owner.
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin || !['admin', 'owner'].includes(admin.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // IMPORTANTE: inclui o JSONB `dados` (o modal de detalhes depende dele).
  try {
    const data = await db.selectFrom('crm_cards').selectAll()
      .orderBy('atualizado_em', 'desc')
      .limit(500)
      .execute()
    return NextResponse.json({ cards: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'query failed' }, { status: 500 })
  }
}
