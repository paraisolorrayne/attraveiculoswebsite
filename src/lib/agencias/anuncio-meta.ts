import type { PlataformaCampanha } from '@/lib/db/types'

/**
 * Lead que veio do anúncio da Meta direto para o WhatsApp (16/10).
 *
 * Esse lead nunca passa pelo site, então não tem visita para ligar e a regra da
 * aba Leads (card ligado a uma visita com o marcador da agência) nunca o via.
 * Caso real: os 6 leads da Media House que foram ao vendedor estavam no CRM e a
 * área da Media House mostrava zero. A Fykos manda a campanha do anúncio no
 * card (`dados.origem_detalhe`: `campanha_nome`, `campanha_id`, `agencia`,
 * `plataforma`), e é por ela que o lead passa a contar.
 *
 * O marcador é o mesmo da sessão: o nome da campanha COMEÇA com um prefixo da
 * agência, ou o id da campanha está em `ids_campanha` (como o `utm_id` da
 * visita), sem diferenciar caixa nem espaço, e item vazio na lista é ignorado.
 * Vale também o nome da agência gravado no card, para campanha nova que ainda
 * não segue o padrão de nome. Sem nome, a campanha aparece pelo id.
 */

export interface AgenciaDoMarcador {
	nome: string
	prefixos: string[]
	ids_campanha: string[]
}

export interface FiltroDaTela {
	plataforma?: PlataformaCampanha | null
	campanhas?: string[] | null
}

export interface ToqueDoAnuncio {
	campanha: string
	plataforma: PlataformaCampanha | null
}

const PLATAFORMAS: readonly PlataformaCampanha[] = ['google', 'meta', 'webmotors']

const limpo = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function toqueDoAnuncioMeta(dados: unknown, agencia: AgenciaDoMarcador | null, filtro: FiltroDaTela): ToqueDoAnuncio | null {
	const origem = dados && typeof dados === 'object' ? (dados as Record<string, unknown>).origem_detalhe : null
	if (!origem || typeof origem !== 'object') return null
	const o = origem as Record<string, unknown>
	const nomeDaCampanha = limpo(o.campanha_nome)
	const id = limpo(o.campanha_id)
	const campanha = nomeDaCampanha || id
	if (!campanha) return null

	if (agencia) {
		const nome = nomeDaCampanha.toLowerCase()
		const peloPrefixo = nome !== '' && agencia.prefixos.some(p => limpo(p) !== '' && nome.startsWith(limpo(p).toLowerCase()))
		const peloId = id !== '' && agencia.ids_campanha.some(i => limpo(i) !== '' && limpo(i).toLowerCase() === id.toLowerCase())
		const peloNome = limpo(o.agencia).toLowerCase() !== '' && limpo(o.agencia).toLowerCase() === limpo(agencia.nome).toLowerCase()
		if (!peloPrefixo && !peloId && !peloNome) return null
	}

	const p = limpo(o.plataforma).toLowerCase()
	const plataforma = (PLATAFORMAS as readonly string[]).includes(p) ? (p as PlataformaCampanha) : null
	if (filtro.plataforma && plataforma !== filtro.plataforma) return null
	const campanhas = filtro.campanhas && filtro.campanhas.length > 0 ? filtro.campanhas.map(c => c.trim().toLowerCase()) : null
	if (campanhas && !campanhas.includes(campanha.toLowerCase())) return null

	return { campanha, plataforma }
}
