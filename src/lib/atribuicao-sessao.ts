/**
 * Atribuição de uma visita, no formato que o CRM (Fykos) consome.
 *
 * POR QUE ESTE ARQUIVO EXISTE. O CRM não consegue dizer de qual campanha veio
 * um lead do site: em 90 dias, 125 leads com origem `site` e 4 com sessão. Os
 * 4 são de 23/07 a 05/08 — a janela em que o site anexava `[ref: <sessão>]` ao
 * texto do wa.me.
 *
 * O marcador não quebrou: ele foi tirado de propósito em 05/08 (commit
 * 0f337c9), porque o identificador de sessão é log interno e não deve viajar
 * na mensagem que o COMPRADOR manda para a loja. No lugar dele entrou a
 * correlação por tempo entre o clique e a conversa
 * (`whatsapp-correlacao-db.ts`), que grava a sessão em `crm_cards.dados`.
 *
 * O que faltava era o caminho de volta: essa correlação fica no banco do SITE,
 * e o CRM nunca soube dela — por isso o campo `site_session_id` deles continua
 * vazio e o lead chega indistinguível de orgânico. Este módulo é a metade pura
 * do caminho de volta: dadas as linhas do banco, monta a resposta. Sem I/O,
 * sem banco, sem React.
 *
 * DUAS COISAS QUE ELE SE RECUSA A FAZER:
 *
 *   1. Inventar. Sessão sem nenhum sinal de origem devolve `null` em vez de
 *      "direct" — que é uma AFIRMAÇÃO, e errada. A regra de descarte silencioso
 *      do lado deles existe por isso: ausente é recuperável, errado não.
 *   2. Normalizar o nome da campanha. Os prefixos `[EB]` e `[VA]` são o que
 *      separa as duas agências no relatório; encurtar ou limpar o nome destrói
 *      justamente o corte que o relatório precisa.
 */

/** Como a visita foi ligada ao lead — e, portanto, o quanto confiar nela. */
export type OrigemDaLigacao =
	/** O cliente mandou `[ref: ...]` na mensagem. Ligação explícita. */
	| 'marcador'
	/** Clique e conversa casados por janela de tempo. Menos certo. */
	| 'correlacao_clique_whatsapp'
	/** Lead de formulário: a sessão veio no próprio payload. */
	| 'formulario'

/** Um toque: de onde a pessoa veio numa visita. */
export interface Toque {
	source: string | null
	medium: string | null
	campaign: string | null
	content: string | null
	term: string | null
	gclid: string | null
	/** iOS com ATT manda um destes no lugar do `gclid` — nunca os dois. */
	wbraid: string | null
	gbraid: string | null
	fbclid: string | null
	landing: string | null
	ts: string | null
}

export interface RespostaAtribuicao {
	session_id: string
	/** Nunca omitido: o CRM precisa saber se a ligação é explícita ou por tempo. */
	ligacao: OrigemDaLigacao
	first_touch: Toque | null
	last_touch: Toque | null
}

/** O que o banco devolve para uma sessão. Só o que a atribuição usa. */
export interface LinhaDeSessao {
	session_id: string
	started_at: Date | string | null
	referrer_domain: string | null
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	utm_content: string | null
	utm_term: string | null
	gclid: string | null
	wbraid: string | null
	gbraid: string | null
	fbclid: string | null
	/** Primeira página da visita, de `visitor_page_views`. */
	landing: string | null
}

const vazio = (v: string | null | undefined): string | null => {
	const t = (v ?? '').trim()
	return t === '' ? null : t
}

/**
 * Uma sessão tem sinal de origem?
 *
 * Referrer sozinho conta: quem chega por busca orgânica não traz UTM nenhum, e
 * "veio do Google orgânico" é informação de verdade. O que não conta é uma
 * visita sem nada — essa devolve `null` lá em cima, em vez de virar "direct".
 */
export function temSinalDeOrigem(linha: LinhaDeSessao): boolean {
	return !!(
		vazio(linha.utm_source) ||
		vazio(linha.utm_medium) ||
		vazio(linha.utm_campaign) ||
		vazio(linha.gclid) ||
		vazio(linha.wbraid) ||
		vazio(linha.gbraid) ||
		vazio(linha.fbclid) ||
		vazio(linha.referrer_domain)
	)
}

/**
 * Monta um toque a partir da linha.
 *
 * `source` cai para o domínio do referrer quando não há UTM: é assim que
 * tráfego orgânico aparece em vez de sumir. O domínio vai CRU (`google.com`,
 * não `google`) — com `utm_source=google` é Ads etiquetado, pelo referrer é
 * clique orgânico, e encurtar juntaria os dois num rótulo só.
 *
 * `medium` NÃO ganha palpite equivalente: dizer `organic` sem o parâmetro seria
 * inventar o que não foi medido.
 */
export function montarToque(linha: LinhaDeSessao): Toque {
	const ts = linha.started_at
	return {
		source: vazio(linha.utm_source) ?? vazio(linha.referrer_domain),
		medium: vazio(linha.utm_medium),
		campaign: vazio(linha.utm_campaign),
		content: vazio(linha.utm_content),
		term: vazio(linha.utm_term),
		gclid: vazio(linha.gclid),
		wbraid: vazio(linha.wbraid),
		gbraid: vazio(linha.gbraid),
		fbclid: vazio(linha.fbclid),
		landing: vazio(linha.landing),
		ts: ts ? new Date(ts).toISOString() : null,
	}
}

/**
 * A resposta completa.
 *
 * `first_touch` é a PRIMEIRA visita com sinal de origem daquele visitante, e
 * `last_touch` é a visita que gerou o lead. As duas saem de sessões já
 * gravadas — o site não precisa de cookie novo de 90 dias, porque o
 * `fingerprint_id` já atravessa sessões e cada sessão guarda a própria origem.
 *
 * Quando a primeira visita com sinal É a que gerou o lead, `first_touch` e
 * `last_touch` saem iguais, de propósito: são dois fatos sobre a mesma visita,
 * e omitir um deles faria o CRM achar que faltou dado.
 */
export function montarAtribuicao(
	sessionId: string,
	ligacao: OrigemDaLigacao,
	sessaoDoLead: LinhaDeSessao | null,
	primeiraComSinal: LinhaDeSessao | null,
): RespostaAtribuicao {
	return {
		session_id: sessionId,
		ligacao,
		first_touch: primeiraComSinal && temSinalDeOrigem(primeiraComSinal) ? montarToque(primeiraComSinal) : null,
		last_touch: sessaoDoLead && temSinalDeOrigem(sessaoDoLead) ? montarToque(sessaoDoLead) : null,
	}
}

/**
 * O token de sessão é válido?
 *
 * Mesmo alfabeto que o CRM valida do lado dele (6 a 80, `[A-Za-z0-9_-]`).
 * Repetido aqui de propósito: recusar cedo evita levar lixo ao banco, e um
 * token fora do formato não teria como existir em `visitor_sessions`.
 */
export function tokenDeSessaoValido(token: string): boolean {
	return /^[A-Za-z0-9_-]{6,80}$/.test(token)
}
