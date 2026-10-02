import type { PlataformaCampanha } from '@/lib/db/types'
import type { Escopo } from './escopo'

const PLATAFORMAS: readonly PlataformaCampanha[] = ['google', 'meta', 'webmotors']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Escopo da agência a partir da URL. A agência vem do LOGIN (quem chama passa
 * o id); da URL saem só os filtros que estreitam DENTRO dela — plataforma e
 * campanhas. Valor inválido é ignorado, nunca alarga o escopo.
 */
export function escopoDaUrl(endereco: string, agenciaId: string): Escopo {
	const p = new URL(endereco).searchParams
	const plat = p.get('plataforma')
	const plataforma = PLATAFORMAS.includes(plat as PlataformaCampanha) ? (plat as PlataformaCampanha) : null
	const campanhas = (p.get('campanhas') ?? '')
		.split(',')
		.map(c => c.trim())
		.filter(c => UUID.test(c))
	return { tipo: 'agencia', agenciaId, plataforma, campanhaIds: campanhas.length > 0 ? campanhas : null }
}
