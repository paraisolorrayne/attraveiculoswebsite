import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import {
	classificarCanal,
	corCanal,
	normalizarFonte,
	rotuloCanal,
	rotuloFonte,
	type CanalTrafego,
} from '@/lib/traffic-channel'
import { rotuloDevice, rotuloMatchType, rotuloNetwork } from '@/lib/parametros-anuncio'
import { campanhaSql, entradaPorSessao, periodoDaUrl, saneado } from '@/lib/visitors/sql-atribuicao'

/**
 * GET /api/admin/visitors/campanha?chave=<campanha em minúsculas>&dias=
 *
 * Tudo de uma campanha numa resposta: canais/fontes com que ela chegou,
 * sessões por dia, criativos (utm_content), termos (utm_term), grupos
 * (adset_id), páginas de entrada, veículos abertos, cidades, contexto do
 * clique (Google Ads) e a lista de leads. `chave` é a mesma que a Visão
 * geral usa para agrupar: `chaveCampanha` = nome normalizado em minúsculas,
 * ou "campanha #<utm_id>" quando só há o ID.
 */

const LIMITE = 25
const LIMITE_LEADS = 100

interface Grupo {
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	tem_gclid: boolean
	tem_fbclid: boolean
	tem_ttclid: boolean
	referrer_domain: string | null
	sessoes: number
	whatsapp: number
}

