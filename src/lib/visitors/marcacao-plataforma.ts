/**
 * O que cada campo de UTM significa em CADA plataforma.
 *
 * O mesmo `utm_term` quer dizer coisas diferentes conforme quem gerou o link,
 * e o painel tratava tudo como Google. A Meta passou a marcar assim
 * (28/08/2026):
 *
 *   utm_campaign={{campaign.name}}   → nome da campanha
 *   utm_content={{adset.name}}       → nome do CONJUNTO de anúncios
 *   utm_term={{ad.name}}             → nome do ANÚNCIO (criativo)
 *
 * No Google Ads, `utm_content` costuma ser o criativo/variação e `utm_term` é
 * a PALAVRA-CHAVE buscada. Ou seja: em "Termos que mais convertem", um valor
 * da Meta não é intenção de busca nenhuma — é o nome que o time deu ao vídeo.
 * Medido em 29/08/2026: 6.275 das 9.791 sessões com `utm_term` (64%) eram
 * nome de criativo da Meta entrando numa tela de termos de busca.
 *
 * Arquivo puro: sem I/O, sem React.
 */
import { normalizarFonte, type SessaoAtribuicao } from '@/lib/traffic-channel'

export type PlataformaMarcacao = 'meta' | 'google' | 'tiktok' | 'outra'

/** Fontes cujo `utm_term` é palavra-chave de BUSCA de verdade. */
const FONTES_DE_BUSCA = new Set(['google', 'bing', 'duckduckgo', 'yahoo', 'yandex', 'ecosia', 'brave'])

/** Fontes cujo `utm_term`/`utm_content` são nomes dados pelo anunciante. */
const FONTES_SOCIAIS = new Set(['meta', 'tiktok', 'kwai', 'linkedin', 'twitter', 'pinterest', 'youtube'])

export function plataformaDaMarcacao(sessao: SessaoAtribuicao): PlataformaMarcacao {
	const fonte = normalizarFonte(sessao)
	if (fonte === 'meta') return 'meta'
	if (fonte === 'google') return 'google'
	if (fonte === 'tiktok') return 'tiktok'
	return 'outra'
}

/** O `utm_term` desta sessão é palavra-chave de busca (e não nome de anúncio)? */
export function termoEhPalavraChave(sessao: SessaoAtribuicao): boolean {
	return FONTES_DE_BUSCA.has(normalizarFonte(sessao))
}

/** O `utm_term` desta sessão é nome de anúncio dado pelo anunciante? */
export function termoEhNomeDeAnuncio(sessao: SessaoAtribuicao): boolean {
	return FONTES_SOCIAIS.has(normalizarFonte(sessao))
}

export interface PapelDoCampo {
	/** Nome curto para cabeçalho de coluna. */
	titulo: string
	/** Explicação para a dica da seção. */
	dica: string
}

interface PapeisDaPlataforma {
	conteudo: PapelDoCampo
	termo: PapelDoCampo
	grupo: PapelDoCampo
}

const PAPEIS: Record<PlataformaMarcacao, PapeisDaPlataforma> = {
	meta: {
		conteudo: {
			titulo: 'Conjunto de anúncios',
			dica: 'Na Meta, utm_content={{adset.name}} — é o CONJUNTO (público e orçamento), não o criativo.',
		},
		termo: {
			titulo: 'Anúncio (criativo)',
			dica: 'Na Meta, utm_term={{ad.name}} — é o nome do anúncio, não uma palavra-chave buscada.',
		},
		grupo: {
			titulo: 'ID do conjunto',
			dica: 'Só chega quando o link inclui adset_id. Com o padrão de nomes, o conjunto vem em utm_content.',
		},
	},
	google: {
		conteudo: {
			titulo: 'Conteúdo do anúncio',
			dica: 'No Google, utm_content identifica a variação/criativo do anúncio.',
		},
		termo: {
			titulo: 'Palavra-chave',
			dica: 'No Google, utm_term={keyword} — o termo que a pessoa buscou e acionou o anúncio.',
		},
		grupo: {
			titulo: 'Grupo de anúncios',
			dica: 'adgroup_id do Google Ads.',
		},
	},
	tiktok: {
		conteudo: { titulo: 'Conjunto de anúncios', dica: 'No TikTok, utm_content costuma ser o ad group.' },
		termo: { titulo: 'Anúncio (criativo)', dica: 'No TikTok, utm_term costuma ser o nome do anúncio.' },
		grupo: { titulo: 'ID do conjunto', dica: 'Só chega quando o link inclui o parâmetro.' },
	},
	outra: {
		conteudo: { titulo: 'utm_content', dica: 'O significado depende de quem montou o link.' },
		termo: { titulo: 'utm_term', dica: 'O significado depende de quem montou o link.' },
		grupo: { titulo: 'Grupo', dica: 'Identificador do conjunto/grupo, quando enviado.' },
	},
}

export function papeisDaPlataforma(plataforma: PlataformaMarcacao): PapeisDaPlataforma {
	return PAPEIS[plataforma]
}

/**
 * A plataforma dominante de um conjunto de sessões (para rotular a tela de uma
 * campanha, que pode ter chegado com mais de uma grafia de fonte).
 */
export function plataformaDominante(
	fontes: Array<{ fonte: string; sessoes: number }>,
): PlataformaMarcacao {
	let melhor: PlataformaMarcacao = 'outra'
	let maior = 0
	for (const f of fontes) {
		const p = plataformaDaMarcacao({ utm_source: f.fonte })
		if (p !== 'outra' && f.sessoes > maior) {
			melhor = p
			maior = f.sessoes
		}
	}
	return melhor
}

/**
 * Macro que a plataforma deveria ter substituído e não substituiu:
 * `{{campaign.name}}` (Meta), `{keyword}` / `{campaignid}` (Google).
 *
 * Acontece quando o link é copiado para onde a macro não é expandida — um
 * story publicado à mão, um encurtador, um teste. O valor literal viraria uma
 * "campanha" chamada `{{campaign.name}}` no relatório.
 */
export function ehMacroNaoSubstituida(valor: string | null | undefined): boolean {
	const v = (valor ?? '').trim()
	if (!v) return false
	return /[{}]/.test(v)
}
