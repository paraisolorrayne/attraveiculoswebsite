import { describe, it, expect, vi } from 'vitest'
import { mesclar, lerRotulos } from '@/lib/mcp/repositorio-rotulos'
import type { Rotulos } from '@/lib/mcp/rotulos'

const DERIVADO: Rotulos = { uso: ['familia'], comprador: ['executivo'], forca: [] }

// `linhasMock.valor` é lido dentro do factory de `vi.mock` abaixo — precisa
// ser criado com `vi.hoisted` porque `vi.mock` é hoisted para o topo do
// arquivo pelo Vitest, antes de qualquer `const` normal deste módulo existir.
const { linhasMock } = vi.hoisted(() => ({ linhasMock: { valor: [] as unknown[] } }))

vi.mock('@/lib/db', () => ({
	db: {
		selectFrom: () => ({
			selectAll: () => ({
				where: () => ({
					execute: async () => linhasMock.valor,
				}),
			}),
		}),
	},
}))

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

describe('lerRotulos — vocabulário fechado na leitura (Conserto 4)', () => {
	// A tela de admin ficou fora de escopo, então a correção da Attra hoje é
	// `UPDATE` na mão no banco — sem essa filtragem, um rótulo digitado
	// errado entra direto no `Map` devolvido e, via `legivel()` caindo no
	// fallback `?? r`, vaza o slug cru pro texto indexado, em silêncio.
	it('descarta rótulo que não pertence ao vocabulário de cada eixo', async () => {
		linhasMock.valor = [{
			vehicle_id: 1,
			rotulos_uso: ['familia', 'rotulo-digitado-errado'],
			rotulos_comprador: ['executivo', 'outro-typo'],
			rotulos_forca: ['espaco'],
			prosa: null,
			sobrescrito_por: null,
		}]

		const mapa = await lerRotulos([1])
		const r = mapa.get(1)

		expect(r?.uso).toEqual(['familia'])
		expect(r?.comprador).toEqual(['executivo'])
		expect(r?.forca).toEqual(['espaco'])
	})

	// O lado oposto necessário: uma linha só com rótulos válidos não pode
	// perder nada na filtragem — senão o teste acima não provaria que é o
	// rótulo INVÁLIDO sendo descartado, e sim que tudo é descartado.
	it('mantém intactos os rótulos que pertencem ao vocabulário', async () => {
		linhasMock.valor = [{
			vehicle_id: 2,
			rotulos_uso: ['familia', 'viagem', 'urbano'],
			rotulos_comprador: ['executivo', 'familia'],
			rotulos_forca: ['baixa-quilometragem', 'espaco'],
			prosa: 'prosa válida',
			sobrescrito_por: null,
		}]

		const mapa = await lerRotulos([2])
		const r = mapa.get(2)

		expect(r?.uso).toEqual(['familia', 'viagem', 'urbano'])
		expect(r?.comprador).toEqual(['executivo', 'familia'])
		expect(r?.forca).toEqual(['baixa-quilometragem', 'espaco'])
		expect(r?.prosa).toBe('prosa válida')
	})
})
