import { describe, it, expect } from 'vitest'
import { buildBlogPostSchemas } from '@/lib/blog-schema'
import type { DualBlogPost } from '@/types'

// Post de avaliação marcado "em estoque" — o caso que o Search Console acusou
// em 61 posts: Offer sem price e sem priceCurrency (Listagens do comerciante e
// Snippets do produto, out/2026). Metade apontava para carro já vendido.
const review = {
	id: 'r1',
	post_type: 'car_review',
	title: 'Porsche 911 Turbo S 2023',
	slug: 'porsche-911-turbo-s-2023',
	excerpt: 'Resumo da avaliação.',
	content: '<p>texto</p>',
	featured_image: 'https://cdn.exemplo/capa.jpg',
	featured_image_alt: 'Porsche 911',
	author: { name: 'Attra Veículos' },
	published_date: '2026-07-01T00:00:00.000Z',
	reading_time: '6 min',
	is_published: true,
	car_review: {
		brand: 'Porsche',
		model: '911',
		year: 2023,
		version: 'Turbo S',
		color: 'Rosa',
		specs: { engine: '3.8 biturbo', power: '650 cv', torque: '', acceleration: '', top_speed: '330 km/h', transmission: 'PDK' },
		gallery_images: [],
		availability: { in_stock: true, price: 'R$ 1.900.000', stock_url: '/veiculo/porsche-911-2023-993322' },
	},
	seo: { meta_title: 't', meta_description: 'd', keywords: [] },
} as unknown as DualBlogPost

type Node = Record<string, unknown>

function collect(node: unknown, out: Node[] = []): Node[] {
	if (Array.isArray(node)) node.forEach(n => collect(n, out))
	else if (node && typeof node === 'object') {
		out.push(node as Node)
		Object.values(node).forEach(v => collect(v, out))
	}
	return out
}

describe('buildBlogPostSchemas — avaliação de carro', () => {
	const nodes = collect(buildBlogPostSchemas(review))

	it('não emite Offer: a oferta vive na ficha /veiculo, com preço ao vivo', () => {
		expect(nodes.filter(n => n['@type'] === 'Offer' || n['@type'] === 'AggregateOffer')).toEqual([])
	})

	it('não emite Vehicle solto (Product sem oferta) no topo da página', () => {
		const topo = buildBlogPostSchemas(review).map(s => s['@type'])
		expect(topo).not.toContain('Vehicle')
	})

	it('o carro avaliado leva a ficha técnica dentro do Review', () => {
		const reviewNode = buildBlogPostSchemas(review).find(s => s['@type'] === 'Review') as Node
		const item = reviewNode.itemReviewed as Node
		expect(item['@type']).toBe('Vehicle')
		expect(item.vehicleTransmission).toBe('PDK')
		expect(item.speed).toEqual({ '@type': 'QuantitativeValue', value: '330 km/h' })
		expect(item.vehicleEngine).toMatchObject({ '@type': 'EngineSpecification', enginePower: '650 cv' })
		expect(item).not.toHaveProperty('offers')
	})
})
