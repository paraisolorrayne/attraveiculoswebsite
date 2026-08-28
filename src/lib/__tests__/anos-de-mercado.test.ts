import { describe, it, expect } from 'vitest'
import { ANO_FUNDACAO, anosDeMercado } from '@/lib/constants'

describe('anosDeMercado — o número que aparece em "Anos de Mercado"', () => {
	it('em 2026 são 18 anos (2026 - 2008)', () => {
		expect(anosDeMercado(new Date('2026-08-28T12:00:00Z'))).toBe(18)
	})

	it('vira o ano junto com o calendário, sem esperar o aniversário', () => {
		expect(anosDeMercado(new Date('2026-12-31T23:00:00Z'))).toBe(18)
		expect(anosDeMercado(new Date('2027-01-01T09:00:00Z'))).toBe(19)
		expect(anosDeMercado(new Date('2030-06-15T09:00:00Z'))).toBe(22)
	})

	it('sem argumento usa a data de hoje — e o valor nunca é o número velho fixo (16)', () => {
		const agora = anosDeMercado()
		expect(agora).toBe(new Date().getFullYear() - 2008)
		expect(agora).toBeGreaterThanOrEqual(18)
	})

	it('o ano de fundação é 2008, confirmado pela Attra', () => {
		expect(ANO_FUNDACAO).toBe(2008)
	})
})
