import { afterEach, describe, expect, it } from 'vitest'
import {
	montarAtribuicao,
	montarToque,
	temSinalDeOrigem,
	tokenDeSessaoValido,
	type LinhaDeSessao,
} from '@/lib/atribuicao-sessao'

const VAZIA: LinhaDeSessao = {
	session_id: '1784810859532-pupqonclbi',
	started_at: '2026-09-19T16:41:02.000Z',
	referrer_domain: null,
	utm_source: null,
	utm_medium: null,
	utm_campaign: null,
	utm_content: null,
	utm_term: null,
	gclid: null,
	fbclid: null,
	landing: '/veiculos/porsche-macan-2023',
}

const linha = (campos: Partial<LinhaDeSessao>): LinhaDeSessao => ({ ...VAZIA, ...campos })

describe('temSinalDeOrigem', () => {
	it('reconhece campanha, clique pago e referrer', () => {
		expect(temSinalDeOrigem(linha({ utm_campaign: '[VA] Search | Estoque Premium' }))).toBe(true)
		expect(temSinalDeOrigem(linha({ gclid: 'Cj0KCQjw' }))).toBe(true)
		expect(temSinalDeOrigem(linha({ fbclid: 'IwAR1' }))).toBe(true)
		// Busca orgânica não traz UTM nenhum, e "veio do Google" é informação.
		expect(temSinalDeOrigem(linha({ referrer_domain: 'google.com' }))).toBe(true)
	})

	it('visita sem nada não tem sinal', () => {
		expect(temSinalDeOrigem(VAZIA)).toBe(false)
	})

	it('campo em branco não conta como sinal', () => {
		// O banco guarda string vazia em alguns casos; vazio não é origem.
		expect(temSinalDeOrigem(linha({ utm_source: '   ', gclid: '' }))).toBe(false)
	})
})

describe('montarToque', () => {
	it('preserva o nome da campanha como está cadastrado', () => {
		// Os prefixos [EB] e [VA] separam as duas agências no relatório da Attra.
		// Normalizar o nome destruiria justamente esse corte.
		const t = montarToque(linha({ utm_campaign: '[VA] Search | Estoque Premium' }))
		expect(t.campaign).toBe('[VA] Search | Estoque Premium')
	})

	it('sem utm_source, cai para o domínio do referrer CRU', () => {
		// `google.com` e não `google`: com utm_source=google é Ads etiquetado,
		// pelo referrer é clique orgânico. Encurtar o domínio juntaria os dois
		// num rótulo só, e eles têm medium diferente de propósito.
		expect(montarToque(linha({ referrer_domain: 'google.com' })).source).toBe('google.com')
	})

	it('não inventa medium quando o parâmetro não veio', () => {
		// Dizer "organic" sem ter medido seria afirmar o que não se sabe.
		expect(montarToque(linha({ referrer_domain: 'google.com' })).medium).toBeNull()
	})

	it('data em ISO', () => {
		expect(montarToque(VAZIA).ts).toBe('2026-09-19T16:41:02.000Z')
	})
})

describe('montarAtribuicao', () => {
	it('monta os dois toques e diz como a ligação foi feita', () => {
		const primeira = linha({
			utm_source: 'google',
			utm_medium: 'cpc',
			utm_campaign: '[VA] Search | Estoque Premium',
			gclid: 'Cj0KCQjw',
			started_at: '2026-09-19T13:41:02.000Z',
		})
		const doLead = linha({ referrer_domain: 'attraveiculos.com.br' })

		const r = montarAtribuicao('1784810859532-pupqonclbi', 'correlacao_clique_whatsapp', doLead, primeira)

		expect(r.session_id).toBe('1784810859532-pupqonclbi')
		expect(r.ligacao).toBe('correlacao_clique_whatsapp')
		expect(r.first_touch?.campaign).toBe('[VA] Search | Estoque Premium')
		expect(r.first_touch?.gclid).toBe('Cj0KCQjw')
		expect(r.last_touch?.source).toBe('attraveiculos.com.br')
	})

	it('sessão sem origem devolve null, nunca "direct"', () => {
		// "direct" é uma AFIRMAÇÃO. O CRM descarta em silêncio o que vem errado,
		// e ausente é recuperável — errado não.
		const r = montarAtribuicao('abc123', 'marcador', VAZIA, VAZIA)
		expect(r.first_touch).toBeNull()
		expect(r.last_touch).toBeNull()
	})

	it('primeira visita e visita do lead sendo a mesma, os dois toques saem preenchidos', () => {
		const unica = linha({ utm_source: 'google', utm_medium: 'cpc' })
		const r = montarAtribuicao('abc123', 'marcador', unica, unica)
		expect(r.first_touch).toEqual(r.last_touch)
		expect(r.first_touch).not.toBeNull()
	})
})

describe('tokenDeSessaoValido', () => {
	it('aceita o formato que o CRM valida', () => {
		expect(tokenDeSessaoValido('1784810859532-pupqonclbi')).toBe(true)
		expect(tokenDeSessaoValido('abc_123-XYZ')).toBe(true)
	})

	it('recusa o que o CRM descartaria', () => {
		expect(tokenDeSessaoValido('curto')).toBe(false)
		expect(tokenDeSessaoValido('com espaco no meio')).toBe(false)
		expect(tokenDeSessaoValido('acentuação')).toBe(false)
		expect(tokenDeSessaoValido('a'.repeat(81))).toBe(false)
		expect(tokenDeSessaoValido('')).toBe(false)
	})
})

describe('conferirChave', () => {
	const original = process.env.SITE_ATRIBUICAO_API_KEY
	afterEach(() => {
		if (original === undefined) delete process.env.SITE_ATRIBUICAO_API_KEY
		else process.env.SITE_ATRIBUICAO_API_KEY = original
	})

	it('sem variável configurada, NÃO atende', async () => {
		// Falha fechado: atender sem chave quando a variável falta deixaria a
		// campanha de leads reais aberta na internet, e ninguém perceberia,
		// porque tudo continuaria respondendo.
		delete process.env.SITE_ATRIBUICAO_API_KEY
		const { conferirChave, respostaDeErroDaChave } = await import('@/lib/atribuicao-api-key')
		const r = conferirChave('qualquer-chave')
		expect(r).toBe('sem_chave_configurada')
		expect(respostaDeErroDaChave(r)?.status).toBe(503)
	})

	it('aceita a chave certa e recusa o resto', async () => {
		process.env.SITE_ATRIBUICAO_API_KEY = 'chave-de-teste'
		const { conferirChave } = await import('@/lib/atribuicao-api-key')
		expect(conferirChave('chave-de-teste')).toBe('ok')
		expect(conferirChave('chave-errada')).toBe('recusada')
		expect(conferirChave(null)).toBe('recusada')
		// Prefixo correto não passa: a comparação é do valor inteiro.
		expect(conferirChave('chave')).toBe('recusada')
	})
})
