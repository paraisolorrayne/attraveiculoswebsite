import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { PlataformaCampanha } from '@/lib/db/types'
import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { plataformaDaSessaoSql, type Escopo } from '@/lib/visitors/escopo'
import { primeiroCliquePorSessao } from '@/lib/visitors/score-clique'

export interface NumerosResumo {
	sessoes: number
	/** Sessões que clicaram no WhatsApp, SEM as de clique acidental. */
	whatsapp: number
	/** Sessões em que todos os cliques foram nos primeiros 3 s. */
	acidentais: number
}

/**
 * Números do Resumo da área da agência: o total e o funil por plataforma
 * (sessões → cliques no WhatsApp), com os toques acidentais à parte — mesma
 * definição da tabela de campanhas (score-clique.ts).
 */
export async function consultarResumoAgencia(endereco: string, escopo: Escopo) {
	const { dias, desde, noPeriodo } = periodoDaUrl(endereco, escopo)

	const { rows } = await sql<{ plataforma: PlataformaCampanha | 'outra' } & NumerosResumo>`
		with pc as (${primeiroCliquePorSessao})
		select
			coalesce(${plataformaDaSessaoSql}, 'outra') as plataforma,
			count(*)::int as sessoes,
			(count(*) filter (where s.contacted_whatsapp and not coalesce(pc.so_acidental, false)))::int as whatsapp,
			(count(*) filter (where pc.so_acidental))::int as acidentais
		from visitor_sessions s
		left join pc on pc.session_db_id = s.id
		where ${noPeriodo}
		group by 1
		order by 2 desc
	`.execute(db)

	const total = rows.reduce<NumerosResumo>(
		(t, l) => ({ sessoes: t.sessoes + l.sessoes, whatsapp: t.whatsapp + l.whatsapp, acidentais: t.acidentais + l.acidentais }),
		{ sessoes: 0, whatsapp: 0, acidentais: 0 },
	)

	return {
		periodo: { dias, desde: desde ? desde.toISOString() : null },
		total,
		porPlataforma: rows,
	}
}
