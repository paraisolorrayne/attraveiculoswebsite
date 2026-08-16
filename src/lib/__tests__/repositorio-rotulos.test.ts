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

	// Lado oposto do "sobrescrita substitui por outra lista": a Attra pode
	// zerar um rótulo à mão (ex.: tirar 'liquidez' sem por nada no lugar).
	// Array vazio sobrescrito ainda vence a regra — não é "esqueceram de
	// preencher", é decisão.
	it('sobrescrita humana com arrays vazios ainda vence a regra', () => {
		const r = mesclar(DERIVADO, {
			uso: [], comprador: [], forca: [],
			prosa: 'texto da Attra', sobrescritoPor: 'cris@attra.com.br',
		})
		expect(r.uso).toEqual([])
		expect(r.comprador).toEqual([])
		expect(r.forca).toEqual([])
	})

	// A Attra pode corrigir os rótulos sem nunca ter escrito prosa. Sob
	// sobrescrita, prosa nula continua nula — não herda nada da regra.
	it('sobrescrita humana com prosa nula não inventa prosa', () => {
		const r = mesclar(DERIVADO, {
			uso: ['pista'], comprador: ['entusiasta'], forca: [],
			prosa: null, sobrescritoPor: 'cris@attra.com.br',
		})
		expect(r.uso).toEqual(['pista'])
		expect(r.prosa).toBeNull()
	})

	// string vazia não é null/undefined — não pode ser tratada como "sem
	// sobrescrita" por um `if (x)` que trata '' como falsy.
	it('sobrescritoPor como string vazia ainda conta como sobrescrita', () => {
		const r = mesclar(DERIVADO, {
			uso: ['colecao'], comprador: ['colecionador'], forca: ['exclusividade'],
			prosa: 'texto', sobrescritoPor: '',
		})
		expect(r.uso).toEqual(['colecao'])
		expect(r.sobrescritoPor).toBe('')
	})
})
