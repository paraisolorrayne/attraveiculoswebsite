/**
 * Formatos que o Gerador de Criativos produz e envia ao board do Marketing.
 *
 * Cada clique em "Baixar" no gerador gera DUAS peças da mesma composição:
 *   stories — 1080×1920 (9:16), a peça original;
 *   feed    — 1080×1350 (4:5), a proporção que a Meta usa no feed de anúncios,
 *             derivada da mesma composição, só com a foto principal.
 * As duas vão para a fila automaticamente, um card cada. Esta lib é a única
 * definição de "quais formatos existem" — a rota valida por ela e o board
 * apresenta por ela, para não haver duas verdades.
 */

export const FORMATOS_CRIATIVO = ['stories', 'feed'] as const
export type FormatoCriativo = (typeof FORMATOS_CRIATIVO)[number]

/** Formato que existia antes de haver o campo — o que uma linha antiga significa. */
export const FORMATO_CRIATIVO_PADRAO: FormatoCriativo = 'stories'

/**
 * Normaliza o campo `format` do multipart. Ausente/vazio = Stories (cliente
 * antigo); valor que não é um formato conhecido = null, para a rota responder
 * 400 em vez de gravar lixo que o board não saberia mostrar.
 */
export function normalizarFormatoCriativo(valor: unknown): FormatoCriativo | null {
	if (valor === null || valor === undefined) return FORMATO_CRIATIVO_PADRAO
	if (typeof valor !== 'string') return null
	const limpo = valor.trim().toLowerCase()
	if (!limpo) return FORMATO_CRIATIVO_PADRAO
	return (FORMATOS_CRIATIVO as readonly string[]).includes(limpo) ? (limpo as FormatoCriativo) : null
}

/** Lê o que veio do banco sem derrubar o board: desconhecido cai no padrão. */
function formatoConhecido(valor: unknown): FormatoCriativo {
	return normalizarFormatoCriativo(valor) ?? FORMATO_CRIATIVO_PADRAO
}

const APRESENTACAO: Record<FormatoCriativo, { rotulo: string; sufixo: string; proporcao: string }> = {
	stories: { rotulo: 'Stories 9:16', sufixo: 'STORIES', proporcao: '9 / 16' },
	feed: { rotulo: 'Feed 4:5', sufixo: 'FEED', proporcao: '4 / 5' },
}

export function rotuloFormatoCriativo(valor: unknown): string {
	return APRESENTACAO[formatoConhecido(valor)].rotulo
}

/** Mesmo sufixo que o gerador põe no arquivo baixado no computador (NOME-STORIES-v1.png). */
export function sufixoArquivoCriativo(valor: unknown): string {
	return APRESENTACAO[formatoConhecido(valor)].sufixo
}

/** Valor para `aspect-ratio` do card no board. */
export function proporcaoFormatoCriativo(valor: unknown): string {
	return APRESENTACAO[formatoConhecido(valor)].proporcao
}
