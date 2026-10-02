import { sql } from 'kysely'
import { db } from '@/lib/db'
import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { anonimizarToque, montarJornadas, type ToqueCru } from '@/lib/visitors/sessoes'
import { escopoDaAgencia, naAgencia, type Escopo } from '@/lib/visitors/escopo'

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

export async function consultarJornadas(endereco: string, escopo: Escopo) {
	const { dias, desde, noPeriodo } = periodoDaUrl(endereco, escopo)

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

	// A 1ª visita da pessoa vem de TODA a história dela — inclusive de outra
	// agência ou do orgânico da loja. Para a agência, a que não é dela fica só
	// com o canal. "Dela" = qualquer campanha da agência, sem os filtros da URL.
	if (escopo.tipo === 'agencia' && r.jornadas.length > 0) {
		const ids = r.jornadas.map(j => j.primeira.session_id).filter((id): id is string => !!id)
		const dela = new Set(
			(
				await sql<{ session_id: string }>`
					select s.session_id from visitor_sessions s
					where s.session_id = any(${ids}::text[]) and ${naAgencia(escopoDaAgencia(escopo))}
				`.execute(db)
			).rows.map(x => x.session_id),
		)
		r.jornadas = r.jornadas.map(j => ({
			...j,
			primeira: j.primeira.session_id && dela.has(j.primeira.session_id) ? { ...j.primeira, origem_de_fora: false } : anonimizarToque(j.primeira),
		}))
	}

	return {
		periodo: { dias, desde: desde ? desde.toISOString() : null },
		visitantes_convertidos: contagens.rows.length,
		visitantes_uma_sessao: r.visitantes_uma_sessao,
		matriz: r.matriz,
		jornadas_total: r.jornadas.length,
		jornadas: r.jornadas.slice(0, LIMITE_LISTA),
	}
}
