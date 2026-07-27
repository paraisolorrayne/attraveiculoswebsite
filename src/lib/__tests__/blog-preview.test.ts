import { describe, it, expect } from 'vitest'
import { toPreview } from '@/lib/blog-api'
import type { DualBlogPost } from '@/types'

const fullPost = {
	id: 'x1',
	post_type: 'car_review',
	title: 'Porsche 911 Turbo S 2021',
	slug: 'porsche-911-turbo-s-2021',
	excerpt: 'Resumo curto.',
	content: '<p>' + 'conteudo enorme '.repeat(500) + '</p>',
	featured_image: '/images/blog/capa.jpg',
	featured_image_alt: 'Porsche 911 azul',
	author: { name: 'Attra Veículos' },
	published_date: '2026-07-01T00:00:00.000Z',
	reading_time: '6 min',
	is_published: true,
	car_review: { brand: 'Porsche', model: '911', year: 2021, version: 'Turbo S' },
	seo: { meta_title: 't', meta_description: 'd' },
} as unknown as DualBlogPost

describe('toPreview', () => {
	it('remove content e seo, preserva campos do card', () => {
		const p = toPreview(fullPost)
		expect(p).not.toHaveProperty('content')
		expect(p).not.toHaveProperty('seo')
		expect(p.slug).toBe('porsche-911-turbo-s-2021')
		expect(p.title).toBe('Porsche 911 Turbo S 2021')
		expect(p.excerpt).toBe('Resumo curto.')
		expect(p.featured_image).toBe('/images/blog/capa.jpg')
		expect(p.reading_time).toBe('6 min')
		expect(p.car_review).toEqual({ brand: 'Porsche', model: '911', year: 2021, version: 'Turbo S' })
	})

	it('preserva categoria de post educativo', () => {
		const edu = {
			...fullPost,
			post_type: 'educativo',
			car_review: undefined,
			educativo: { category: 'Curadoria', seo_keyword: 'procedência de supercarro' },
		} as unknown as DualBlogPost
		const p = toPreview(edu)
		expect(p.educativo).toEqual({ category: 'Curadoria', seo_keyword: 'procedência de supercarro' })
		expect(p.car_review).toBeUndefined()
	})
})
