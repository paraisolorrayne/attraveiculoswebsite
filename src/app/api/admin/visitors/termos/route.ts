import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { db } from '@/lib/db'
import {
  classificarPadrao, pisoWilson, VOLUME_MINIMO_TERMO, type PadraoTermo,
} from '@/lib/termos-conversao'
import { ehMacroNaoSubstituida, termoEhNomeDeAnuncio, termoEhPalavraChave } from '@/lib/visitors/marcacao-plataforma'

export const dynamic = 'force-dynamic'

/**
 * GET — o que veio em `utm_term`, separado por PLATAFORMA.
 *
 * A separação existe porque o mesmo campo carrega duas coisas incompatíveis:
 * no Google `utm_term` é a palavra-chave buscada; na Meta, com o padrão
 * adotado em 28/08/2026 (`utm_term={{ad.name}}`), é o nome do anúncio. Medido
 * em 29/08/2026, 6.275 das 9.791 sessões com utm_term — 64% — eram nome de
 * criativo da Meta somando na média de "termos de busca" e achatando o que os
 * termos de verdade comprovam.
 *
 * Conversão aqui é o que o SITE observa: clique de WhatsApp ou envio de
 * formulário. Não é venda fechada — o CRM chega por webhook e tem ciclo próprio.
 */
export async function GET(request: NextRequest) {
  const admin = await adminComAcessoA('/admin/visitors')
  if (!admin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const dias = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('dias')) || 90))

  try {
    // Agrupa por termo E origem: a origem é o que decide se aquilo é palavra
    // buscada ou nome de anúncio, e classificar pelo texto (o que se fazia
    // antes) erra em todo criativo que não comece com "Reels"/"Corte".
    const { rows } = await sql<{
      termo: string; utm_source: string | null; gclid: boolean; fbclid: boolean; ttclid: boolean
      sessoes: string; conversoes: string
    }>`
      SELECT utm_term AS termo,
             nullif(btrim(utm_source), '') AS utm_source,
             bool_or(gclid IS NOT NULL AND gclid <> '') AS gclid,
             bool_or(fbclid IS NOT NULL AND fbclid <> '') AS fbclid,
             bool_or(ttclid IS NOT NULL AND ttclid <> '') AS ttclid,
             count(*)::text AS sessoes,
             count(*) FILTER (WHERE contacted_whatsapp OR submitted_form)::text AS conversoes
        FROM visitor_sessions
       WHERE utm_term IS NOT NULL
         AND utm_term <> ''
         AND started_at >= now() - (${dias} || ' days')::interval
       GROUP BY 1, 2
    `.execute(db)

    interface Linha {
      termo: string
      padrao: PadraoTermo
      sessoes: number
      conversoes: number
      taxa: number
      piso: number
    }

    const busca = new Map<string, { sessoes: number; conversoes: number }>()
    const anuncios = new Map<string, { sessoes: number; conversoes: number }>()
    let semPlataforma = 0
    let macros = 0

    for (const r of rows) {
      const sessoes = Number(r.sessoes)
      const conversoes = Number(r.conversoes)
      // Macro não substituída não é termo nem anúncio: é falha de marcação.
      if (ehMacroNaoSubstituida(r.termo)) {
        macros += sessoes
        continue
      }
      const atrib = {
        utm_source: r.utm_source,
        gclid: r.gclid ? '1' : null,
        fbclid: r.fbclid ? '1' : null,
        ttclid: r.ttclid ? '1' : null,
      }
      const destino = termoEhPalavraChave(atrib) ? busca : termoEhNomeDeAnuncio(atrib) ? anuncios : null
      if (!destino) {
        semPlataforma += sessoes
        continue
      }
      const alvo = destino.get(r.termo) ?? { sessoes: 0, conversoes: 0 }
      alvo.sessoes += sessoes
      alvo.conversoes += conversoes
      destino.set(r.termo, alvo)
    }

    const montar = (mapa: Map<string, { sessoes: number; conversoes: number }>): Linha[] =>
      [...mapa.entries()].map(([termo, a]) => ({
        termo,
        padrao: classificarPadrao(termo),
        sessoes: a.sessoes,
        conversoes: a.conversoes,
        taxa: a.sessoes ? (100 * a.conversoes) / a.sessoes : 0,
        piso: pisoWilson(a.conversoes, a.sessoes),
      }))

    const linhasBusca = montar(busca)
    const linhasAnuncios = montar(anuncios)

    const comVolume = (linhas: Linha[]) =>
      linhas
        .filter(l => l.sessoes >= VOLUME_MINIMO_TERMO)
        .sort((a, b) => b.piso - a.piso || b.conversoes - a.conversoes)

    const termosComVolume = comVolume(linhasBusca)
    const anunciosComVolume = comVolume(linhasAnuncios)

    // Padrões de INTENÇÃO só fazem sentido sobre busca — nome de anúncio não
    // tem intenção, tem nomenclatura interna.
    const porPadrao = new Map<PadraoTermo, { sessoes: number; conversoes: number }>()
    for (const l of linhasBusca) {
      const a = porPadrao.get(l.padrao) ?? { sessoes: 0, conversoes: 0 }
      a.sessoes += l.sessoes
      a.conversoes += l.conversoes
      porPadrao.set(l.padrao, a)
    }

    const totalSessoes = linhasBusca.reduce((s, l) => s + l.sessoes, 0)
    const totalConversoes = linhasBusca.reduce((s, l) => s + l.conversoes, 0)
    const sessoesAnuncios = linhasAnuncios.reduce((s, l) => s + l.sessoes, 0)
    const conversoesAnuncios = linhasAnuncios.reduce((s, l) => s + l.conversoes, 0)

    return NextResponse.json({
      periodo_dias: dias,
      volume_minimo: VOLUME_MINIMO_TERMO,
      media_geral: totalSessoes ? (100 * totalConversoes) / totalSessoes : 0,
      total_sessoes: totalSessoes,
      total_conversoes: totalConversoes,
      termos_abaixo_do_minimo: linhasBusca.length - termosComVolume.length,
      termos: termosComVolume,
      // Nome de anúncio da Meta/TikTok: mesma métrica, leitura diferente.
      anuncios: anunciosComVolume,
      anuncios_media: sessoesAnuncios ? (100 * conversoesAnuncios) / sessoesAnuncios : 0,
      anuncios_sessoes: sessoesAnuncios,
      anuncios_abaixo_do_minimo: linhasAnuncios.length - anunciosComVolume.length,
      // Diagnóstico: o que não deu para atribuir a nenhuma das duas leituras.
      sessoes_sem_plataforma: semPlataforma,
      sessoes_com_macro: macros,
      padroes: [...porPadrao.entries()]
        .map(([padrao, a]) => ({
          padrao,
          sessoes: a.sessoes,
          conversoes: a.conversoes,
          taxa: a.sessoes ? (100 * a.conversoes) / a.sessoes : 0,
          fatia_sessoes: totalSessoes ? (100 * a.sessoes) / totalSessoes : 0,
          fatia_conversoes: totalConversoes ? (100 * a.conversoes) / totalConversoes : 0,
        }))
        .sort((a, b) => b.taxa - a.taxa),
    })
  } catch (erro) {
    console.warn('[visitors/termos]', erro)
    return NextResponse.json({ error: 'Falha ao ler os termos' }, { status: 500 })
  }
}
