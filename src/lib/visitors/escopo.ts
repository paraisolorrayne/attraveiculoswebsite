/**
 * Escopo das consultas de Visitantes: "tudo" (time da Attra) ou "agência X".
 *
 * Nasceu com a área da agência (spec 2026-10-02): a Media House vê Visitantes
 * filtrado para as visitas com o MARCADOR dela (prefixo, utm_medium ou ID). O escopo é parâmetro OBRIGATÓRIO das
 * funções de `consultas/` — esquecer vira erro de compilação, não vazamento de
 * dado da EB ou do tráfego orgânico da loja. `s` é sempre `visitor_sessions`.
 */
import { sql, type RawBuilder } from 'kysely'
import type { PlataformaCampanha } from '@/lib/db/types'
import { campanhaSql, saneado } from './saneado'

export type Escopo =
	| { tipo: 'tudo' }
	| { tipo: 'agencia'; agenciaId: string; plataforma?: PlataformaCampanha | null; campanhas?: string[] | null }

export const ESCOPO_TUDO: Escopo = { tipo: 'tudo' }

/**
 * A agência inteira, sem os filtros de plataforma/campanha da URL. É o escopo
 * que decide se uma visita é DELA (para mostrar ou esconder): o filtro só
 * estreita a listagem, nunca transforma visita própria em "de fora".
 */
export function escopoDaAgencia(escopo: Escopo): Escopo {
	return escopo.tipo === 'agencia' ? { tipo: 'agencia', agenciaId: escopo.agenciaId } : escopo
}

/**
 * Plataforma da sessão pelos sinais que ela já traz. Sem sinal → null. É o que
 * o filtro de plataforma da área da agência usa.
 */
export const plataformaDaSessaoSql = sql<PlataformaCampanha | null>`(case
	when lower(coalesce(s.utm_source, '')) like '%webmotors%' then 'webmotors'
	when ${saneado(sql`s.gclid`)} is not null or ${saneado(sql`s.wbraid`)} is not null or ${saneado(sql`s.gbraid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('google', 'google-ads', 'googleads', 'adwords', 'youtube') then 'google'
	when ${saneado(sql`s.fbclid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta'
	else null
end)`

/** Algum item da lista (`ag.<coluna>`, sem vazios) satisfaz `teste(m)`, com `m` já aparado e em minúsculas. */
function algumMarcador(coluna: 'prefixos' | 'utm_medium_marca' | 'ids_campanha', teste: (m: RawBuilder<string>) => RawBuilder<boolean>) {
	const m = sql<string>`lower(btrim(m.v))`
	return sql<boolean>`exists (select 1 from unnest(ag.${sql.ref(coluna)}) as m(v) where btrim(m.v) <> '' and (${teste(m)}))`
}

const campo = (coluna: string) => sql<string>`lower(coalesce(${saneado(sql`s.${sql.ref(coluna)}`)}, ''))`

/**
 * A sessão `s` tem o marcador da agência `ag` (spec 2026-10-02-area-agencia-
 * escopo-por-marcador): `utm_campaign` ou `utm_content` COMEÇA com um prefixo
 * ("contém" pegaria `nova-colecao` por causa do `va-`), ou `utm_medium` / `utm_id`
 * igual a um da lista. Sem diferenciar caixa nem espaço. Item vazio na lista é
 * ignorado — senão `starts_with(x, '')` abriria tudo.
 */
export const marcadorDaAgenciaSql = sql<boolean>`(
	${algumMarcador('prefixos', p => sql<boolean>`starts_with(${campo('utm_campaign')}, ${p}) or starts_with(${campo('utm_content')}, ${p})`)}
	or ${algumMarcador('utm_medium_marca', m => sql<boolean>`${campo('utm_medium')} = ${m}`)}
	or ${algumMarcador('ids_campanha', i => sql<boolean>`${campo('utm_id')} = ${i}`)}
)`

export function naAgencia(escopo: Escopo): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	const plataforma = escopo.plataforma ?? null
	const campanhas = escopo.campanhas && escopo.campanhas.length > 0 ? escopo.campanhas.map(c => c.trim().toLowerCase()) : null
	return sql<boolean>`(
		exists (select 1 from agencias ag where ag.id = ${escopo.agenciaId}::uuid and ${marcadorDaAgenciaSql})
		and (${plataforma}::text is null or ${plataformaDaSessaoSql} = ${plataforma}::text)
		and (${campanhas}::text[] is null or lower(btrim(${campanhaSql})) = any(${campanhas}::text[]))
	)`
}

/**
 * Para consultas que partem de page views (`v.session_id`) ou cliques. Com
 * `desde`, só procura entre as sessões que começaram a partir da véspera: a
 * page view do período pode ser de uma sessão aberta pouco antes do corte, e
 * sem o limite a subconsulta varreria a tabela de sessões inteira.
 */
export function sessaoNaAgencia(escopo: Escopo, colunaSessao: RawBuilder<unknown>, desde: Date | null): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	const recente = desde ? sql`s.started_at >= ${desde}::timestamptz - interval '1 day'` : sql`true`
	return sql<boolean>`${colunaSessao} in (select s.id from visitor_sessions s where ${recente} and ${naAgencia(escopo)})`
}
