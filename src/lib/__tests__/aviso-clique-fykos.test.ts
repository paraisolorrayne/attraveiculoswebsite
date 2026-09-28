import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montarAvisoDeClique } from '@/lib/aviso-clique-fykos'
import type { RespostaAtribuicao } from '@/lib/atribuicao-sessao'

const COM_ORIGEM: RespostaAtribuicao = {
	session_id: '1784810859532-pupqonclbi',
	ligacao: 'correlacao_clique_whatsapp',
	first_touch: {
		source: 'google', medium: 'cpc', campaign: '[VA] Search | Estoque Premium',
		content: null, term: null, gclid: 'Cj0KCQjw', wbraid: null, gbraid: null, fbclid: null,
		landing: '/', ts: '2026-09-19T13:41:02.000Z',
	},
	last_touch: {
		source: 'linktr.ee', medium: null, campaign: null,
		content: null, term: null, gclid: null, wbraid: null, gbraid: null, fbclid: null,
		landing: '/comprar', ts: '2026-09-19T16:41:02.000Z',
	},
}

const SEM_ORIGEM: RespostaAtribuicao = {
	session_id: 'abc123def',
	ligacao: 'correlacao_clique_whatsapp',
	first_touch: null,
	last_touch: null,
}

describe('montarAvisoDeClique', () => {
	it('se identifica como aviso, não como lead', () => {
		// Se o receptor criar usuário ou card com isto, o mesmo lead entra duas
		// vezes: uma por aqui e outra pela entrada real do WhatsApp.
		const a = montarAvisoDeClique('c1', new Date('2026-09-19T16:42:11Z'), COM_ORIGEM, '/veiculo/x-988095', '988095')
		expect(a?.tipo).toBe('aviso_clique_site')
		expect(a?.versao).toBe(1)
	})

	it('leva a campanha do primeiro toque e o contexto do clique', () => {
		const a = montarAvisoDeClique('c1', new Date('2026-09-19T16:42:11Z'), COM_ORIGEM, '/veiculo/x-988095', '988095')
		expect(a?.first_touch?.campaign).toBe('[VA] Search | Estoque Premium')
		expect(a?.first_touch?.gclid).toBe('Cj0KCQjw')
		expect(a?.session_id).toBe('1784810859532-pupqonclbi')
		expect(a?.veiculo_id).toBe('988095')
		expect(a?.clique_em).toBe('2026-09-19T16:42:11.000Z')
	})

	it('o clique_id vai junto, para reentrega não duplicar a nota', () => {
		expect(montarAvisoDeClique('c1', new Date(), COM_ORIGEM, null, null)?.clique_id).toBe('c1')
	})

	it('aceita o Timestamp do Kysely, que não é Date', () => {
		const a = montarAvisoDeClique('c1', '2026-09-19T16:42:11.000Z', COM_ORIGEM, null, null)
		expect(a?.clique_em).toBe('2026-09-19T16:42:11.000Z')
	})

	it('não avisa quando não há origem nenhuma', () => {
		// "Chegou alguém, não sei de onde" não ajuda o CRM a decidir nada, e
		// ainda gasta uma nota que pode casar com a conversa errada.
		expect(montarAvisoDeClique('c1', new Date(), SEM_ORIGEM, null, null)).toBeNull()
		expect(montarAvisoDeClique('c1', new Date(), null, null, null)).toBeNull()
	})
})

/**
 * O receptor da Fykos (contrato de 27/09) pede reentrega no 500 e garante
 * idempotência pelo `clique_id`. 4xx é formato nosso: repetir dá a mesma recusa.
 */
describe('enviarAvisoDeClique', () => {
	const aviso = montarAvisoDeClique('c1', new Date(), COM_ORIGEM, '/', null)!
	const original = { ...process.env }

	beforeEach(() => {
		process.env.FYKOS_AVISO_CLIQUE_URL = 'https://crm.exemplo/avisos'
		process.env.FYKOS_AVISO_CLIQUE_TOKEN = 'tok'
		vi.resetModules()
	})
	afterEach(() => {
		process.env = { ...original }
		vi.unstubAllGlobals()
	})

	async function comResposta(...respostas: Array<Response | Error>) {
		const chamadas: RequestInit[] = []
		let i = 0
		vi.stubGlobal('fetch', (_u: string, init: RequestInit) => {
			chamadas.push(init)
			const r = respostas[Math.min(i++, respostas.length - 1)]
			return r instanceof Error ? Promise.reject(r) : Promise.resolve(r)
		})
		const { enviarAvisoDeClique } = await import('@/lib/aviso-clique-fykos')
		return { ok: await enviarAvisoDeClique(aviso), chamadas }
	}

	const resp = (status: number, corpo: unknown = {}) =>
		new Response(JSON.stringify(corpo), { status })

	it('novo:false é sucesso — é a idempotência deles, não erro', async () => {
		const { ok, chamadas } = await comResposta(resp(200, { ok: true, novo: false }))
		expect(ok).toBe(true)
		expect(chamadas).toHaveLength(1)
	})

	it('manda o Bearer e o corpo com tipo de aviso', async () => {
		const { chamadas } = await comResposta(resp(200, { ok: true, novo: true }))
		expect((chamadas[0].headers as Record<string, string>).Authorization).toBe('Bearer tok')
		expect(JSON.parse(chamadas[0].body as string).tipo).toBe('aviso_clique_site')
	})

	it('500 é reentregue uma vez', async () => {
		const { ok, chamadas } = await comResposta(resp(500), resp(200, { ok: true, novo: true }))
		expect(chamadas).toHaveLength(2)
		expect(ok).toBe(true)
	})

	it('erro de rede também é reentregue', async () => {
		const { chamadas } = await comResposta(new Error('ECONNREFUSED'), resp(200, { ok: true }))
		expect(chamadas).toHaveLength(2)
	})

	it('400 NÃO é reentregue: repetir dá a mesma recusa', async () => {
		const { ok, chamadas } = await comResposta(resp(400))
		expect(chamadas).toHaveLength(1)
		expect(ok).toBe(false)
	})

	it('401 NÃO é reentregue', async () => {
		const { chamadas } = await comResposta(resp(401))
		expect(chamadas).toHaveLength(1)
	})

	it('desiste depois de duas tentativas', async () => {
		const { ok, chamadas } = await comResposta(resp(500))
		expect(chamadas).toHaveLength(2)
		expect(ok).toBe(false)
	})

	it('sem URL configurada, não tenta nada', async () => {
		delete process.env.FYKOS_AVISO_CLIQUE_URL
		vi.resetModules()
		const { chamadas, ok } = await comResposta(resp(200))
		expect(chamadas).toHaveLength(0)
		expect(ok).toBe(false)
	})
})
