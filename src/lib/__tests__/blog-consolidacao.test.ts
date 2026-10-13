import { describe, it, expect } from 'vitest'
import { POSTS_CONSOLIDADOS, postConsolidado } from '@/lib/blog-consolidacao'

describe('POSTS_CONSOLIDADOS', () => {
	const pares = Object.entries(POSTS_CONSOLIDADOS)

	it('o post que ficou nunca é ele mesmo redirecionado (sem cadeia nem laço)', () => {
		for (const [duplicado, mantido] of pares) {
			expect(mantido).not.toBe(duplicado)
			expect(postConsolidado(mantido)).toBe(false)
		}
	})

	it('slugs no formato de URL', () => {
		for (const slug of pares.flat()) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
	})

	it('não confunde propriedade herdada com slug', () => {
		expect(postConsolidado('constructor')).toBe(false)
		expect(postConsolidado('toString')).toBe(false)
	})
})
