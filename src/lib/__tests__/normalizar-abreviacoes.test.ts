import { describe, it, expect } from 'vitest'
import { expandirAbreviacoes } from '@/lib/normalizar-abreviacoes'

describe('expandirAbreviacoes', () => {
	// As duas que a Attra apontou explicitamente.
	it('expande as duas pedidas', () => {
		expect(expandirAbreviacoes('BI-TB')).toBe('Bi-Turbo')
		expect(expandirAbreviacoes('Aut.')).toBe('Automático')
	})

	// Strings reais do estoque de 16/08/2026 — não inventadas.
	it('limpa as versões reais do estoque', () => {
		expect(expandirAbreviacoes('RS6 Avant TFSI BI-TB Quat.Tip.'))
			.toBe('RS6 Avant TFSI Bi-Turbo Quattro Tiptronic')
		expect(expandirAbreviacoes('1500 LARAM. NIGHT ED. BI-TB 4x4 Aut.'))
			.toBe('1500 Laramie NIGHT Edition Bi-Turbo 4x4 Automático')
		expect(expandirAbreviacoes('X6 M Competition V8 BI-TB 625CV Aut.'))
			.toBe('X6 M Competition V8 Bi-Turbo 625CV Automático')
		expect(expandirAbreviacoes('Defender 110 X D350 Die.'))
			.toBe('Defender 110 X D350 Diesel')
		expect(expandirAbreviacoes('Discov. Metrop. Edt. 4x4 Die.'))
			.toBe('Discovery Metropolitan Edition 4x4 Diesel')
		expect(expandirAbreviacoes('CLA-35 AMG 4MATIC TB Aut.'))
			.toBe('CLA-35 AMG 4MATIC Turbo Automático')
	})

	// A ordem é o que faz isso funcionar: composta antes de simples.
	it('resolve Bi-TB antes da regra de TB', () => {
		expect(expandirAbreviacoes('M3 Competition M Bi-TB 510cv')).toBe('M3 Competition M Bi-Turbo 510cv')
		expect(expandirAbreviacoes('Bi-TB')).not.toContain('Bi-Turboturbo')
	})

	// Sem fronteira de palavra a normalização estraga mais do que conserta.
	it('não casa dentro de outra palavra', () => {
		expect(expandirAbreviacoes('4MATIC')).toBe('4MATIC')
		expect(expandirAbreviacoes('GLC 220D TB 4M Off-Road')).toBe('GLC 220D Turbo 4Matic Off-Road')
		expect(expandirAbreviacoes('TDI')).toBe('TDI')
		expect(expandirAbreviacoes('TBI')).toBe('TBI')
	})

	// Sigla que o comprador já lê como nome não vira ruído.
	it('deixa em paz o que já é legível', () => {
		for (const sigla of ['4x4', 'AWD', 'TFSI', 'GTS', 'AMG', 'V8', 'S-tronic']) {
			expect(expandirAbreviacoes(sigla), sigla).toBe(sigla)
		}
	})

	it('aguenta entrada vazia', () => {
		expect(expandirAbreviacoes('')).toBe('')
		expect(expandirAbreviacoes(null)).toBe('')
		expect(expandirAbreviacoes(undefined)).toBe('')
	})

	it('não deixa espaço duplo quando a expansão muda o tamanho', () => {
		expect(expandirAbreviacoes('Aut.  Die.')).toBe('Automático Diesel')
	})
})
