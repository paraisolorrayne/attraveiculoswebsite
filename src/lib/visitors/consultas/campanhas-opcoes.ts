import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { PlataformaCampanha } from '@/lib/db/types'
import { campanhaSql, periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { plataformaDaSessaoSql, type Escopo } from '@/lib/visitors/escopo'

/**
 * Opções do filtro de campanha da área da agência: as campanhas que aparecem
 * nas visitas dela no período (o mesmo rótulo da tela — nome, ou
 * "campanha #<id>" quando o nome vem vazio), das que mais trouxeram para as
 * que menos. Respeita a plataforma escolhida, mas não o próprio filtro de
 * campanha: a campanha escolhida continua na lista para poder trocar.
 */
export async function consultarCampanhasOpcoes(endereco: string, escopo: Escopo) {
	const semCampanha: Escopo = escopo.tipo === 'agencia' ? { ...escopo, campanhas: null } : escopo
	const { noPeriodo } = periodoDaUrl(endereco, semCampanha)
	const { rows } = await sql<{ nome: string; plataforma: PlataformaCampanha | null; sessoes: number }>`
		select ${campanhaSql} as nome,
		       mode() within group (order by ${plataformaDaSessaoSql}) as plataforma,
		       count(*)::int as sessoes
		from visitor_sessions s
		where ${noPeriodo} and ${campanhaSql} <> ''
		group by 1
		order by 3 desc, 1
		limit 50
	`.execute(db)
	return { campanhas: rows }
}
