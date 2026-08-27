import { describe, it, expect } from 'vitest'
import { agruparPorCanal, agruparPorPagina, type GrupoEntrada } from '@/lib/visitors/entradas'

function g(p: Partial<GrupoEntrada> & { page_path: string; sessoes: number }): GrupoEntrada {
	return {
		page_type: null,
		vehicle_slug: null,
		utm_source: null,
		utm_medium: null,
		tem_gclid: false,
		tem_fbclid: false,
		tem_ttclid: false,
		referrer_domain: null,
		whatsapp: 0,
		formularios: 0,
		...p,
	}
}

const GRUPOS = [
	g({ page_path: '/', utm_source: 'google', utm_medium: 'cpc', sessoes: 40, whatsapp: 2 }),
	g({ page_path: '/', sessoes: 25 }),
	g({ page_path: '/', referrer_domain: 'linktr.ee', sessoes: 5, whatsapp: 1 }),
	g({ page_path: '/veiculo/porsche-911', page_type: 'vehicle', vehicle_slug: 'porsche-911', utm_source: 'facebook', utm_medium: 'cpc', sessoes: 30, whatsapp: 3 }),
	g({ page_path: '/veiculo/porsche-911', page_type: 'vehicle', vehicle_slug: 'porsche-911', utm_source: 'google', utm_medium: 'cpc', sessoes: 10 }),
]

describe('agruparPorPagina', () => {
	it('soma por página, separa por canal e lista as 3 fontes que mais trazem', () => {
		const linhas = agruparPorPagina(GRUPOS)
		expect(linhas.map(l => l.page_path)).toEqual(['/', '/veiculo/porsche-911'])
		expect(linhas[0]).toMatchObject({ sessoes: 70, whatsapp: 3, por_canal: { busca_paga: 40, direto: 25, social_organico: 5 } })
		expect(linhas[0].fontes.map(f => f.fonte)).toEqual(['google', '(sem fonte)', 'linktree'])
		expect(linhas[0].fontes[2].rotulo_fonte).toBe('Linktree (bio do Instagram)')
		expect(linhas[1].vehicle_slug).toBe('porsche-911')
	})

	it('respeita o limite', () => {
		expect(agruparPorPagina(GRUPOS, 1)).toHaveLength(1)
	})
})

describe('agruparPorCanal', () => {
	it('para cada canal, as páginas em que ele cai, da mais frequente para a menos', () => {
		const canais = agruparPorCanal(GRUPOS)
		const busca = canais.find(c => c.canal === 'busca_paga')!
		expect(busca.sessoes).toBe(50)
		expect(busca.paginas.map(p => p.page_path)).toEqual(['/', '/veiculo/porsche-911'])
		const social = canais.find(c => c.canal === 'social_pago')!
		expect(social.paginas[0]).toMatchObject({ page_path: '/veiculo/porsche-911', sessoes: 30, whatsapp: 3 })
	})

	it('ordena canais por sessões', () => {
		expect(agruparPorCanal(GRUPOS)[0].canal).toBe('busca_paga')
	})
})
