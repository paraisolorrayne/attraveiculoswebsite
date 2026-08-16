import { describe, it, expect } from 'vitest'
import { mesclar } from '@/lib/mcp/repositorio-rotulos'
import type { Rotulos } from '@/lib/mcp/rotulos'

const DERIVADO: Rotulos = { uso: ['familia'], comprador: ['executivo'], forca: [] }

describe('mesclar', () => {
	// O motivo de a tabela ser separada dos embeddings. Se a ressincronização
	// apagasse a correção da Attra, o trabalho manual sumiria toda madrugada.
	it('sobrescrita humana vence a regra', () => {
		const r = mesclar(DERIVADO, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: ['liquidez'],
			prosa: 'texto da Attra', sobrescritoPor: 'cris@attra.com.br',
		})
		expect(r.uso).toEqual(['fim-de-semana'])
		expect(r.forca).toContain('liquidez')
		expect(r.prosa).toBe('texto da Attra')
	})

	it('usa a regra quando não há sobrescrita', () => {
		const r = mesclar(DERIVADO, {
			uso: ['familia'], comprador: ['executivo'], forca: [],
			prosa: 'prosa gerada', sobrescritoPor: null,
		})
		expect(r.uso).toEqual(['familia'])
		expect(r.prosa).toBe('prosa gerada')
	})

	it('usa a regra quando não há nada gravado', () => {
		const r = mesclar(DERIVADO, undefined)
		expect(r.uso).toEqual(['familia'])
		expect(r.prosa).toBeNull()
		expect(r.sobrescritoPor).toBeNull()
	})
})
