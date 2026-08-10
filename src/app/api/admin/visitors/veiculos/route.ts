import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { loadListedInventory } from '@/app/api/llm/_inventory'

export const dynamic = 'force-dynamic'

/**
 * Interesse por veículo — o que o público olha, e o que isso diz sobre o
 * estoque.
 *
 * A visão geral já lista os veículos mais vistos. O que faltava era o outro
 * lado: quais recebem público e NÃO geram conversa, e se a faixa de preço que
 * as pessoas procuram é a mesma que a loja compra. A primeira pergunta é de
 * anúncio; a segunda é de curadoria, e é a mais cara de errar.
 *
 * Ressalva de horizonte: `vehicle_price` só passou a ser preenchido em
 * 27/07/2026, quando o preenchimento retroativo entrou. Antes disso a coluna é
 * nula em 100% das visualizações. A seção de faixa de preço declara sobre
 * quantas visualizações ela foi calculada em vez de fingir cobrir o histórico.
 */

const DIAS_PADRAO = 30
const LIMITE_LISTAS = 15

/**
 * Faixas de preço em milhões de reais. Escolhidas para separar decisões reais
 * de compra, não para dar barras bonitas: abaixo de 300 mil é outro comprador
 * que o de 1 milhão, e acima de 2 milhões é praticamente outro negócio.
 */
const FAIXAS: Array<{ rotulo: string; min: number; max: number | null }> = [
  { rotulo: 'Até R$ 300 mil', min: 0, max: 300_000 },
  { rotulo: 'R$ 300–500 mil', min: 300_000, max: 500_000 },
  { rotulo: 'R$ 500 mil–1 mi', min: 500_000, max: 1_000_000 },
  { rotulo: 'R$ 1–2 mi', min: 1_000_000, max: 2_000_000 },
  { rotulo: 'Acima de R$ 2 mi', min: 2_000_000, max: null },
]

function faixaDe(preco: number): string {
  const f = FAIXAS.find(x => preco >= x.min && (x.max === null || preco < x.max))
  return f?.rotulo ?? FAIXAS[FAIXAS.length - 1].rotulo
}

interface LinhaClique {
  id: string
  clicked_at: string
  page_path: string | null
  vehicle_id: string | null
  correlacionado: boolean
  session_id: string | null
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  referrer: string
  tem_gclid: boolean
  city: string
  region: string
  device_type: string
}

interface LinhaVeiculo {
  vehicle_slug: string
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_price: number | null
  visualizacoes: number
  sessoes: number
  com_whatsapp: number
  tempo_mediano: number | null
}

