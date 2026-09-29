/**
 * Score de qualidade do clique no WhatsApp: pesa cada sessão pelo tempo entre
 * a chegada ao site e o PRIMEIRO clique.
 *
 * Nasceu em 29/09/2026. A taxa de conversão bruta punha a PMax no topo (11,6%
 * em 30 dias), mas metade daqueles cliques vinha nos primeiros 12 segundos,
 * sem a pessoa sair da página de entrada — e só 3 de 183 viraram card. Quem
 * navega antes de chamar é quem chega pesquisado. O score é a "conversão
 * ponderada": soma dos pesos dividida pelas sessões, lida ao lado da bruta.
 *
 * As faixas vivem SÓ aqui: o SQL (`pesoSql`, `faixaSql`) é gerado desta lista,
 * então rota e lib não podem discordar sobre quanto vale um clique.
 */
import { sql, type RawBuilder } from 'kysely'
import { SEM_CAMPANHA } from '@/lib/traffic-channel'

export interface FaixaTempoClique {
	/** Limite superior EXCLUSIVO, em segundos. A última faixa não tem limite. */
	ate: number
	peso: number
	rotulo: string
}

export const FAIXAS_TEMPO_CLIQUE: readonly FaixaTempoClique[] = [
	{ ate: 10, peso: 0.25, rotulo: 'menos de 10 s' },
	{ ate: 30, peso: 0.5, rotulo: '10–30 s' },
	{ ate: 60, peso: 0.75, rotulo: '30–60 s' },
	{ ate: 180, peso: 1, rotulo: '1–3 min' },
	{ ate: Infinity, peso: 1.25, rotulo: 'mais de 3 min' },
]

/**
 * Desde quando `whatsapp_clicks` grava o horário de cada clique. Antes disso a
 * sessão só tem o sinal "clicou" (contacted_whatsapp), sem tempo — então o
 * score conta apenas sessões a partir daqui, no numerador E no denominador.
 */
export const CLIQUES_REGISTRADOS_DESDE = new Date('2026-08-06T00:00:00-03:00')

export function faixaDoClique(segundos: number): number {
	const s = Math.max(0, segundos)
	const i = FAIXAS_TEMPO_CLIQUE.findIndex(f => s < f.ate)
	return i === -1 ? FAIXAS_TEMPO_CLIQUE.length - 1 : i
}

export function pesoDoClique(segundos: number): number {
	return FAIXAS_TEMPO_CLIQUE[faixaDoClique(segundos)].peso
}

/** `case` com o peso da faixa, sobre uma expressão em segundos. */
export function pesoSql(segundos: RawBuilder<unknown>) {
	const ramos = FAIXAS_TEMPO_CLIQUE.filter(f => Number.isFinite(f.ate)).map(
		f => sql`when ${segundos} < ${f.ate} then ${f.peso}::float`,
	)
	const ultimo = FAIXAS_TEMPO_CLIQUE[FAIXAS_TEMPO_CLIQUE.length - 1].peso
	return sql<number>`(case ${sql.join(ramos, sql` `)} else ${ultimo}::float end)`
}

/** `case` com o índice da faixa (0 = mais rápida), sobre uma expressão em segundos. */
export function faixaSql(segundos: RawBuilder<unknown>) {
	const ramos = FAIXAS_TEMPO_CLIQUE.filter(f => Number.isFinite(f.ate)).map(
		(f, i) => sql`when ${segundos} < ${f.ate} then ${i}::int`,
	)
	return sql<number>`(case ${sql.join(ramos, sql` `)} else ${FAIXAS_TEMPO_CLIQUE.length - 1}::int end)`
}

/**
 * Primeiro clique de cada sessão, como subconsulta (alias sugerido: `pc`).
 * O PRIMEIRO, e não cada linha: além de ser o que mede "quanto tempo até
 * decidir chamar", deixa o score imune a cliques gravados em dobro (bug do
 * botão flutuante corrigido em 29/09).
 */
export const primeiroCliquePorSessao = sql`
	select w.session_db_id, min(w.clicked_at) as clicado_em, bool_or(w.card_id is not null) as virou_card
	from whatsapp_clicks w
	group by w.session_db_id
`

/** Segundos da chegada ao primeiro clique, nunca negativos. `s` = sessão, `pc` = primeiro clique. */
export const segundosAteClique = sql`greatest(0, extract(epoch from (pc.clicado_em - s.started_at)))`

/** Uma campanha como sai do banco (já agregada por chave). */
export interface GrupoCampanhaScore {
	chave: string
	rotulo: string
	sessoes: number
	whatsapp: number
	/** Sessões desde CLIQUES_REGISTRADOS_DESDE — o denominador do score. */
	sessoes_mensuraveis: number
	soma_pesos: number
	mediana_segundos: number | null
	viraram_card: number
}

export interface LinhaCampanhaScore extends GrupoCampanhaScore {
	conversao: number
	/** Conversão ponderada pelo tempo até o clique; null quando não há sessão mensurável. */
	score: number | null
}

export function linhaCampanhaScore(g: GrupoCampanhaScore): LinhaCampanhaScore {
	const chave = g.chave || SEM_CAMPANHA
	return {
		...g,
		chave,
		rotulo: g.rotulo || SEM_CAMPANHA,
		conversao: g.sessoes > 0 ? g.whatsapp / g.sessoes : 0,
		score: g.sessoes_mensuraveis > 0 ? g.soma_pesos / g.sessoes_mensuraveis : null,
		mediana_segundos: g.mediana_segundos == null ? null : Math.round(g.mediana_segundos),
	}
}
