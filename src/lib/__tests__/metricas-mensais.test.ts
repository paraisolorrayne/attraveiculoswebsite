import { describe, it, expect } from 'vitest'
import { resumirMes, mesesParaResumir, type LinhaCruaMes } from '@/lib/metricas-mensais'

const base: LinhaCruaMes = {
	mes: '2026-06-01',
	utm_source: null, utm_medium: null, utm_campaign: null,
	gclid: null, fbclid: null, ttclid: null, referrer_domain: null,
	sessoes: 0, visitantes: 0, page_views: 0, veiculos_vistos: 0,
	whatsapp_cliques: 0, formularios: 0, duracao_total_segundos: 0, sessoes_com_duracao: 0,
}

const linha = (over: Partial<LinhaCruaMes>): LinhaCruaMes => ({ ...base, ...over })

describe('resumirMes', () => {
	it('classifica canal a partir dos campos crus', () => {
		const [r] = resumirMes([linha({ utm_source: 'facebook', utm_medium: 'cpc', sessoes: 10 })])
		expect(r.canal).toBe('social_pago')
		expect(r.sessoes).toBe(10)
	})

	it('junta grafias diferentes da mesma fonte no mesmo canal', () => {
		// "Google" e "google" convivem na base real e não podem virar duas linhas.
		const resumo = resumirMes([
			linha({ utm_source: 'Google', utm_medium: 'cpc', sessoes: 6 }),
			linha({ utm_source: 'google', utm_medium: 'cpc', sessoes: 4 }),
		])
		expect(resumo).toHaveLength(1)
		expect(resumo[0].sessoes).toBe(10)
	})

	it('agrupa campanha ignorando caixa e exibe a grafia mais usada', () => {
		const resumo = resumirMes([
			linha({ utm_campaign: 'Black Friday', utm_source: 'google', utm_medium: 'cpc', sessoes: 9 }),
			linha({ utm_campaign: 'black friday', utm_source: 'google', utm_medium: 'cpc', sessoes: 2 }),
		])
		expect(resumo).toHaveLength(1)
		expect(resumo[0].campanha).toBe('Black Friday')
		expect(resumo[0].sessoes).toBe(11)
	})

	it('separa meses diferentes', () => {
		const resumo = resumirMes([
			linha({ mes: '2026-06-01', utm_source: 'google', utm_medium: 'cpc', sessoes: 3 }),
			linha({ mes: '2026-07-01', utm_source: 'google', utm_medium: 'cpc', sessoes: 5 }),
		])
		expect(resumo).toHaveLength(2)
		expect(resumo.map(r => r.mes).sort()).toEqual(['2026-06-01', '2026-07-01'])
	})

	it('soma todas as métricas, não só sessões', () => {
		const resumo = resumirMes([
			linha({ utm_source: 'google', utm_medium: 'cpc', sessoes: 2, page_views: 7, veiculos_vistos: 3, whatsapp_cliques: 1, formularios: 1, duracao_total_segundos: 120, sessoes_com_duracao: 2, visitantes: 2 }),
			linha({ utm_source: 'google', utm_medium: 'cpc', sessoes: 3, page_views: 5, veiculos_vistos: 2, whatsapp_cliques: 2, formularios: 0, duracao_total_segundos: 60, sessoes_com_duracao: 1, visitantes: 3 }),
		])
		expect(resumo[0]).toMatchObject({
			sessoes: 5, page_views: 12, veiculos_vistos: 5,
			whatsapp_cliques: 3, formularios: 1,
			duracao_total_segundos: 180, sessoes_com_duracao: 3, visitantes: 5,
		})
	})

	// A soma do resumo TEM que bater com o total bruto: é o número que sobra
	// depois que as sessões são apagadas, e ninguém poderá conferir depois.
	it('preserva o total de sessões do mês', () => {
		const cruas = [
			linha({ utm_source: 'facebook', utm_medium: 'cpc', sessoes: 6336 }),
			linha({ utm_source: 'Google', utm_medium: 'cpc', sessoes: 2887 }),
			linha({ sessoes: 6962 }),
			linha({ utm_source: 'ig', utm_medium: 'social', sessoes: 190 }),
			linha({ referrer_domain: 'chatgpt.com', sessoes: 9 }),
		]
		const total = cruas.reduce((s, l) => s + l.sessoes, 0)
		expect(resumirMes(cruas).reduce((s, r) => s + r.sessoes, 0)).toBe(total)
	})

	it('campanha ausente vira rótulo próprio em vez de sumir', () => {
		const [r] = resumirMes([linha({ utm_source: 'google', utm_medium: 'cpc', sessoes: 4 })])
		expect(r.campanha).toBeTruthy()
		expect(r.sessoes).toBe(4)
	})

	it('lista vazia devolve resumo vazio', () => {
		expect(resumirMes([])).toEqual([])
	})
})

describe('mesesParaResumir', () => {
	it('reduz datas ao primeiro dia do mês, sem repetir', () => {
		expect(mesesParaResumir(['2026-06-02T10:00:00Z', '2026-06-28T23:00:00Z', '2026-07-01T00:00:00Z']))
			.toEqual(['2026-06-01', '2026-07-01'])
	})

	it('ignora data inválida em vez de gerar mês quebrado', () => {
		expect(mesesParaResumir(['nada', '2026-08-15T12:00:00Z'])).toEqual(['2026-08-01'])
	})
})