export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const url = new URL(request.url)
		const chave = (url.searchParams.get('chave') ?? '').trim().toLowerCase()
		if (!chave || chave.length > 200) {
			return NextResponse.json({ error: 'chave da campanha é obrigatória' }, { status: 400 })
		}
		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)

		// Todas as consultas filtram pela MESMA definição de campanha da Visão geral.
		const daCampanha = sql`lower(${campanhaSql}) = ${chave}`
		const onde = sql`${noPeriodo} and ${daCampanha}`

		const veic = sql`
			select pv.session_id, count(distinct pv.page_path)::int as veiculos
			from visitor_page_views pv
			where pv.page_path like '/veiculo/%'
			group by pv.session_id
		`

		const dimensao = (coluna: ReturnType<typeof sql>, rotuloVazio: string) => sql<{ valor: string; sessoes: number; whatsapp: number; formularios: number }>`
			select
				coalesce(nullif(btrim(${coluna}), ''), ${rotuloVazio}) as valor,
				count(*)::int as sessoes,
				(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
				(count(*) filter (where s.submitted_form))::int as formularios
			from visitor_sessions s
			where ${onde}
			group by 1
			order by 2 desc
			limit ${LIMITE}
		`.execute(db)

		const [grupos, resumo, porDia, conteudos, termos, gruposAnuncio, entradas, veiculos, cidades, contexto, leads] =
			await Promise.all([
				sql<Grupo>`
					select
						nullif(btrim(s.utm_source), '') as utm_source,
						nullif(btrim(s.utm_medium), '') as utm_medium,
						nullif(btrim(s.utm_campaign), '') as utm_campaign,
						(${saneado(sql`s.gclid`)} is not null) as tem_gclid,
						(${saneado(sql`s.fbclid`)} is not null) as tem_fbclid,
						(${saneado(sql`s.ttclid`)} is not null) as tem_ttclid,
						${saneado(sql`s.referrer_domain`)} as referrer_domain,
						count(*)::int as sessoes,
						(count(*) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s
					where ${onde}
					group by 1, 2, 3, 4, 5, 6, 7
				`.execute(db),

				sql<{
					sessoes: number
					visitantes: number
					whatsapp: number
					formularios: number
					sessoes_com_veiculo: number
					primeira: string | null
					ultima: string | null
					sessoes_com_duracao: number
					duracao_total: number
				}>`
					with veic as (${veic})
					select
						count(*)::int as sessoes,
						count(distinct s.fingerprint_id)::int as visitantes,
						(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
						(count(*) filter (where s.submitted_form))::int as formularios,
						(count(*) filter (where coalesce(v.veiculos, 0) > 0 or coalesce(s.vehicles_viewed, 0) > 0))::int as sessoes_com_veiculo,
						min(s.started_at)::text as primeira,
						max(s.started_at)::text as ultima,
						count(s.duration_seconds)::int as sessoes_com_duracao,
						coalesce(sum(s.duration_seconds), 0)::int as duracao_total
					from visitor_sessions s
					left join veic v on v.session_id = s.id
					where ${onde}
				`.execute(db),

				sql<{ dia: string; sessoes: number; whatsapp: number }>`
					select
						to_char(s.started_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
						count(*)::int as sessoes,
						(count(*) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s
					where ${onde}
					group by 1
					order by 1
				`.execute(db),

				dimensao(sql`s.utm_content`, '(sem utm_content)'),
				dimensao(sql`s.utm_term`, '(sem utm_term)'),
				dimensao(sql`s.adset_id`, '(sem grupo)'),

				sql<{ page_path: string; vehicle_slug: string | null; sessoes: number; whatsapp: number }>`
					with entrada as (${entradaPorSessao})
					select e.page_path, e.vehicle_slug, count(*)::int as sessoes,
					       (count(*) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s
					join entrada e on e.session_id = s.id
					where ${onde}
					group by 1, 2
					order by 3 desc
					limit ${LIMITE}
				`.execute(db),

				sql<{ slug: string; marca: string | null; modelo: string | null; sessoes: number; whatsapp: number }>`
					select pv.vehicle_slug as slug, max(pv.vehicle_brand) as marca, max(pv.vehicle_model) as modelo,
					       count(distinct s.id)::int as sessoes,
					       (count(distinct s.id) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s
					join visitor_page_views pv on pv.session_id = s.id
					where ${onde} and pv.vehicle_slug is not null
					group by 1
					order by 4 desc
					limit ${LIMITE}
				`.execute(db),

				sql<{ cidade: string; regiao: string | null; sessoes: number; whatsapp: number }>`
					select coalesce(nullif(btrim(s.city), ''), '(sem cidade)') as cidade, max(s.region) as regiao,
					       count(*)::int as sessoes, (count(*) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s
					where ${onde}
					group by 1
					order by 3 desc
					limit ${LIMITE}
				`.execute(db),

				sql<{ dimensao: string; valor: string | null; sessoes: number; whatsapp: number }>`
					select 'device' as dimensao, s.ads_device as valor, count(*)::int as sessoes,
					       (count(*) filter (where s.contacted_whatsapp))::int as whatsapp
					from visitor_sessions s where ${onde} group by 2
					union all
					select 'match_type', s.match_type, count(*)::int, (count(*) filter (where s.contacted_whatsapp))::int
					from visitor_sessions s where ${onde} group by 2
					union all
					select 'network', s.ads_network, count(*)::int, (count(*) filter (where s.contacted_whatsapp))::int
					from visitor_sessions s where ${onde} group by 2
				`.execute(db),

				sql<{
					session_id: string
					started_at: string
					city: string | null
					region: string | null
					utm_source: string | null
					utm_medium: string | null
					utm_content: string | null
					utm_term: string | null
					entrada: string | null
					veiculos: string[] | null
					contacted_whatsapp: boolean
					submitted_form: boolean
				}>`
					with entrada as (${entradaPorSessao})
					select
						s.session_id, s.started_at::text as started_at, s.city, s.region,
						s.utm_source, s.utm_medium, s.utm_content, s.utm_term,
						e.page_path as entrada,
						(select array_agg(distinct pv.vehicle_slug) from visitor_page_views pv
						  where pv.session_id = s.id and pv.vehicle_slug is not null) as veiculos,
						s.contacted_whatsapp, s.submitted_form
					from visitor_sessions s
					left join entrada e on e.session_id = s.id
					where ${onde} and (s.contacted_whatsapp or s.submitted_form)
					order by s.started_at desc
					limit ${LIMITE_LEADS}
				`.execute(db),
			])

		// Canais, fontes e grafias da campanha — dobrados dos grupos crus, como na Visão geral.
		const canais = new Map<CanalTrafego, number>()
		const fontes = new Map<string, number>()
		const grafias = new Map<string, number>()
		for (const g of grupos.rows) {
			const atrib = {
				utm_source: g.utm_source,
				utm_medium: g.utm_medium,
				gclid: g.tem_gclid ? '1' : null,
				fbclid: g.tem_fbclid ? '1' : null,
				ttclid: g.tem_ttclid ? '1' : null,
				referrer_domain: g.referrer_domain,
			}
			const canal = classificarCanal(atrib)
			canais.set(canal, (canais.get(canal) ?? 0) + g.sessoes)
			const fonte = normalizarFonte(atrib)
			fontes.set(fonte, (fontes.get(fonte) ?? 0) + g.sessoes)
			if (g.utm_campaign) grafias.set(g.utm_campaign, (grafias.get(g.utm_campaign) ?? 0) + g.sessoes)
		}
		const ordenar = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])

		const r = resumo.rows[0]
		const traduz = { device: rotuloDevice, match_type: rotuloMatchType, network: rotuloNetwork } as const

		return NextResponse.json({
			chave,
			rotulo: ordenar(grafias)[0]?.[0] ?? chave,
			grafias: ordenar(grafias).map(([g]) => g),
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			resumo: r
				? {
						...r,
						duracao_media_segundos: r.sessoes_com_duracao > 0 ? Math.round(r.duracao_total / r.sessoes_com_duracao) : null,
					}
				: null,
			canais: ordenar(canais).map(([canal, sessoes]) => ({ canal, rotulo: rotuloCanal(canal), cor: corCanal(canal), sessoes })),
			fontes: ordenar(fontes).map(([fonte, sessoes]) => ({ fonte, rotulo: rotuloFonte(fonte), sessoes })),
			por_dia: porDia.rows,
			conteudos: conteudos.rows,
			termos: termos.rows,
			grupos_anuncio: gruposAnuncio.rows,
			entradas: entradas.rows,
			veiculos: veiculos.rows,
			cidades: cidades.rows,
			contexto: contexto.rows.map(c => ({
				...c,
				valor_cru: c.valor,
				valor: traduz[c.dimensao as keyof typeof traduz](c.valor),
			})),
			leads: leads.rows,
		})
	} catch (error) {
		console.error('[Visitors Campanha API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
