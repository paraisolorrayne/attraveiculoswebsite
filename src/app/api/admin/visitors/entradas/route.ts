import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { entradaPorSessao, periodoDaUrl, saneado } from '@/lib/visitors/sql-atribuicao'
import { agruparPorCanal, agruparPorPagina, type GrupoEntrada } from '@/lib/visitors/entradas'

/**
 * GET /api/admin/visitors/entradas?dias=
 *
 * Página de entrada (primeiro page view da sessão) × atribuição. Sessões sem
 * page view registrado ficam fora das tabelas e entram só em `sem_entrada`,
 * para a cobertura ser visível — quando esse número for grande, o resto é parcial.
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)

		const [grupos, cobertura] = await Promise.all([
			sql<GrupoEntrada>`
				with entrada as (${entradaPorSessao})
				select
					e.page_path,
					e.page_type,
					e.vehicle_slug,
					nullif(btrim(s.utm_source), '') as utm_source,
					nullif(btrim(s.utm_medium), '') as utm_medium,
					(${saneado(sql`s.gclid`)} is not null) as tem_gclid,
					(${saneado(sql`s.fbclid`)} is not null) as tem_fbclid,
					(${saneado(sql`s.ttclid`)} is not null) as tem_ttclid,
					${saneado(sql`s.referrer_domain`)} as referrer_domain,
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
					(count(*) filter (where s.submitted_form))::int as formularios
				from visitor_sessions s
				join entrada e on e.session_id = s.id
				where ${noPeriodo}
				group by 1, 2, 3, 4, 5, 6, 7, 8, 9
			`.execute(db),
			sql<{ total: number; com_entrada: number }>`
				with entrada as (${entradaPorSessao})
				select
					count(*)::int as total,
					(count(*) filter (where e.session_id is not null))::int as com_entrada
				from visitor_sessions s
				left join entrada e on e.session_id = s.id
				where ${noPeriodo}
			`.execute(db),
		])

		const cob = cobertura.rows[0] ?? { total: 0, com_entrada: 0 }

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			total_sessoes: cob.total,
			sem_entrada: cob.total - cob.com_entrada,
			por_pagina: agruparPorPagina(grupos.rows),
			por_canal: agruparPorCanal(grupos.rows),
		})
	} catch (error) {
		console.error('[Visitors Entradas API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
