import { describe, expect, it } from 'vitest'
import { classifyLeadSource } from '@/lib/lead-source'
import { classificarCanal, normalizarFonte } from '@/lib/traffic-channel'
import { temSinalDeOrigem, montarToque, type LinhaDeSessao } from '@/lib/atribuicao-sessao'

/**
 * wbraid e gbraid são o que o Google Ads manda NO LUGAR do gclid quando o
 * clique vem do iOS com rastreamento limitado (ATT). Antes disto o site só
 * olhava para o gclid, e esse tráfego pago chegava indistinguível de orgânico —
 * o furo que o handoff da Fykos aponta em 27/09/2026.
 */
const SEM_NADA: LinhaDeSessao = {
	session_id: 'abc123def', started_at: '2026-09-27T12:00:00.000Z',
	referrer_domain: null, utm_source: null, utm_medium: null, utm_campaign: null,
	utm_content: null, utm_term: null, gclid: null, wbraid: null, gbraid: null,
	fbclid: null, landing: '/',
}

describe('classifyLeadSource', () => {
	it('wbraid e gbraid classificam como Google Ads, igual ao gclid', () => {
		expect(classifyLeadSource({ gclid: 'Cj0K' })).toBe('google_ads')
		expect(classifyLeadSource({ wbraid: 'Cj0Kw' })).toBe('google_ads')
		expect(classifyLeadSource({ gbraid: 'Cj0Kg' })).toBe('google_ads')
	})
})

describe('traffic-channel', () => {
	it('sessão com braid tem fonte google, como teria com gclid', () => {
		expect(normalizarFonte({ gbraid: 'Cj0Kg' })).toBe('google')
		expect(normalizarFonte({ wbraid: 'Cj0Kw' })).toBe('google')
	})

	it('o canal não cai em orgânico só porque falta gclid', () => {
		// Era este o defeito: iOS com ATT não manda gclid, e sem olhar o braid a
		// visita paga era contada como busca orgânica.
		const comBraid = classificarCanal({ gbraid: 'Cj0Kg', referrer_domain: 'google.com' })
		const comGclid = classificarCanal({ gclid: 'Cj0K', referrer_domain: 'google.com' })
		expect(comBraid).toBe(comGclid)
	})
})

describe('atribuição', () => {
	it('braid conta como sinal de origem', () => {
		expect(temSinalDeOrigem(SEM_NADA)).toBe(false)
		expect(temSinalDeOrigem({ ...SEM_NADA, wbraid: 'Cj0Kw' })).toBe(true)
		expect(temSinalDeOrigem({ ...SEM_NADA, gbraid: 'Cj0Kg' })).toBe(true)
	})

	it('o toque leva os dois campos para o CRM', () => {
		const t = montarToque({ ...SEM_NADA, gbraid: 'Cj0Kg' })
		expect(t.gbraid).toBe('Cj0Kg')
		expect(t.gclid).toBeNull()
	})
})
