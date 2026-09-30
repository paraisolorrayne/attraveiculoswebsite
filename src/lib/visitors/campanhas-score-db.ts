/**
 * Campanhas com conversão e score, direto do banco. Uma consulta só para as
 * duas telas que mostram a tabela: a aba Origens do painel de visitantes e a
 * aba Estatísticas do Marketing (via /api/admin/visitors/campanhas).
 */
import { sql, type RawBuilder } from 'kysely'
import { db } from '@/lib/db'
import { campanhaSql } from '@/lib/visitors/sql-atribuicao'
import {
	CLIQUES_REGISTRADOS_DESDE,
	linhaCampanhaScore,
	pesoSql,
	primeiroCliquePorSessao,
	segundosAteClique,
	type GrupoCampanhaScore,
	type LinhaCampanhaScore,
} from '@/lib/visitors/score-clique'

/** `noPeriodo` é a condição de `periodoDaUrl`, sobre o alias `s`. */
export async function carregarCampanhasComScore(noPeriodo: RawBuilder<unknown>): Promise<LinhaCampanhaScore[]> {
	// Sessão que entra no score: desde que o horário do clique é gravado.
	const mensuravel = sql`s.started_at >= ${CLIQUES_REGISTRADOS_DESDE}`

	// Chave = lower(campanhaSql), a MESMA que a página /campanha/[chave] filtra.
	const { rows } = await sql<GrupoCampanhaScore>`
		with pc as (${primeiroCliquePorSessao})
		select
			lower(${campanhaSql}) as chave,
			mode() within group (order by ${campanhaSql}) as rotulo,
			count(*)::int as sessoes,
			(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
			(count(*) filter (where ${mensuravel}))::int as sessoes_mensuraveis,
			coalesce(sum(${pesoSql(segundosAteClique)}) filter (where ${mensuravel} and pc.clicado_em is not null), 0)::float as soma_pesos,
			(percentile_cont(0.5) within group (order by ${segundosAteClique}) filter (where pc.clicado_em is not null))::float as mediana_segundos,
			(count(*) filter (where pc.virou_card))::int as viraram_card
		from visitor_sessions s
		left join pc on pc.session_db_id = s.id
		where ${noPeriodo}
		group by 1
		order by 3 desc
	`.execute(db)

	return rows.map(linhaCampanhaScore)
}