export async function GET(request: NextRequest) {
  const admin = await adminComAcessoA('/admin/visitors')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dias = Number(request.nextUrl.searchParams.get('dias') ?? DIAS_PADRAO)
  const desde = dias > 0 ? new Date(Date.now() - dias * 86_400_000) : null
  const noPeriodo = desde ? sql`v.viewed_at >= ${desde}` : sql`true`

  try {
    const [porVeiculo, precos, cliques, estoque] = await Promise.all([
      // Um registro por veículo visto, com engajamento junto. É daqui que saem
      // as duas listas da página — as mais vistas e as sem conversa.
      sql<LinhaVeiculo>`
        select
          v.vehicle_slug,
          max(v.vehicle_brand) as vehicle_brand,
          max(v.vehicle_model) as vehicle_model,
          max(v.vehicle_price)::float8 as vehicle_price,
          count(*)::int as visualizacoes,
          count(distinct v.session_id)::int as sessoes,
          (count(*) filter (where v.clicked_whatsapp))::int as com_whatsapp,
          percentile_cont(0.5) within group (order by v.time_on_page_seconds)::int as tempo_mediano
        from visitor_page_views v
        where ${noPeriodo} and v.vehicle_slug is not null
        group by 1
        order by visualizacoes desc
      `.execute(db),

      // Faixa de preço procurada. Só sobre visualizações COM preço — o total
      // vai junto para a página poder declarar a cobertura.
      sql<{ vehicle_price: number; visualizacoes: number }>`
        select v.vehicle_price::float8 as vehicle_price, count(*)::int as visualizacoes
        from visitor_page_views v
        where ${noPeriodo} and v.vehicle_slug is not null and v.vehicle_price is not null
        group by 1
      `.execute(db),

      // Cada clique de WhatsApp, COM a origem da sessão.
      //
      // Era o que faltava para responder "de onde veio esse lead que chegou às
      // 12:41". O painel só tinha agregados — canais, campanhas, veículos — e
      // não havia caminho de um contato individual até a sessão que o originou.
      // Esse trajeto só existia por consulta manual no banco.
      //
      // Traz termo e anúncio junto: quando a campanha não vem marcada — o caso
      // de 259 das 261 sessões pagas dos últimos dois dias — é `utm_term` que
      // diz o que a pessoa buscou, e é a única pista que sobra.
      sql<LinhaClique>`
        select
          w.id,
          w.clicked_at,
          w.page_path,
          w.vehicle_id,
          (w.consumido_em is not null) as correlacionado,
          s.session_id,
          coalesce(nullif(btrim(s.utm_source), ''), '(sem utm)') as utm_source,
          coalesce(nullif(btrim(s.utm_medium), ''), '-') as utm_medium,
          coalesce(nullif(btrim(s.utm_campaign), ''), '(não marcada)') as utm_campaign,
          coalesce(nullif(btrim(s.utm_term), ''), '') as utm_term,
          coalesce(nullif(btrim(s.utm_content), ''), '') as utm_content,
          coalesce(nullif(btrim(s.referrer_domain), ''), '(direto)') as referrer,
          (s.gclid is not null) as tem_gclid,
          coalesce(s.city, '') as city,
          coalesce(s.region, '') as region,
          coalesce(f.device_type, '') as device_type
        from whatsapp_clicks w
        left join visitor_sessions s on s.id = w.session_db_id
        left join visitor_fingerprints f on f.id = s.fingerprint_id
        where ${desde ? sql`w.clicked_at >= ${desde}` : sql`true`}
        order by w.clicked_at desc
        limit 50
      `.execute(db),

      loadListedInventory().catch(() => ({ vehicles: [] })),
    ])

    const vistos = porVeiculo.rows
    const totalComPreco = precos.rows.reduce((s, p) => s + p.visualizacoes, 0)
    const totalFichas = vistos.reduce((s, v) => s + v.visualizacoes, 0)

    // Procurado x disponível, faixa a faixa. Lado a lado é o que transforma
    // dois números soltos numa decisão de compra.
    const procurado = new Map<string, number>()
    for (const p of precos.rows) {
      const f = faixaDe(Number(p.vehicle_price))
      procurado.set(f, (procurado.get(f) ?? 0) + p.visualizacoes)
    }
    const disponivel = new Map<string, number>()
    for (const veiculo of estoque.vehicles) {
      if (!(veiculo.price > 0)) continue
      const f = faixaDe(veiculo.price)
      disponivel.set(f, (disponivel.get(f) ?? 0) + 1)
    }

    const faixas = FAIXAS.map(f => ({
      faixa: f.rotulo,
      visualizacoes: procurado.get(f.rotulo) ?? 0,
      em_estoque: disponivel.get(f.rotulo) ?? 0,
    }))

    // Público sem conversa. Exige volume: um carro visto duas vezes sem clique
    // não é sinal de nada, e apareceria no topo de qualquer ordenação por
    // ausência.
    const minimoParaSilencio = 10
    const semContato = vistos
      .filter(v => v.visualizacoes >= minimoParaSilencio && v.com_whatsapp === 0)
      .slice(0, LIMITE_LISTAS)

    return NextResponse.json({
      periodo_dias: dias,
      total_fichas: totalFichas,
      visualizacoes_com_preco: totalComPreco,
      minimo_para_silencio: minimoParaSilencio,
      mais_vistos: vistos.slice(0, LIMITE_LISTAS),
      sem_contato: semContato,
      faixas,
      cliques_whatsapp: cliques.rows,
      veiculos_no_estoque: estoque.vehicles.length,
    })
  } catch (erro) {
    console.error('[admin/visitors/veiculos]', erro)
    return NextResponse.json(
      { error: 'Não foi possível carregar o interesse por veículo.' },
      { status: 500 },
    )
  }
}
