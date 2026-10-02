/**
 * Pedaços de SQL compartilhados pelas rotas de /api/admin/visitors/*.
 *
 * Nasceu em 27/08/2026, quando o painel ganhou as abas Origens, Entradas,
 * Campanha e Sessões: cinco rotas lendo `visitor_sessions` precisam concordar
 * sobre o que é "valor vazio" em UTM, sobre o nome da campanha (com queda
 * para o ID) e sobre o período — senão a mesma sessão aparece de um jeito na
 * Visão geral e de outro em Origens. A regra já existia na rota `metrics`;
 * aqui ela vira uma definição só.
 */
import { sql, type RawBuilder } from 'kysely'
import { campanhaSql, saneado } from './saneado'
import { naAgencia, type Escopo } from './escopo'

// `saneado` e `campanhaSql` moram em ./saneado: `escopo.ts` usa os dois no topo
// do módulo e este arquivo importa `escopo.ts` — aqui, a ordem de carga dos
// dois decidiria se eles já existem ("saneado is not defined").
export { saneado, campanhaSql }

/** Período padrão do painel. `dias = 0` significa "toda a história". */
export const DIAS_PADRAO = 30
export const DIAS_MAX = 730

export interface Periodo {
	dias: number
	desde: Date | null
	/** Condição pronta para o WHERE, sobre o alias `s`; com `dias = 0` vira `true`. */
	noPeriodo: RawBuilder<unknown>
}

/** Lê `?dias=` da URL com os mesmos limites em todas as rotas. */
export function periodoDaUrl(url: string, escopo: Escopo): Periodo {
	// Sem padrão de propósito: uma consulta nova que esquecesse o escopo
	// mostraria tudo para a agência. Quem quer tudo pede ESCOPO_TUDO.
	if (!escopo) throw new Error('periodoDaUrl: informe o escopo (ESCOPO_TUDO para o time da Attra)')
	const diasBruto = Number(new URL(url).searchParams.get('dias'))
	const dias =
		Number.isFinite(diasBruto) && diasBruto >= 0 && diasBruto <= DIAS_MAX
			? Math.floor(diasBruto)
			: DIAS_PADRAO
	const desde = dias > 0 ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000) : null
	const periodo = desde ? sql`s.started_at >= ${desde}` : sql`true`
	// O escopo vai junto do período: toda consulta que já filtrava o período
	// fica restrita à agência sem reescrever o SQL dela (spec 2026-10-02).
	const noPeriodo = sql`(${periodo} and ${naAgencia(escopo)})`
	return { dias, desde, noPeriodo }
}

/**
 * Primeira página de cada sessão (a "página de entrada"), como subconsulta.
 * `visitor_page_views.session_id` guarda o UUID da sessão (s.id).
 */
export const entradaPorSessao = sql`
	select distinct on (pv.session_id)
		pv.session_id, pv.page_path, pv.page_type, pv.vehicle_slug
	from visitor_page_views pv
	order by pv.session_id, pv.viewed_at asc
`
