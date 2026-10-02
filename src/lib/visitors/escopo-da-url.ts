import type { PlataformaCampanha } from '@/lib/db/types'
import type { Escopo } from './escopo'

const PLATAFORMAS: readonly PlataformaCampanha[] = ['google', 'meta', 'webmotors']
const MAX_CAMPANHAS = 20
const MAX_TAMANHO = 200

/**
 * Escopo da agência a partir da URL. A agência vem do LOGIN (quem chama passa
 * o id); da URL saem só os filtros que estreitam DENTRO dela — plataforma e
 * campanha (`campanha=<rótulo da tela>`, repetível). Valor inválido é
 * ignorado, nunca alarga o escopo.
 */
export function escopoDaUrl(endereco: string, agenciaId: string): Escopo {
	const p = new URL(endereco).searchParams
	const plat = p.get('plataforma')
	const plataforma = PLATAFORMAS.includes(plat as PlataformaCampanha) ? (plat as PlataformaCampanha) : null
	const campanhas = p
		.getAll('campanha')
		.map(c => c.trim())
		.filter(c => c.length > 0 && c.length <= MAX_TAMANHO)
		.slice(0, MAX_CAMPANHAS)
	return { tipo: 'agencia', agenciaId, plataforma, campanhas: campanhas.length > 0 ? campanhas : null }
}
