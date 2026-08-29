import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { entradaPorSessao, periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import {
	COLUNAS_ORDENAVEIS,
	descreverSessao,
	filtrarSessoes,
	ordenarSessoes,
	paginar,
	valorDaSessao,
	type Conversao,
	type FiltrosSessoes,
	type SessaoCrua,
} from '@/lib/visitors/sessoes'
import { opcoesDaColuna, type Ordenacao } from '@/lib/visitors/tabela'
import type { TipoProblema } from '@/lib/visitors/origens'

/**
 * GET /api/admin/visitors/sessoes?dias=&canal=&fonte=&meio=&campanha=&referrer=&entrada=&conversao=&problema=&sessao=&pagina=
 *
 * Explorador de sessões. O canal nasce em TypeScript, então o filtro é em
 * Node: a rota traz as sessões do período (mais recentes primeiro, com teto)
 * e a lib descreve, filtra e pagina. Com o teto atingido a resposta avisa
 * (`truncado`), em vez de fingir que cobriu tudo.
 */

const TETO = 20_000
const POR_PAGINA = 50
const CONVERSOES: Conversao[] = ['qualquer', 'whatsapp', 'formulario', 'nenhuma']
const PROBLEMAS: TipoProblema[] = [
	'click_id_sem_utm', 'fonte_sem_meio', 'meio_sem_fonte', 'meio_desconhecido',
	'campanha_varias_grafias', 'fonte_varias_grafias', 'paga_sem_campanha', 'click_id_contradiz_fonte',
]

function texto(v: string | null, max = 200): string | undefined {
	const t = (v ?? '').trim()
	return t ? t.slice(0, max) : undefined
}

function numero(v: string | null): number | undefined {
	const n = Number(v)
	return v !== null && v.trim() !== '' && Number.isFinite(n) ? n : undefined
}

export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const url = new URL(request.url)
		const q = url.searchParams
		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)

		const conversao = q.get('conversao') as Conversao | null
		const problema = q.get('problema') as TipoProblema | null
		const filtros: FiltrosSessoes = {
			canal: texto(q.get('canal'), 40),
			fonte: texto(q.get('fonte')),
			meio: texto(q.get('meio')),
			campanha: texto(q.get('campanha')),
			referrer: texto(q.get('referrer')),
			entrada: texto(q.get('entrada'), 500),
			conversao: conversao && CONVERSOES.includes(conversao) ? conversao : undefined,
			problema: problema && PROBLEMAS.includes(problema) ? problema : undefined,
			sessao: texto(q.get('sessao'), 80),
			cidade: texto(q.get('cidade'), 80),
			aparelho: texto(q.get('aparelho'), 20),
			veiculos_min: numero(q.get('veiculos_min')),
			veiculos_max: numero(q.get('veiculos_max')),
			duracao_min: numero(q.get('duracao_min')),
			duracao_max: numero(q.get('duracao_max')),
		}
		const pagina = Math.max(1, Number(q.get('pagina')) || 1)

		// Ordenação também no servidor: a lista é paginada aqui, e ordenar só a
		// página aberta mostraria "a sessão mais longa" que é a mais longa das 50
		// à vista. Sem parâmetro, segue a ordem natural (mais recente primeiro).
		const chaveOrdem = texto(q.get('ordenar'), 30)
		const ordenacao: Ordenacao | null =
			chaveOrdem && (COLUNAS_ORDENAVEIS as readonly string[]).includes(chaveOrdem)
				? { chave: chaveOrdem, direcao: q.get('direcao') === 'asc' ? 'asc' : 'desc' }
				: null

		const linhas = await sql<SessaoCrua>`
			with entrada as (${entradaPorSessao}),
			veic as (
				select pv.session_id, count(distinct pv.page_path)::int as veiculos
				from visitor_page_views pv
				where pv.page_path like '/veiculo/%'
				group by pv.session_id
			)
			select
				s.session_id,
				s.started_at::text as started_at,
				s.duration_seconds,
				s.city, s.region,
				fp.device_type,
				s.referrer_domain,
				s.utm_source, s.utm_medium, s.utm_campaign, s.utm_content, s.utm_term, s.utm_id,
				s.gclid, s.fbclid, s.ttclid,
				e.page_path as entrada,
				e.vehicle_slug as entrada_veiculo,
				greatest(coalesce(v.veiculos, 0), least(coalesce(s.vehicles_viewed, 0), 1))::int as veiculos,
				s.contacted_whatsapp, s.submitted_form
			from visitor_sessions s
			left join visitor_fingerprints fp on fp.id = s.fingerprint_id
			left join entrada e on e.session_id = s.id
			left join veic v on v.session_id = s.id
			where ${noPeriodo}
			order by s.started_at desc
			limit ${TETO + 1}
		`.execute(db)

		const truncado = linhas.rows.length > TETO
		const descritas = linhas.rows.slice(0, TETO).map(descreverSessao)
		const filtradas = filtrarSessoes(descritas, filtros)
		const pag = paginar(ordenarSessoes(filtradas, ordenacao), pagina, POR_PAGINA)

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			filtros,
			ordenacao,
			// Opções dos selects de filtro: saem do período INTEIRO, não da página
			// aberta — senão o filtro de canal só ofereceria os canais das 50 linhas
			// à vista, e escolher um canal que existe no período seria impossível.
			opcoes: {
				canal: opcoesDaColuna(descritas, valorDaSessao, 'canal'),
				aparelho: opcoesDaColuna(descritas, valorDaSessao, 'aparelho'),
			},
			truncado,
			teto: TETO,
			total_periodo: descritas.length,
			total_filtrado: filtradas.length,
			whatsapp_filtrado: filtradas.reduce((n, s) => n + (s.contacted_whatsapp ? 1 : 0), 0),
			formularios_filtrado: filtradas.reduce((n, s) => n + (s.submitted_form ? 1 : 0), 0),
			pagina: pag.pagina,
			paginas: pag.paginas,
			por_pagina: POR_PAGINA,
			sessoes: pag.itens,
		})
	} catch (error) {
		console.error('[Visitors Sessoes API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
