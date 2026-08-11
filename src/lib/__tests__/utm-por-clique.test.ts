import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { collectUTMParams } from '@/lib/visitor-tracking'

/**
 * O sufixo confirmado com o Eduardo em 10/08/2026 mistura, de propósito,
 * parâmetros PERSONALIZADOS (que só resolvem onde alguém os cadastrou) com
 * ValueTrack (que sempre resolvem):
 *
 *   utm_campaign={_campaign}&utm_content={_content}&utm_term={_term}
 *   &utm_id={campaignid}&adgroup_id={adgroupid}&matchtype=&device=&network=
 *
 * Consequência: numa campanha sem `_campaign` cadastrado, a URL chega com
 * `utm_campaign=` VAZIO e `utm_id=<id real>` preenchido. É esse par que os
 * testes abaixo cobrem.
 */

/** Cookie jar de mentira — o suficiente para o que visitor-tracking usa. */
function montarDom(search: string, cookiesIniciais: Record<string, string> = {}) {
	const jar = new Map(Object.entries(cookiesIniciais))

	const documentFake = {
		get cookie() {
			return [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
		},
		set cookie(valor: string) {
			const [par, ...atributos] = valor.split(';').map(s => s.trim())
			const idx = par.indexOf('=')
			const nome = par.slice(0, idx)
			const bruto = par.slice(idx + 1)
			const expira = atributos.find(a => a.toLowerCase().startsWith('expires='))
			// Cookie com expiração no passado = apagado
			if (expira && new Date(expira.slice('expires='.length)).getTime() <= Date.now()) {
				jar.delete(nome)
				return
			}
			jar.set(nome, decodeURIComponent(bruto))
		},
	}

	globalThis.window = { location: { search } } as unknown as Window & typeof globalThis
	globalThis.document = documentFake as unknown as Document
	return jar
}

afterEach(() => {
	delete (globalThis as { window?: unknown }).window
	delete (globalThis as { document?: unknown }).document
})

describe('collectUTMParams — o sufixo completo do Eduardo', () => {
	it('captura os nove parâmetros quando os personalizados estão cadastrados', () => {
		montarDom(
			'?utm_source=google&utm_medium=cpc&utm_campaign=institucional&utm_content=anuncio-x' +
			'&utm_term=porsche+macan&utm_id=111&adgroup_id=222&matchtype=e&device=m&network=g',
		)
		const r = collectUTMParams()
		expect(r.utm_source).toBe('google')
		expect(r.utm_medium).toBe('cpc')
		expect(r.utm_campaign).toBe('institucional')
		expect(r.utm_content).toBe('anuncio-x')
		expect(r.utm_term).toBe('porsche macan')
		expect(r.utm_id).toBe('111')      // {campaignid}
		expect(r.adset_id).toBe('222')    // {adgroupid}
		expect(r.matchtype).toBeTruthy()
		expect(r.device).toBeTruthy()
		expect(r.network).toBeTruthy()
	})

	it('personalizado não cadastrado chega vazio e NÃO vira nome de campanha', () => {
		montarDom('?utm_source=google&utm_medium=cpc&utm_campaign=&utm_content=&utm_term=&utm_id=222')
		const r = collectUTMParams()
		expect(r.utm_campaign).toBeNull()
		expect(r.utm_id).toBe('222')
	})
})

describe('as UTMs de um clique não podem vazar para o clique seguinte', () => {
	beforeEach(() => {
		delete (globalThis as { window?: unknown }).window
		delete (globalThis as { document?: unknown }).document
	})

	it('campanha sem _campaign não herda o nome da campanha anterior', () => {
		// Visita 1: campanha "attra-veiculos", que TEM _campaign cadastrado.
		// Visita 2 (dias depois): "carros-luxo-geral", que NÃO tem.
		// Sem correção, o cookie de 30 dias devolve "institucional" e o painel
		// carimba o lead na campanha errada — com o utm_id da campanha certa.
		montarDom(
			'?utm_source=google&utm_medium=cpc&utm_campaign=&utm_content=carros-luxo-geral&utm_id=222',
			{ attra_utm_campaign: 'institucional', attra_utm_id: '111' },
		)
		const r = collectUTMParams()
		expect(r.utm_campaign).toBeNull()
		expect(r.utm_id).toBe('222')
	})

	it('o cookie da campanha antiga é apagado, não só ignorado', () => {
		const jar = montarDom(
			'?utm_source=google&utm_medium=cpc&utm_campaign=&utm_id=222',
			{ attra_utm_campaign: 'institucional' },
		)
		collectUTMParams()
		expect(jar.get('attra_utm_campaign')).toBeUndefined()
	})

	it('clique só com gclid não herda as UTMs do mês passado', () => {
		// Autotagging sem sufixo: continua sendo pago (o gclid diz isso), mas
		// não é a campanha anterior.
		montarDom('?gclid=EAIaIQ', {
			attra_utm_campaign: 'institucional',
			attra_utm_source: 'google',
			attra_adset_id: '999',
		})
		const r = collectUTMParams()
		expect(r.utm_campaign).toBeNull()
		expect(r.utm_source).toBeNull()
		expect(r.adset_id).toBeNull()
	})

	it('navegação dentro do site (URL limpa) CONTINUA usando o cookie', () => {
		// Esse é o motivo de o cookie existir: numa SPA a query some na segunda
		// página e a sessão perderia a origem.
		montarDom('?', {
			attra_utm_campaign: 'institucional',
			attra_utm_source: 'google',
			attra_utm_id: '111',
		})
		const r = collectUTMParams()
		expect(r.utm_campaign).toBe('institucional')
		expect(r.utm_source).toBe('google')
		expect(r.utm_id).toBe('111')
	})

	it('página com parâmetro alheio não conta como clique novo', () => {
		// ?page=2 não é marcação — não pode zerar a origem da visita.
		montarDom('?page=2', { attra_utm_campaign: 'institucional' })
		expect(collectUTMParams().utm_campaign).toBe('institucional')
	})

	it('o grupo de anúncios acompanha a campanha do clique atual', () => {
		montarDom(
			'?utm_source=google&utm_medium=cpc&utm_id=222&adgroup_id=888',
			{ attra_utm_id: '111', attra_adset_id: '777' },
		)
		const r = collectUTMParams()
		expect(r.utm_id).toBe('222')
		expect(r.adset_id).toBe('888')
	})
})
