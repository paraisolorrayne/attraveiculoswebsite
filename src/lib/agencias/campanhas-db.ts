/**
 * Cadastro de campanhas da agência no banco. As regras puras estão em
 * campanhas.ts; aqui ficam a trava entre agências (índice único) traduzida em
 * mensagem, as visitas do período e as campanhas "detectadas sem cadastro".
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { periodoDaUrl, saneado } from '@/lib/visitors/sql-atribuicao'
import { ESCOPO_TUDO, casaCampanhaSql, plataformaDaSessaoSql } from '@/lib/visitors/escopo'
import { situacaoDaCampanha, validarCampanha, type CampanhaEntrada } from './campanhas'

const HOJE_SP = sql<string>`to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD')`

export type ResultadoCadastro =
	| { ok: true; id: string }
	| { ok: false; status: 400 | 404 | 409; erro: string }

/** Hoje no fuso da loja, `YYYY-MM-DD`. */
async function hojeSP(): Promise<string> {
	const r = await sql<{ hoje: string }>`select ${HOJE_SP} as hoje`.execute(db)
	return r.rows[0].hoje
}

/**
 * A trava é do banco (índice único). Aqui só se decide a MENSAGEM: se quem já
 * tem a campanha é a própria agência, ela sabe; se é outra, a mensagem não diz
 * qual — o nome da concorrente não sai daqui.
 */
async function mensagemDeConflito(agenciaId: string, c: CampanhaEntrada): Promise<string> {
	const dona = await sql<{ agencia_id: string }>`
		select agencia_id from agencia_campanhas
		where plataforma = ${c.plataforma}
		  and ((${c.id_externo}::text is not null and btrim(id_externo) = ${c.id_externo})
		       or lower(btrim(nome)) = lower(${c.nome}))
		limit 1
	`.execute(db)
	return dona.rows[0]?.agencia_id === agenciaId
		? 'Você já cadastrou esta campanha.'
		: 'Esta campanha já está cadastrada em outra agência. Fale com a Attra.'
}

function ehViolacaoDeUnicidade(e: unknown): boolean {
	return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505'
}

export async function listarCampanhas(agenciaId: string, endereco: string) {
	// Só o período (escopo "tudo"): a contagem já é por campanha, com a mesma
	// regra de casamento que decide o que a agência vê (casaCampanhaSql).
	const { noPeriodo } = periodoDaUrl(endereco, ESCOPO_TUDO)
	const [linhas, hoje] = await Promise.all([
		sql<{
			id: string
			plataforma: string
			nome: string
			id_externo: string | null
			destino: 'site' | 'whatsapp'
			mensagem_prefixo: string | null
			inicio: string
			fim: string | null
			visitas_periodo: number
		}>`
			select ac.id, ac.plataforma, ac.nome, ac.id_externo, ac.destino, ac.mensagem_prefixo,
			       to_char(ac.inicio, 'YYYY-MM-DD') as inicio, to_char(ac.fim, 'YYYY-MM-DD') as fim,
			       (select count(*) from visitor_sessions s where ${noPeriodo} and ${casaCampanhaSql})::int as visitas_periodo
			from agencia_campanhas ac
			where ac.agencia_id = ${agenciaId}::uuid
			order by ac.fim nulls first, ac.inicio desc, ac.nome
		`.execute(db),
		hojeSP(),
	])
	return {
		hoje,
		campanhas: linhas.rows.map(c => ({ ...c, situacao: situacaoDaCampanha(c, hoje) })),
	}
}

export async function criarCampanha(agenciaId: string, adminId: string, entrada: unknown): Promise<ResultadoCadastro> {
	const v = validarCampanha(entrada)
	if (!v.ok) return { ok: false, status: 400, erro: v.erro }
	try {
		const r = await db
			.insertInto('agencia_campanhas')
			.values({ ...v.valor, agencia_id: agenciaId, criado_por: adminId, atualizado_por: adminId })
			.returning('id')
			.executeTakeFirstOrThrow()
		return { ok: true, id: r.id }
	} catch (e) {
		if (ehViolacaoDeUnicidade(e)) return { ok: false, status: 409, erro: await mensagemDeConflito(agenciaId, v.valor) }
		throw e
	}
}

/**
 * Edita (campos que vierem, validados junto com os atuais) ou encerra
 * (`{ encerrar: true }` → fim = hoje). Só campanha da própria agência: a de
 * outra responde como se não existisse.
 */
export async function atualizarCampanha(
	agenciaId: string,
	adminId: string,
	id: string,
	entrada: unknown,
): Promise<ResultadoCadastro> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, status: 404, erro: 'Campanha não encontrada' }
	const atual = await sql<CampanhaEntrada>`
		select plataforma, nome, id_externo, destino, mensagem_prefixo,
		       to_char(inicio, 'YYYY-MM-DD') as inicio, to_char(fim, 'YYYY-MM-DD') as fim
		from agencia_campanhas where id = ${id}::uuid and agencia_id = ${agenciaId}::uuid
	`.execute(db)
	if (atual.rows.length === 0) return { ok: false, status: 404, erro: 'Campanha não encontrada' }

	const e = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>
	const base = atual.rows[0]
	const hoje = await hojeSP()
	const proposta = e.encerrar === true ? { ...base, fim: base.fim && base.fim < hoje ? base.fim : hoje } : { ...base, ...e }
	const v = validarCampanha(proposta)
	if (!v.ok) return { ok: false, status: 400, erro: v.erro }

	try {
		await db
			.updateTable('agencia_campanhas')
			.set({ ...v.valor, atualizado_por: adminId, atualizado_em: sql`now()` })
			.where('id', '=', id)
			.where('agencia_id', '=', agenciaId)
			.execute()
		return { ok: true, id }
	} catch (err) {
		if (ehViolacaoDeUnicidade(err)) return { ok: false, status: 409, erro: await mensagemDeConflito(agenciaId, v.valor) }
		throw err
	}
}

/**
 * Visitas dos últimos 30 dias com a marca da agência (prefixo no nome da
 * campanha ou `utm_medium` dela) que não casam com NENHUMA campanha cadastrada
 * de nenhuma agência. Serve de atalho para cadastrar — e só mostra o que tem a
 * marca da própria agência, nunca campanha alheia.
 */
export async function campanhasDetectadas(agenciaId: string) {
	const ag = await db
		.selectFrom('agencias')
		.select(['prefixos', 'utm_medium_marca'])
		.where('id', '=', agenciaId)
		.executeTakeFirst()
	if (!ag || (ag.prefixos.length === 0 && ag.utm_medium_marca.length === 0)) return []

	const prefixos = ag.prefixos.map(p => p.toLowerCase())
	const marcas = ag.utm_medium_marca.map(m => m.toLowerCase())
	const campanha = saneado(sql`s.utm_campaign`)
	const r = await sql<{ plataforma: string | null; utm_campaign: string | null; utm_id: string | null; sessoes: number }>`
		select ${plataformaDaSessaoSql} as plataforma, ${campanha} as utm_campaign, ${saneado(sql`s.utm_id`)} as utm_id,
		       count(*)::int as sessoes
		from visitor_sessions s
		where s.started_at >= now() - interval '30 days'
		  and (
		    exists (select 1 from unnest(${prefixos}::text[]) p where starts_with(lower(coalesce(${campanha}, '')), p))
		    or lower(coalesce(${saneado(sql`s.utm_medium`)}, '')) = any(${marcas}::text[])
		  )
		  and not exists (select 1 from agencia_campanhas ac where ${casaCampanhaSql})
		group by 1, 2, 3
		order by 4 desc
		limit 30
	`.execute(db)
	return r.rows
}
