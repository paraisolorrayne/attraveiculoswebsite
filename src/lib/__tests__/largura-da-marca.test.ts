import { describe, it, expect } from 'vitest'
import { larguraDaMarca } from '@/lib/largura-da-marca'

// Tinta real de cada nome (borda esquerda da primeira letra à borda direita da
// última), em em, medida no Chrome com a Geist 900 e tracking de -0,05em.
const TINTA_MEDIDA: Record<string, number> = {
	LAMBORGHINI: 6.689,
	'ASTON MARTIN': 7.179,
	FERRARI: 4.009,
	MERCEDES: 5.251,
	MCLAREN: 4.666,
	PORSCHE: 4.564,
	'ROLLS-ROYCE': 6.573,
	'LAND ROVER': 5.979,
	BMW: 2.483,
	'MERCEDES-BENZ': 8.157,
	'LYNK & CO': 4.803,
}

describe('largura do nome da marca', () => {
	it('soma o avanço das letras com o tracking entre elas', () => {
		expect(larguraDaMarca('LAMBORGHINI')).toBe(6.924)
		expect(larguraDaMarca('Aston Martin')).toBe(7.461)
	})

	it('nunca dá menos que a tinta real, para nenhuma letra ficar de fora da tela', () => {
		for (const [marca, tinta] of Object.entries(TINTA_MEDIDA)) {
			expect(larguraDaMarca(marca), marca).toBeGreaterThanOrEqual(tinta)
		}
	})

	it('não diferencia maiúscula, minúscula nem acento', () => {
		expect(larguraDaMarca('Mclaren')).toBe(larguraDaMarca('MCLAREN'))
		expect(larguraDaMarca('Citroën')).toBe(larguraDaMarca('CITROEN'))
	})

	it('caractere fora da tabela conta como letra larga', () => {
		expect(larguraDaMarca('Ø')).toBeGreaterThanOrEqual(larguraDaMarca('O'))
	})

	it('marca vazia não tem largura', () => {
		expect(larguraDaMarca('')).toBe(0)
		expect(larguraDaMarca('   ')).toBe(0)
	})
})
