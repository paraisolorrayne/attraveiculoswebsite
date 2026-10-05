import { describe, expect, it } from 'vitest'
import { DIAS_MAX, DIAS_PADRAO, PERIODOS_VISITANTES, diasDaUrl } from '@/app/admin/visitors/periodos'
import * as servidor from '@/lib/visitors/sql-atribuicao'

describe('PERIODOS_VISITANTES', () => {
	it('o período de 1 dia diz o que é: as últimas 24 h corridas, não "hoje desde a meia-noite"', () => {
		expect(PERIODOS_VISITANTES[0]).toEqual({ dias: 1, label: 'Últimas 24 h' })
		expect(PERIODOS_VISITANTES.map(p => p.dias)).toEqual([1, 7, 15, 30, 0])
	})
})

describe('diasDaUrl', () => {
	it('"Tudo" (0) vale como 0, não cai no padrão', () => {
		expect(diasDaUrl('0')).toBe(0)
	})

	it('sem valor ou valor inválido cai no padrão de 30', () => {
		expect(diasDaUrl(null)).toBe(30)
		expect(diasDaUrl('')).toBe(30)
		expect(diasDaUrl('abc')).toBe(30)
		expect(diasDaUrl('-3')).toBe(30)
		expect(diasDaUrl('9999')).toBe(30)
	})

	it('lê 1, 7 e 90', () => {
		expect([diasDaUrl('1'), diasDaUrl('7'), diasDaUrl('90')]).toEqual([1, 7, 90])
	})
})

it('padrão e máximo iguais aos do servidor', () => {
	expect([DIAS_PADRAO, DIAS_MAX]).toEqual([servidor.DIAS_PADRAO, servidor.DIAS_MAX])
})
