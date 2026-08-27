import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { campanhaSql, periodoDaUrl, saneado } from '@/lib/visitors/sql-atribuicao'
import {
	agruparFonteMeio,
	agruparReferenciadores,
	auditarMarcacao,
	tendenciaPorCanal,
	type GrupoDia,
	type GrupoOrigem,
} from '@/lib/visitors/origens'

/**
 * GET /api/admin/visitors/origens?dias=
 *
 * Aba Origens: fonte × meio, referenciadores, auditoria de marcação e
 * tendência diária por canal. Como em `metrics`, a agregação pesada é no banco
 * (GROUP BY nas colunas cruas de atribuição) e o Node só dobra os grupos com a
 * lib de canal. Aqui os valores de utm_source/utm_medium vêm CRUS (só
 * aparados) de propósito: a auditoria precisa ver "Google" e "google" como
 * grafias diferentes — quem unifica é `normalizarFonte`, na dobra.
 */

/** A tendência diária é limitada a 90 dias mesmo em "Tudo": além disso o gráfico vira ruído. */
const DIAS_TENDENCIA_MAX = 90

export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)

		const diasTendencia = dias === 0 || dias > DIAS_TENDENCIA_MAX ? DIAS_TENDENCIA_MAX : dias
		const desdeTendencia = new Date(Date.now() - diasTendencia * 24 * 60 * 60 * 1000)

		// Sessão "viu veículo" pelo PATH (/veiculo/<slug>): a coluna vehicles_viewed ficou zerada
		// no histórico. Mesma definição da rota metrics.
		const veic = sql`
			select pv.session_id, count(distinct pv.page_path)::int as veiculos
			from visitor_page_views pv
			where pv.page_path like '/veiculo/%'
			group by pv.session_id
		`

		const colunasCruas = sql`
			nullif(btrim(s.utm_source), '') as utm_source,
			nullif(btrim(s.utm_medium), '') as utm_medium,
			${campanhaSql} as utm_campaign,
			(${saneado(sql`s.gclid`)} is not null) as tem_gclid,
			(${saneado(sql`s.fbclid`)} is not null) as tem_fbclid,
			(${saneado(sql`s.ttclid`)} is not null) as tem_ttclid,
			${saneado(sql`s.referrer_domain`)} as referrer_domain
		`

		const [grupos, porDia] = await Promise.all([
			sql<GrupoOrigem>`
				with veic as (${veic})
				select
					${colunasCruas},
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
					(count(*) filter (where s.submitted_form))::int as formularios,
					(count(*) filter (
						where coalesce(v.veiculos, 0) > 0 or coalesce(s.vehicles_viewed, 0) > 0
					))::int as sessoes_com_veiculo
				from visitor_sessions s
				left join veic v on v.session_id = s.id
				where ${noPeriodo}
				group by 1, 2, 3, 4, 5, 6, 7
			`.execute(db),

			sql<GrupoDia>`
				select
					to_char(s.started_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
					${colunasCruas},
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
					0::int as formularios,
					0::int as sessoes_com_veiculo
				from visitor_sessions s
				where s.started_at >= ${desdeTendencia}
				group by 1, 2, 3, 4, 5, 6, 7, 8
			`.execute(db),
		])

		const totalSessoes = grupos.rows.reduce((s, g) => s + g.sessoes, 0)

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			total_sessoes: totalSessoes,
			fonte_meio: agruparFonteMeio(grupos.rows),
			referenciadores: agruparReferenciadores(grupos.rows),
			auditoria: auditarMarcacao(grupos.rows),
			tendencia: { dias: diasTendencia, pontos: tendenciaPorCanal(porDia.rows) },
		})
	} catch (error) {
		console.error('[Visitors Origens API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
