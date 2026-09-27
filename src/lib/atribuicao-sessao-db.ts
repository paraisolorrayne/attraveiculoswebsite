/**
 * As consultas do caminho de volta da atribuição. A lógica pura está em
 * `atribuicao-sessao.ts`; aqui só o banco.
 *
 * Duas portas de entrada, porque o CRM tem chaves diferentes conforme a época
 * do lead:
 *
 *   - `atribuicaoPorSessao` — para os leads de 23/07 a 05/08, que trazem o
 *     `[ref: <sessão>]` na mensagem, e para os de formulário, que mandam a
 *     sessão no payload. O CRM já tem o token nesses casos.
 *   - `atribuicaoPorCard` — para todo o resto. O CRM não tem token nenhum, mas
 *     tem o id do card que ELE MESMO mandou para `/api/webhook/fykos-crm`; é
 *     por esse id que a correlação clique↔conversa foi gravada.
 *
 * A segunda é a que destrava o problema de hoje sem pôr identificador interno
 * de volta na mensagem do comprador.
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'
import {
	montarAtribuicao,
	temSinalDeOrigem,
	type LinhaDeSessao,
	type OrigemDaLigacao,
	type RespostaAtribuicao,
} from './atribuicao-sessao'

/**
 * A primeira página da visita.
 *
 * Subconsulta correlacionada em vez de `join` + `distinct on`: são no máximo
 * duas sessões por resposta, então o custo é irrelevante e a consulta continua
 * legível. `visitor_page_views.session_id` aponta para `visitor_sessions.id`
 * (o uuid), não para o token — conferido em `api/tracking/pageview`.
 *
 * A coluna de tempo é `viewed_at`, não `created_at`: SQL cru não passa pela
 * checagem de tipos do Kysely, então o nome errado só aparece em tempo de
 * execução (42703). O teste de integração aqui do lado existe por isso.
 */
const LANDING = sql<string | null>`(
	select pv.page_path
	from visitor_page_views pv
	where pv.session_id = visitor_sessions.id
	order by pv.viewed_at asc
	limit 1
)`

const CAMPOS = [
	'visitor_sessions.session_id',
	'visitor_sessions.started_at',
	'visitor_sessions.referrer_domain',
	'visitor_sessions.utm_source',
	'visitor_sessions.utm_medium',
	'visitor_sessions.utm_campaign',
	'visitor_sessions.utm_content',
	'visitor_sessions.utm_term',
	'visitor_sessions.gclid',
	'visitor_sessions.fbclid',
] as const

/** A sessão do lead, com o fingerprint para achar a primeira visita dela. */
async function sessaoPorToken(
	token: string,
): Promise<{ linha: LinhaDeSessao; fingerprintId: string } | null> {
	const r = await db
		.selectFrom('visitor_sessions')
		.select([...CAMPOS, 'visitor_sessions.fingerprint_id'])
		.select(LANDING.as('landing'))
		.where('visitor_sessions.session_id', '=', token)
		.orderBy('visitor_sessions.started_at', 'desc')
		.limit(1)
		.executeTakeFirst()

	if (!r) return null
	const { fingerprint_id, ...linha } = r
	return { linha: linha as LinhaDeSessao, fingerprintId: fingerprint_id }
}

/**
 * A primeira visita COM SINAL daquele visitante.
 *
 * É o first-touch, e ele não precisou de cookie novo de 90 dias: o
 * `fingerprint_id` já atravessa sessões e cada sessão guarda a própria origem,
 * então a primeira visita atribuível é uma consulta, não um dado novo a
 * coletar.
 *
 * O filtro repete a regra de `temSinalDeOrigem` em SQL para não trazer a
 * tabela inteira até o Node. A função pura continua valendo sobre o que voltar:
 * é ela que decide o que vira resposta.
 */
async function primeiraVisitaComSinal(fingerprintId: string): Promise<LinhaDeSessao | null> {
	const r = await db
		.selectFrom('visitor_sessions')
		.select([...CAMPOS])
		.select(LANDING.as('landing'))
		.where('visitor_sessions.fingerprint_id', '=', fingerprintId)
		.where(eb =>
			eb.or([
				eb('visitor_sessions.utm_source', '<>', ''),
				eb('visitor_sessions.utm_medium', '<>', ''),
				eb('visitor_sessions.utm_campaign', '<>', ''),
				eb('visitor_sessions.gclid', '<>', ''),
				eb('visitor_sessions.fbclid', '<>', ''),
				eb('visitor_sessions.referrer_domain', '<>', ''),
			]),
		)
		.orderBy('visitor_sessions.started_at', 'asc')
		.limit(1)
		.executeTakeFirst()

	return (r as LinhaDeSessao | undefined) ?? null
}

async function montar(token: string, ligacao: OrigemDaLigacao): Promise<RespostaAtribuicao | null> {
	const achada = await sessaoPorToken(token)
	if (!achada) return null

	const primeira = await primeiraVisitaComSinal(achada.fingerprintId)
	// A sessão do lead já é a primeira com sinal: evita uma resposta em que
	// first e last apontam para linhas diferentes só por causa do `limit 1`.
	const first = primeira ?? (temSinalDeOrigem(achada.linha) ? achada.linha : null)

	return montarAtribuicao(token, ligacao, achada.linha, first)
}

/** Pelo token da sessão — leads com `[ref: ...]` ou de formulário. */
export async function atribuicaoPorSessao(token: string): Promise<RespostaAtribuicao | null> {
	return montar(token, 'marcador')
}

/**
 * Pelo id do card do CRM.
 *
 * A sessão e a origem da ligação vivem em `crm_cards.dados`, gravadas pela
 * correlação em `whatsapp-correlacao-db.ts`. `site_session_origem` é devolvido
 * como veio: uma correlação por tempo é menos certa que um marcador explícito,
 * e o relatório do CRM precisa saber a diferença em vez de tratar as duas como
 * o mesmo fato.
 */
export type ResultadoPorCard =
	| { tipo: 'ok'; atribuicao: RespostaAtribuicao }
	/** O card nunca chegou ao site — problema na entrega do webhook, não aqui. */
	| { tipo: 'card_desconhecido' }
	/** Card conhecido, sem visita ligada: normalmente a recusa por ambiguidade. */
	| { tipo: 'sem_correlacao' }

export async function atribuicaoPorCard(cardId: string): Promise<ResultadoPorCard> {
	const card = await db
		.selectFrom('crm_cards')
		.select('dados')
		.where('id', '=', cardId)
		.executeTakeFirst()

	// As duas ausências são separadas de propósito: "não conheço este card"
	// aponta para a entrega do webhook, e "conheço mas não liguei" é a recusa
	// deliberada por ambiguidade. Devolver 404 igual nos dois faria o CRM
	// investigar o lado errado.
	if (!card) return { tipo: 'card_desconhecido' }

	const dados = (card.dados && typeof card.dados === 'object' ? card.dados : {}) as Record<string, unknown>
	const token = typeof dados.site_session_id === 'string' ? dados.site_session_id : null
	if (!token) return { tipo: 'sem_correlacao' }

	const origem = dados.site_session_origem
	const ligacao: OrigemDaLigacao =
		origem === 'correlacao_clique_whatsapp' || origem === 'formulario' ? origem : 'marcador'

	const atribuicao = await montar(token, ligacao)
	return atribuicao ? { tipo: 'ok', atribuicao } : { tipo: 'sem_correlacao' }
}
