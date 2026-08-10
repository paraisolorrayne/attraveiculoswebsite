import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'

export const dynamic = 'force-dynamic'

/**
 * Comportamento na página — a tabela mais rica do rastreamento e a menos
 * exposta. São 20.327 registros em `visitor_page_views` com tempo de leitura,
 * profundidade de rolagem e clique de contato POR PÁGINA, e nada disso aparecia
 * no painel.
 *
 * TUDO aqui usa MEDIANA, nunca média. Medido no histórico: mediana 29s, p95
 * 509s, máximo 565.819s — seis dias e meio, que é aba esquecida aberta, não
 * leitura. A média sai em 498s e faria o painel afirmar que o visitante passa
 * oito minutos por página. Seria bonito, seria falso, e decisão de conteúdo
 * tomada em cima disso erra o alvo inteiro.
 */

const DIAS_PADRAO = 30

/** Acima disto não é leitura, é aba aberta. Só afeta as contagens de outlier. */
const TETO_LEITURA_SEGUNDOS = 1800

/** Volume mínimo para uma página entrar nas listas ordenadas por taxa. */
const MINIMO_VISUALIZACOES = 20

const LIMITE_LISTAS = 15

export interface LinhaTipoPagina {
  page_type: string
  visualizacoes: number
  sessoes: number
  tempo_mediano: number | null
  rolagem_mediana: number | null
  com_whatsapp: number
}

export interface LinhaPagina {
  page_path: string
  visualizacoes: number
  tempo_mediano: number | null
  rolagem_mediana: number | null
  com_whatsapp: number
}

export interface FaixaRolagem {
  faixa: string
  visualizacoes: number
}

export async function GET(request: NextRequest) {
  // Mesma regra da visão geral: papel OU seção concedida ao usuário.
  const admin = await adminComAcessoA('/admin/visitors')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dias = Number(request.nextUrl.searchParams.get('dias') ?? DIAS_PADRAO)
  const desde = dias > 0 ? new Date(Date.now() - dias * 86_400_000) : null
  const noPeriodo = desde ? sql`v.viewed_at >= ${desde}` : sql`true`

  try {
    const [porTipo, prendem, perdem, rolagem, resumo] = await Promise.all([
      // Engajamento por tipo de página. É o recorte que responde "onde a pessoa
      // realmente para" — listagem, ficha de veículo, blog ou institucional.
      sql<LinhaTipoPagina>`
        select
          coalesce(nullif(btrim(v.page_type), ''), '(sem tipo)') as page_type,
          count(*)::int as visualizacoes,
          count(distinct v.session_id)::int as sessoes,
          percentile_cont(0.5) within group (order by v.time_on_page_seconds)::int as tempo_mediano,
          percentile_cont(0.5) within group (order by v.scroll_depth_percent)::int as rolagem_mediana,
          (count(*) filter (where v.clicked_whatsapp))::int as com_whatsapp
        from visitor_page_views v
        where ${noPeriodo}
        group by 1
        order by visualizacoes desc
      `.execute(db),

      // As páginas que mais prendem. Ordenar por tempo sem piso de volume faria
      // o topo ser sempre uma página vista três vezes por acaso.
      sql<LinhaPagina>`
        select
          v.page_path,
          count(*)::int as visualizacoes,
          percentile_cont(0.5) within group (order by v.time_on_page_seconds)::int as tempo_mediano,
          percentile_cont(0.5) within group (order by v.scroll_depth_percent)::int as rolagem_mediana,
          (count(*) filter (where v.clicked_whatsapp))::int as com_whatsapp
        from visitor_page_views v
        where ${noPeriodo}
        group by 1
        having count(*) >= ${MINIMO_VISUALIZACOES}
        order by tempo_mediano desc nulls last
        limit ${LIMITE_LISTAS}
      `.execute(db),

      // O inverso, e o mais acionável: página com público e sem atenção. Muita
      // visita com tempo baixo é promessa não cumprida — o título atraiu e o
      // conteúdo não sustentou.
      sql<LinhaPagina>`
        select
          v.page_path,
          count(*)::int as visualizacoes,
          percentile_cont(0.5) within group (order by v.time_on_page_seconds)::int as tempo_mediano,
          percentile_cont(0.5) within group (order by v.scroll_depth_percent)::int as rolagem_mediana,
          (count(*) filter (where v.clicked_whatsapp))::int as com_whatsapp
        from visitor_page_views v
        where ${noPeriodo}
        group by 1
        having count(*) >= ${MINIMO_VISUALIZACOES}
        order by tempo_mediano asc nulls last
        limit ${LIMITE_LISTAS}
      `.execute(db),

      // Até onde a pessoa desce. O CTA de contato mora no fim da ficha: se a
      // maioria para antes de 50%, ele nunca é visto — e isso é layout, não
      // falta de interesse.
      sql<FaixaRolagem>`
        select
          case
            when v.scroll_depth_percent < 25 then '0-25%'
            when v.scroll_depth_percent < 50 then '25-50%'
            when v.scroll_depth_percent < 75 then '50-75%'
            else '75-100%'
          end as faixa,
          count(*)::int as visualizacoes
        from visitor_page_views v
        where ${noPeriodo} and v.scroll_depth_percent is not null
        group by 1
        order by 1
      `.execute(db),

      // O resumo carrega as próprias ressalvas: quantas visualizações não têm
      // tempo medido e quantas estouram o teto. Sem isso, quem lê a mediana não
      // sabe sobre o que ela foi calculada.
      sql<{
        visualizacoes: number
        sem_tempo: number
        acima_do_teto: number
        sem_rolagem: number
        tempo_mediano: number | null
        rolagem_mediana: number | null
      }>`
        select
          count(*)::int as visualizacoes,
          (count(*) filter (where v.time_on_page_seconds is null))::int as sem_tempo,
          (count(*) filter (where v.time_on_page_seconds > ${TETO_LEITURA_SEGUNDOS}))::int as acima_do_teto,
          (count(*) filter (where v.scroll_depth_percent is null))::int as sem_rolagem,
          percentile_cont(0.5) within group (order by v.time_on_page_seconds)::int as tempo_mediano,
          percentile_cont(0.5) within group (order by v.scroll_depth_percent)::int as rolagem_mediana
        from visitor_page_views v
        where ${noPeriodo}
      `.execute(db),
    ])

    return NextResponse.json({
      periodo_dias: dias,
      minimo_visualizacoes: MINIMO_VISUALIZACOES,
      teto_leitura_segundos: TETO_LEITURA_SEGUNDOS,
      resumo: resumo.rows[0] ?? null,
      por_tipo: porTipo.rows,
      prendem: prendem.rows,
      perdem: perdem.rows,
      rolagem: rolagem.rows,
    })
  } catch (erro) {
    console.error('[admin/visitors/comportamento]', erro)
    return NextResponse.json(
      { error: 'Não foi possível carregar o comportamento de navegação.' },
      { status: 500 },
    )
  }
}
