import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { montarJornadas, type ToqueCru } from '@/lib/visitors/sessoes'

/**
 * GET /api/admin/visitors/jornadas?dias=
 *
 * Primeira × última origem: para cada visitante que converteu no período
 * (clique no WhatsApp ou formulário) e tem mais de uma sessão, o que o trouxe
 * pela PRIMEIRA vez (em toda a história, não só no período) e a sessão em que
 * converteu. É a pergunta "o anúncio gerou a conversa ou só a última visita?".
 */

const LIMITE_LISTA = 200

const COLUNAS = sql`
	s.fingerprint_id, s.session_id, s.started_at::text as started_at,
	s.utm_source, s.utm_medium, s.utm_campaign, s.utm_id,
	s.gclid, s.fbclid, s.ttclid, s.referrer_domain,
	s.contacted_whatsapp, s.submitted_form
`

export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)

		const convertidos = sql`
			select distinct s.fingerprint_id
			from visitor_sessions s
			where ${noPeriodo} and (s.contacted_whatsapp or s.submitted_form)
		`

		const [convertidas, primeiras, contagens] = await Promise.all([
			sql<ToqueCru>`
				select ${COLUNAS}
				from visitor_sessions s
				where ${noPeriodo} and (s.contacted_whatsapp or s.submitted_form)
				order by s.started_at asc
			`.execute(db),
			sql<ToqueCru>`
				select distinct on (s.fingerprint_id) ${COLUNAS}
				from visitor_sessions s
				where s.fingerprint_id in (${convertidos})
				order by s.fingerprint_id, s.started_at asc
			`.execute(db),
			sql<{ fingerprint_id: string; n: number }>`
				select s.fingerprint_id, count(*)::int as n
				from visitor_sessions s
				where s.fingerprint_id in (${convertidos})
				group by 1
			`.execute(db),
		])

		const porVisitante: Record<string, number> = {}
		for (const c of contagens.rows) porVisitante[c.fingerprint_id] = c.n

		const r = montarJornadas(convertidas.rows, primeiras.rows, porVisitante)

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			visitantes_convertidos: contagens.rows.length,
			visitantes_uma_sessao: r.visitantes_uma_sessao,
			matriz: r.matriz,
			jornadas_total: r.jornadas.length,
			jornadas: r.jornadas.slice(0, LIMITE_LISTA),
		})
	} catch (error) {
		console.error('[Visitors Jornadas API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
