import { describe, it, expect, afterEach } from 'vitest'
import { collectUTMParams } from '@/lib/visitor-tracking'

/**
 * Variante do sufixo (10/08/2026): soma os ValueTrack automáticos
 * `kw={keyword}` e `creative_id={creative}` aos personalizados já existentes.
 *
 * Por que COMPLEMENTO e não troca: medido em produção, `utm_term` (vindo de
 * `{_term}`, cadastrado a nível de palavra-chave) já chega em 715 das 744
 * sessões pagas dos 7 dias, com palavra-chave real. O que falta são os 4%
 * restantes — palavra nova que ninguém cadastrou — e o ID do anúncio, que
 * chega em ZERO sessões hoje.
 */

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
			const expira = atributos.find(a => a.toLowerCase().startsWith('expires='))
			if (expira && new Date(expira.slice('expires='.length)).getTime() <= Date.now()) {
				jar.delete(nome)
				return
			}
			jar.set(nome, decodeURIComponent(par.slice(idx + 1)))
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

describe('kw={keyword} — a rede de segurança do termo', () => {
	it('preenche o termo quando o personalizado não foi cadastrado', () => {
		// Palavra-chave nova entrou na campanha e ninguém pôs `_term` nela:
		// hoje isso vira uma das 29 sessões sem termo nenhum.
		montarDom('?utm_source=google&utm_medium=cpc&utm_term=&kw=comprar+ferrari&utm_id=222')
		expect(collectUTMParams().utm_term).toBe('comprar ferrari')
	})

	it('não atropela o personalizado quando ele veio', () => {
		// 715 sessões dependem desse caminho — nenhuma pode mudar de valor.
		montarDom('?utm_source=google&utm_medium=cpc&utm_term=porsche+a+venda&kw=porsche')
		expect(collectUTMParams().utm_term).toBe('porsche a venda')
	})

	it('aceita `keyword` como nome alternativo', () => {
		montarDom('?utm_source=google&keyword=carros+importados')
		expect(collectUTMParams().utm_term).toBe('carros importados')
	})

	it('sem termo em lugar nenhum não inventa', () => {
		montarDom('?utm_source=google&utm_medium=cpc&utm_term=&kw=&utm_id=222')
		expect(collectUTMParams().utm_term).toBeNull()
	})

	it('URL só com kw conta como entrada marcada e limpa a origem antiga', () => {
		const r = montarDom('?kw=ferrari', { attra_utm_campaign: 'institucional' })
		expect(collectUTMParams().utm_campaign).toBeNull()
		expect(r.get('attra_utm_campaign')).toBeUndefined()
	})
})

describe('creative_id={creative} — o ID do anúncio', () => {
	it('cai em ad_id, que hoje chega em zero sessões', () => {
		montarDom('?utm_source=google&utm_medium=cpc&creative_id=7788990011&utm_id=222')
		expect(collectUTMParams().ad_id).toBe('7788990011')
	})
})

describe('o sufixo completo da variante, como vai ficar no Google Ads', () => {
	it('entrega os onze campos de uma vez', () => {
		montarDom(
			'?utm_source=google&utm_medium=cpc' +
			'&utm_campaign=institucional&utm_content=anuncio-x&utm_term=porsche+a+venda' +
			'&utm_id=111&adgroup_id=222&creative_id=333&kw=porsche' +
			'&matchtype=e&device=m&network=g',
		)
		const r = collectUTMParams()
		expect(r).toMatchObject({
			utm_source: 'google',
			utm_medium: 'cpc',
			utm_campaign: 'institucional',
			utm_content: 'anuncio-x',
			utm_term: 'porsche a venda', // personalizado vence o kw
			utm_id: '111',
			adset_id: '222',
			ad_id: '333',
		})
		expect(r.matchtype).toBeTruthy()
		expect(r.device).toBeTruthy()
		expect(r.network).toBeTruthy()
	})

	it('mesma URL com os personalizados vazios ainda identifica tudo que importa', () => {
		// A campanha que ninguém configurou: sem nome, sem content, sem _term.
		// Ainda assim dá para dizer QUAL campanha, QUAL grupo, QUAL anúncio e
		// QUAL palavra — que é o ponto de somar os ValueTrack.
		montarDom(
			'?utm_source=google&utm_medium=cpc&utm_campaign=&utm_content=&utm_term=' +
			'&utm_id=444&adgroup_id=555&creative_id=666&kw=carro+de+luxo' +
			'&matchtype=b&device=c&network=s',
		)
		const r = collectUTMParams()
		expect(r.utm_campaign).toBeNull()
		expect(r.utm_id).toBe('444')
		expect(r.adset_id).toBe('555')
		expect(r.ad_id).toBe('666')
		expect(r.utm_term).toBe('carro de luxo')
	})
})
