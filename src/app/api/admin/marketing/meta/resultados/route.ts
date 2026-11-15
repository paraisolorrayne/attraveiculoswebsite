import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { ErroDaMeta, metaConfigurada, PERIODOS_DA_META, resultadosDaConta, somar, type Metricas, type PeriodoDaMeta } from '@/lib/meta-ads'
import { carroDoAnuncio, chaveDoNome } from '@/lib/meta-campanhas'

export const dynamic = 'force-dynamic'

export interface LinhaDeResultado extends Metricas {
  /** Card do quadro, quando o anúncio está ligado a um. */
  cardId: string | null
  carro: string
  campanha: string | null
  /** true = no ar, false = pausado, null = sem card (anúncio antigo). */
  noAr: boolean | null
  anuncios: number
}

/**
 * GET — desempenho de todos os anúncios da conta no período, agrupado por
 * carro (o mesmo agrupamento dos cards). Lido na hora, nada é gravado.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (!metaConfigurada()) return NextResponse.json({ error: 'Meta Ads não está ligada a este painel.' }, { status: 503 })

  const pedido = request.nextUrl.searchParams.get('periodo') ?? '30d'
  const periodo: PeriodoDaMeta = pedido in PERIODOS_DA_META ? (pedido as PeriodoDaMeta) : '30d'

  try {
    const [resultados, cards] = await Promise.all([
      resultadosDaConta(periodo),
      db.selectFrom('campaign_vehicles as v')
        .innerJoin('marketing_campaigns as c', 'c.id', 'v.campaign_id')
        .select(['v.id', 'v.vehicle_name', 'v.meta_ad_ids', 'v.meta_no_ar', 'c.name as campanha'])
        .where(eb => eb(eb.fn('cardinality', ['v.meta_ad_ids']), '>', 0))
        .execute(),
    ])
    const cardDoAnuncio = new Map<string, (typeof cards)[number]>()
    for (const c of cards) for (const id of c.meta_ad_ids) cardDoAnuncio.set(id, c)

    const linhas = new Map<string, LinhaDeResultado>()
    for (const a of resultados.anuncios) {
      const card = cardDoAnuncio.get(a.id)
      const carro = card?.vehicle_name ?? carroDoAnuncio(a.nome)
      const chave = card ? `card:${card.id}` : `nome:${chaveDoNome(carro)}`
      const antes = linhas.get(chave)
      linhas.set(chave, {
        ...(antes ? somar(antes, a) : somar(a, { gasto: 0, impressoes: 0, cliquesNoLink: 0, conversas: 0, leads: 0, visitasNaPagina: 0, video: { inicios: 0, p25: 0, p50: 0, p75: 0, p100: 0 } })),
        cardId: card?.id ?? null,
        carro,
        campanha: card?.campanha ?? null,
        noAr: card ? card.meta_no_ar : null,
        anuncios: (antes?.anuncios ?? 0) + 1,
      })
    }
    return NextResponse.json({
      periodo,
      total: resultados.total,
      porDia: resultados.porDia,
      linhas: [...linhas.values()].sort((a, b) => b.gasto - a.gasto),
      lidoEm: resultados.lidoEm,
    })
  } catch (e) {
    console.warn('[meta] resultados da conta falharam:', e)
    return NextResponse.json({ error: e instanceof ErroDaMeta ? e.message : 'Não foi possível ler os resultados agora.' }, { status: 502 })
  }
}
