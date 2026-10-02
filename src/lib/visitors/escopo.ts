/**
 * Escopo das consultas de Visitantes: "tudo" (time da Attra) ou "agência X".
 *
 * Nasceu com a área da agência (spec 2026-10-02): a Media House vê Visitantes
 * filtrado para as campanhas DELA. O escopo é parâmetro OBRIGATÓRIO das
 * funções de `consultas/` — esquecer vira erro de compilação, não vazamento de
 * dado da EB ou do tráfego orgânico da loja. `s` é sempre `visitor_sessions`.
 */
import { sql, type RawBuilder } from 'kysely'
import type { PlataformaCampanha } from '@/lib/db/types'
import { saneado } from './saneado'

export type Escopo =
	| { tipo: 'tudo' }
	| { tipo: 'agencia'; agenciaId: string; plataforma?: PlataformaCampanha | null; campanhaIds?: string[] | null }

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
 * Plataforma da sessão pelos sinais que ela já traz. Sem sinal → null, e aí a
 * sessão casa só por ID ou nome. Existe para que um `utm_id` igual em duas
 * plataformas (IDs de Google e Meta são números soltos) não some a visita de
 * uma na campanha da outra.
 */
export const plataformaDaSessaoSql = sql<PlataformaCampanha | null>`(case
	when lower(coalesce(s.utm_source, '')) like '%webmotors%' then 'webmotors'
	when ${saneado(sql`s.gclid`)} is not null or ${saneado(sql`s.wbraid`)} is not null or ${saneado(sql`s.gbraid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('google', 'google-ads', 'googleads', 'adwords', 'youtube') then 'google'
	when ${saneado(sql`s.fbclid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta'
	else null
end)`

/** A sessão `s` é da campanha cadastrada `ac`? (ID, ou nome sem caixa/espaço, na mesma plataforma.) */
export const casaCampanhaSql = sql<boolean>`(
	(${plataformaDaSessaoSql} is null or ac.plataforma = ${plataformaDaSessaoSql})
	and (
		(ac.id_externo is not null and btrim(s.utm_id) = btrim(ac.id_externo))
		or lower(btrim(${saneado(sql`s.utm_campaign`)})) = lower(btrim(ac.nome))
	)
)`

export function naAgencia(escopo: Escopo): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	const plataforma = escopo.plataforma ?? null
	const campanhas = escopo.campanhaIds && escopo.campanhaIds.length > 0 ? escopo.campanhaIds : null
	return sql<boolean>`exists (
		select 1 from agencia_campanhas ac
		where ac.agencia_id = ${escopo.agenciaId}::uuid
		  and (${plataforma}::text is null or ac.plataforma = ${plataforma}::text)
		  and (${campanhas}::uuid[] is null or ac.id = any(${campanhas}::uuid[]))
		  and ${casaCampanhaSql}
	)`
}

/** Para consultas que partem de page views (`v.session_id`) ou cliques. */
export function sessaoNaAgencia(escopo: Escopo, colunaSessao: RawBuilder<unknown>): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	return sql<boolean>`${colunaSessao} in (select s.id from visitor_sessions s where ${naAgencia(escopo)})`
}
