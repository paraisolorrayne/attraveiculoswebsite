import { describe, it, expect } from 'vitest'
import { categoriaDoPost, leiaTambem, marcasDoPost } from '@/lib/blog-categorias'
import type { BlogPostPreview } from '@/lib/blog-api'

const post = (slug: string, title: string, post_type: 'educativo' | 'car_review' = 'educativo', brand?: string) =>
	({ id: slug, slug, title, post_type, excerpt: '', featured_image: '', featured_image_alt: '', published_date: '', reading_time: '',
		car_review: brand ? { brand, model: '', year: 2024 } : undefined }) as BlogPostPreview

describe('categoriaDoPost', () => {
	it('educativo é artigo; review com "vs" é comparativo', () => {
		expect(categoriaDoPost(post('a', 'Blindagem em carro de luxo'))).toBe('artigos')
		expect(categoriaDoPost(post('b', 'Porsche 911 Turbo S 2023 Rosa', 'car_review'))).toBe('reviews')
		expect(categoriaDoPost(post('c', 'Mercedes-AMG G 63 vs GLE 63 S: Comparativo', 'car_review'))).toBe('comparativos')
		expect(categoriaDoPost(post('bmw-m8-vs-x6-m-6w92', 'BMW M8 e X6 M', 'car_review'))).toBe('comparativos')
	})
})

describe('marcasDoPost', () => {
	it('reconhece a marca do review e as do título', () => {
		expect([...marcasDoPost(post('a', 'Hummer H1 1985: um ícone militar'))]).toEqual(['hummer'])
		expect(marcasDoPost(post('b', 'Mercedes-AMG G 63 vs Range Rover Sport', 'car_review', 'Mercedes-Benz'))).toEqual(new Set(['mercedes-benz', 'land-rover']))
	})
})

describe('leiaTambem', () => {
	it('prefere a mesma marca, depois a mesma categoria, e nunca o próprio post', () => {
		const atual = post('hummer-h1', 'Hummer H1 1985: um ícone militar')
		const todos = [
			atual,
			post('ferrari-296', 'Ferrari 296 GTS 2025', 'car_review', 'Ferrari'),
			post('blindagem', 'Blindagem em carro de luxo'),
			post('hummer-ev', 'GMC Hummer EV: o ícone renascido'),
			post('seguro', 'Seguro para carros de alto valor'),
		]
		expect(leiaTambem(atual, todos).map(p => p.slug)).toEqual(['hummer-ev', 'blindagem', 'seguro'])
	})
})
