import { describe, it, expect } from 'vitest'
import { buildLinkIndex, linkifyHtml } from '@/lib/blog-ai/internal-linker'
import { ANCHOR_POST_SLUGS } from '@/lib/constants'
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

describe('proteção contra HTML corrompido', () => {
	it('não linka termo dentro de atributo de tag', () => {
		const targets = buildLinkIndex(acervo, 'outro-post')
		const input = '<img src="/x.jpg" alt="Porsche 911 azul"><p>texto sem o termo</p>'
		const { html, linksAdded } = linkifyHtml(input, targets)
		expect(linksAdded).toBe(0)
		expect(html).toBe(input)
	})

	it('não aninha âncora dentro de link recém-inserido na mesma passada', () => {
		const posts = [
			post({ slug: 'longo', post_type: 'educativo', educativo: { seo_keyword: 'procedência de supercarro premium' } }),
			post({ slug: 'curto', post_type: 'educativo', educativo: { seo_keyword: 'supercarro premium' } }),
		]
		const targets = buildLinkIndex(posts, 'x')
		const { html } = linkifyHtml('<p>Sobre procedência de supercarro premium no Brasil.</p>', targets)
		expect(html).not.toMatch(/<a[^>]*>[^<]*<a/)
	})

	it('não gasta dois slots com termos do mesmo post de destino', () => {
		const posts = [
			post({ slug: 'porsche-911-review', post_type: 'car_review', car_review: { brand: 'Porsche', model: '911', year: 2021, version: 'Turbo S' } }),
		]
		const targets = buildLinkIndex(posts, 'x')
		const { html, linksAdded } = linkifyHtml('<p>Porsche 911 Turbo S e de novo Porsche 911.</p>', targets)
		expect(linksAdded).toBe(1)
		expect((html.match(/blog-internal-link/g) || []).length).toBe(1)
	})
})

describe('boost de âncora', () => {
	it('âncora vence empate contra termo de mesmo comprimento', () => {
		const anchorSlug = ANCHOR_POST_SLUGS[0]
		const posts = [
			post({ slug: anchorSlug, post_type: 'educativo', educativo: { seo_keyword: 'baixa quilometragem' } }),
			post({ slug: 'comum', post_type: 'educativo', educativo: { seo_keyword: 'alta quilometragem' } }),
		]
		const targets = buildLinkIndex(posts, 'x')
		const anchorTarget = targets.find(t => t.url === `/blog/${anchorSlug}`)!
		const commonTarget = targets.find(t => t.url === '/blog/comum')!
		expect(anchorTarget.priority).toBeGreaterThan(commonTarget.priority)
	})

	it('com ordenação priority-first (backfill), âncora leva o único slot', () => {
		const anchorSlug = ANCHOR_POST_SLUGS[0]
		const posts = [
			post({ slug: anchorSlug, post_type: 'educativo', educativo: { seo_keyword: 'quilometragem' } }),
			post({ slug: 'comum', post_type: 'educativo', educativo: { seo_keyword: 'quilometragem baixa demais' } }),
		]
		// mesma ordenação usada em scripts/backfill-internal-links.ts
		const targets = buildLinkIndex(posts, 'x')
			.sort((a, b) => b.priority - a.priority || b.term.length - a.term.length)
		const { html, linksAdded } = linkifyHtml('<p>Sobre quilometragem baixa demais.</p>', targets, 1)
		expect(linksAdded).toBe(1)
		expect(html).toContain(`href="/blog/${anchorSlug}"`)
	})
})
