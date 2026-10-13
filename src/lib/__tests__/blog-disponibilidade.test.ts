import { describe, it, expect } from 'vitest'
import type { DualBlogPost, Vehicle } from '@/types'
import { corrigirLinksInternos, pedidoDoReview, situacaoDoReview, slugDaFicha } from '@/lib/blog-disponibilidade'
import { POSTS_CONSOLIDADOS } from '@/lib/blog-consolidacao'
import { lerSlug } from '@/lib/veiculos-semelhantes'

function v(slug: string): Vehicle {
	return { id: lerSlug(slug).id, slug, brand: 'Porsche', model: 'Panamera', price: 1, photos: [] } as unknown as Vehicle
}

function review(stock_url?: string): DualBlogPost {
	return {
		slug: 'r', post_type: 'car_review', content: '',
		car_review: { brand: 'Porsche', model: 'Panamera', year: 2025, availability: { in_stock: true, stock_url } },
	} as unknown as DualBlogPost
}

const ESTOQUE = [v('porsche-911-2023-993322'), v('ram-1500-2023-1056317')]

describe('situacaoDoReview — a disponibilidade sai do estoque, não do post', () => {
	it('REPRODUÇÃO: review gravado com in_stock=true de um carro que já saiu é "vendido"', () => {
		expect(situacaoDoReview(review('/veiculo/porsche-panamera-2025-885227'), ESTOQUE))
			.toEqual({ tipo: 'vendido', slug: 'porsche-panamera-2025-885227' })
	})

	it('carro ainda no estoque é "a_venda", casado pelo id mesmo com o slug reescrito', () => {
		const s = situacaoDoReview(review('/veiculo/porsche-911-carrera-2023-993322'), ESTOQUE)
		expect(s.tipo).toBe('a_venda')
		expect(s.tipo === 'a_venda' && s.veiculo.slug).toBe('porsche-911-2023-993322')
	})

	it('estoque que não carregou (null ou vazio) não vira "tudo vendido"', () => {
		expect(situacaoDoReview(review('/veiculo/porsche-911-2023-993322'), null).tipo).toBe('desconhecida')
		expect(situacaoDoReview(review('/veiculo/porsche-911-2023-993322'), []).tipo).toBe('desconhecida')
	})

	it('review sem ficha ligada é "sem_vinculo"', () => {
		expect(situacaoDoReview(review(undefined), ESTOQUE).tipo).toBe('sem_vinculo')
	})
})

describe('corrigirLinksInternos', () => {
	const vendido = (slug: string) => (slug === 'porsche-panamera-2025-885227' ? '#disponibilidade' : '/veiculos')

	it('REPRODUÇÃO: link do texto (absoluto, aspas simples) para ficha vendida deixa de apontar para o 404', () => {
		const html = "explore este ícone na <a href='https://attraveiculos.com.br/veiculo/porsche-panamera-2025-885227'>página do veículo</a>."
		expect(corrigirLinksInternos(html, ESTOQUE, vendido))
			.toBe("explore este ícone na <a href='#disponibilidade'>página do veículo</a>.")
	})

	it('outra ficha vendida (relativa, aspas duplas) vai para o estoque', () => {
		expect(corrigirLinksInternos('<a href="/veiculo/bmw-m8-2022-801175">M8</a>', ESTOQUE, vendido))
			.toBe('<a href="/veiculos">M8</a>')
	})

	it('ficha à venda fica, e slug antigo do mesmo carro vira o atual', () => {
		expect(corrigirLinksInternos('<a href="/veiculo/porsche-911-2023-993322">x</a>', ESTOQUE, vendido))
			.toBe('<a href="/veiculo/porsche-911-2023-993322">x</a>')
		expect(corrigirLinksInternos('<a href="/veiculo/porsche-911-turbo-2023-993322">x</a>', ESTOQUE, vendido))
			.toBe('<a href="/veiculo/porsche-911-2023-993322">x</a>')
	})

	it('não confunde /veiculos?marca= com ficha', () => {
		const html = '<a href="/veiculos?marca=porsche">Porsche</a>'
		expect(corrigirLinksInternos(html, ESTOQUE, vendido)).toBe(html)
	})

	it('estoque desconhecido não mexe nas fichas', () => {
		const html = '<a href="/veiculo/porsche-panamera-2025-885227">x</a>'
		expect(corrigirLinksInternos(html, null, vendido)).toBe(html)
	})

	it('link para post consolidado aponta direto para o que ficou', () => {
		const [duplicado, mantido] = Object.entries(POSTS_CONSOLIDADOS)[0]
		expect(corrigirLinksInternos(`<a href="https://attraveiculos.com.br/blog/${duplicado}">x</a>`, null, vendido))
			.toBe(`<a href="/blog/${mantido}">x</a>`)
	})
})

describe('slugs', () => {
	it('slugDaFicha aceita relativo e absoluto e recusa o resto', () => {
		expect(slugDaFicha('/veiculo/sf90-2024-1062018')).toBe('sf90-2024-1062018')
		expect(slugDaFicha('https://attraveiculos.com.br/veiculo/sf90-2024-1062018/')).toBe('sf90-2024-1062018')
		expect(slugDaFicha('/veiculos?marca=ferrari')).toBeNull()
		expect(slugDaFicha(undefined)).toBeNull()
	})

	it('pedidoDoReview monta o pedido sem confundir o ano com id', () => {
		expect(pedidoDoReview('Land Rover', 'Range Rover Sport', 2021))
			.toEqual({ prefixo: 'land-rover-range-rover-sport', ano: 2021, id: null })
		expect(pedidoDoReview('Mercedes-Benz', 'G 63', undefined)).toEqual({ prefixo: 'mercedes-benz-g-63', ano: null, id: null })
	})
})
