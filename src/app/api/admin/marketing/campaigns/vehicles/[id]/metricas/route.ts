import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { ErroDaMeta, metaConfigurada, metricasDosAnuncios, PERIODOS_DA_META, type PeriodoDaMeta } from '@/lib/meta-ads'

export const dynamic = 'force-dynamic'

/**
 * GET — métricas da Meta dos anúncios de UM card, lidas na hora do clique.
 *
 * Os ids dos anúncios saem do banco, pelo id do card: o navegador não escolhe
 * qual anúncio consultar. Nada é gravado.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (!metaConfigurada()) {
    return NextResponse.json({ error: 'Meta Ads não está ligada a este painel.' }, { status: 503 })
  }

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Card inválido' }, { status: 400 })
  const pedido = request.nextUrl.searchParams.get('periodo') ?? '30d'
  const periodo: PeriodoDaMeta = pedido in PERIODOS_DA_META ? (pedido as PeriodoDaMeta) : '30d'

  try {
    const card = await db.selectFrom('campaign_vehicles').select(['meta_ad_ids']).where('id', '=', id).executeTakeFirst()
    if (!card) return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    if (card.meta_ad_ids.length === 0) {
      return NextResponse.json({ error: 'Este card não veio da Meta.' }, { status: 404 })
    }
    return NextResponse.json({ metricas: await metricasDosAnuncios(card.meta_ad_ids, periodo) })
  } catch (e) {
    console.warn('[meta] métricas do card falharam:', e)
    const texto = e instanceof ErroDaMeta ? e.message : 'Não foi possível ler as métricas agora.'
    return NextResponse.json({ error: texto }, { status: 502 })
  }
}
