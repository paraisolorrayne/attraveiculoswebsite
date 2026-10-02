import { describe, expect, it } from 'vitest'
import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { ESCOPO_TUDO } from '@/lib/visitors/escopo'

describe('periodoDaUrl', () => {
	it('exige o escopo: esquecer dele não pode virar "tudo" em silêncio', () => {
		// @ts-expect-error o escopo é obrigatório
		expect(() => periodoDaUrl('http://x/?dias=7')).toThrow(/escopo/)
	})

	it('com o escopo explícito lê os dias da URL', () => {
		expect(periodoDaUrl('http://x/?dias=7', ESCOPO_TUDO).dias).toBe(7)
	})
})
