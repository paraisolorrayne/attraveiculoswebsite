import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { db } from '@/lib/db'
import {
  classificarPadrao, pisoWilson, VOLUME_MINIMO_TERMO, type PadraoTermo,
} from '@/lib/termos-conversao'

export const dynamic = 'force-dynamic'

/**
 * GET — termos de busca ordenados pelo que comprovam de conversão.
 *
 * Conversão aqui é o que o SITE observa: clique de WhatsApp ou envio de
 * formulário. Não é venda fechada — o CRM chega por webhook e tem ciclo próprio,
 * então esta tela não o consulta.
 */
export async function GET(request: NextRequest) {
  const admin = await adminComAcessoA('/admin/visitors')
  if (!admin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const dias = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('dias')) || 90))

  try {
    const { rows } = await sql<{
      termo: string; sessoes: string; conversoes: string
    }>`
      SELECT utm_term AS termo,
             count(*)::text AS sessoes,
             count(*) FILTER (WHERE contacted_whatsapp OR submitted_form)::text AS conversoes
        FROM visitor_sessions
       WHERE utm_term IS NOT NULL
         AND utm_term <> ''
         -- Descarta placeholder do Google Ads que chegou sem substituição
         -- ({_term} literal): não é termo, é falha de marcação.
         AND utm_term NOT LIKE '%{%'
         AND started_at >= now() - (${dias} || ' days')::interval
       GROUP BY 1
    `.execute(db)

    const linhas = rows.map(r => {
      const sessoes = Number(r.sessoes)
      const conversoes = Number(r.conversoes)
      return {
        termo: r.termo,
        padrao: classificarPadrao(r.termo),
        sessoes,
        conversoes,
        taxa: sessoes ? (100 * conversoes) / sessoes : 0,
        piso: pisoWilson(conversoes, sessoes),
      }
    })

    const comVolume = linhas
      .filter(l => l.sessoes >= VOLUME_MINIMO_TERMO)
      .sort((a, b) => b.piso - a.piso || b.conversoes - a.conversoes)

    // Agregado por padrão: usa TODAS as linhas, inclusive as de volume baixo —
    // o que é ruído isolado tem peso quando somado ao grupo.
    const porPadrao = new Map<PadraoTermo, { sessoes: number; conversoes: number }>()
    for (const l of linhas) {
      const a = porPadrao.get(l.padrao) ?? { sessoes: 0, conversoes: 0 }
      a.sessoes += l.sessoes
      a.conversoes += l.conversoes
      porPadrao.set(l.padrao, a)
    }

    const totalSessoes = linhas.reduce((s, l) => s + l.sessoes, 0)
    const totalConversoes = linhas.reduce((s, l) => s + l.conversoes, 0)

    return NextResponse.json({
      periodo_dias: dias,
      volume_minimo: VOLUME_MINIMO_TERMO,
      media_geral: totalSessoes ? (100 * totalConversoes) / totalSessoes : 0,
      total_sessoes: totalSessoes,
      total_conversoes: totalConversoes,
      termos_abaixo_do_minimo: linhas.length - comVolume.length,
      termos: comVolume,
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
