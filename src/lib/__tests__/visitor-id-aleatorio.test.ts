import { describe, it, expect } from 'vitest'
import { createVisitorFingerprint, ehIdDerivadoDoAparelho } from '@/lib/visitor-tracking'

/**
 * A causa raiz da atribuição errada: o id do visitante vinha do hash das
 * características do aparelho, sem componente aleatório. Aparelhos iguais
 * geravam o MESMO id e viravam a mesma linha no banco — um único "dispositivo"
 * chegou a 1.705 sessões de pessoas diferentes em produção.
 */
describe('createVisitorFingerprint', () => {
	it('gera identificadores diferentes a cada chamada', () => {
		const ids = new Set(Array.from({ length: 500 }, () => createVisitorFingerprint()))
		expect(ids.size).toBe(500)
	})

	it('não produz o formato antigo (hash de 64 hex)', () => {
		for (let i = 0; i < 50; i++) {
			expect(ehIdDerivadoDoAparelho(createVisitorFingerprint())).toBe(false)
		}
	})

	it('gera id com entropia suficiente para não colidir por acaso', () => {
		expect(createVisitorFingerprint().length).toBeGreaterThanOrEqual(16)
	})
})

describe('ehIdDerivadoDoAparelho', () => {
	// Precisa reconhecer o id velho para trocá-lo; quem já visitou o site
	// carregaria para sempre o identificador compartilhado com estranhos.
	it('reconhece o hash SHA-256 do esquema antigo', () => {
		const antigo = 'a'.repeat(64)
		expect(ehIdDerivadoDoAparelho(antigo)).toBe(true)
		expect(ehIdDerivadoDoAparelho('3f7c1a92b4e5'.padEnd(64, '0'))).toBe(true)
	})

	it('tolera espaços em volta', () => {
		expect(ehIdDerivadoDoAparelho(`  ${'b'.repeat(64)}  `)).toBe(true)
	})

	it('não confunde UUID com o formato antigo', () => {
		expect(ehIdDerivadoDoAparelho('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(false)
	})

	it('não trata como antigo um texto de 64 caracteres que não seja hex', () => {
		expect(ehIdDerivadoDoAparelho('z'.repeat(64))).toBe(false)
	})

	it('ignora hash de tamanho diferente de 64', () => {
		expect(ehIdDerivadoDoAparelho('abc123')).toBe(false)
		expect(ehIdDerivadoDoAparelho('a'.repeat(63))).toBe(false)
		expect(ehIdDerivadoDoAparelho('a'.repeat(65))).toBe(false)
	})
})
