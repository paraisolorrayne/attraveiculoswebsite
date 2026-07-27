import { describe, it, expect } from 'vitest'
import { buildLinkIndex, linkifyHtml } from '@/lib/blog-ai/internal-linker'
import type { DualBlogPost } from '@/types'

function post(partial: Record<string, unknown>): DualBlogPost {
	return { is_published: true, published_date: '2026-01-01', ...partial } as unknown as DualBlogPost
}

const acervo = [
	post({ slug: 'porsche-911-review', post_type: 'car_review', car_review: { brand: 'Porsche', model: '911', year: 2021 } }),
	post({ slug: 'guia-procedencia', post_type: 'educativo', educativo: { seo_keyword: 'procedência de supercarro' } }),
]

describe('linkifyHtml (backfill)', () => {
	it('linka termo do acervo no corpo do post', () => {
		const targets = buildLinkIndex(acervo, 'outro-post')
		const { html, linksAdded } = linkifyHtml('<p>O Porsche 911 é referência.</p>', targets)
		expect(linksAdded).toBe(1)
		expect(html).toContain('href="/blog/porsche-911-review"')
	})

	it('não linka dentro de link existente (idempotência)', () => {
		const targets = buildLinkIndex(acervo, 'outro-post')
		const once = linkifyHtml('<p>O Porsche 911 é referência.</p>', targets)
		const twice = linkifyHtml(once.html, targets)
		expect(twice.linksAdded).toBe(0)
		expect(twice.html).toBe(once.html)
	})

	it('respeita cap de links passado (total no post, não por rodada)', () => {
		const targets = buildLinkIndex(acervo, 'outro-post')
		const { linksAdded } = linkifyHtml('<p>Porsche 911 e procedência de supercarro.</p>', targets, 1)
		expect(linksAdded).toBe(1)
	})
})
