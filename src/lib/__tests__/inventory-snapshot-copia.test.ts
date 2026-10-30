import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A cópia de reserva por id (`autoconf:veiculos:byId`) é gravada a cada busca
 * bem-sucedida, e uma ficha faz várias. Com a busca por id funcionando de novo
 * (29/10/2026), cada visita gravaria uma linha nova com o estoque inteiro; só
 * grava quando o carro mudou. O jsonb devolve as chaves em outra ordem, então
 * a comparação não pode depender da ordem.
 */
const { gravadas, ultima } = vi.hoisted(() => ({
	gravadas: [] as unknown[],
	ultima: { payload: null as unknown },
}))

vi.mock('@/lib/db', () => {
	const consulta: Record<string, unknown> = new Proxy({}, {
		get: (_alvo, nome) =>
			nome === 'executeTakeFirst' ? async () => ultima
			: nome === 'execute' ? async () => []
			: () => consulta,
	})
	return {
		db: {
			selectFrom: () => consulta,
			deleteFrom: () => consulta,
			insertInto: () => ({ values: (linha: unknown) => ({ execute: async () => { gravadas.push(linha) } }) }),
		},
	}
})

beforeEach(() => {
	gravadas.length = 0
})

describe('appendVehicleToSnapshot', () => {
	it('carro igual ao da cópia, com as chaves em outra ordem: não grava', async () => {
		ultima.payload = { '1142317': { modelo_nome: 'S-63', id: 1142317, fotos: [{ url: 'a' }] } }
		const { appendVehicleToSnapshot } = await import('@/lib/inventory-snapshot')
		await appendVehicleToSnapshot(1142317, { id: 1142317, modelo_nome: 'S-63', fotos: [{ url: 'a' }] } as never)
		expect(gravadas).toHaveLength(0)
	})

	it('carro mudou: grava a cópia com ele', async () => {
		ultima.payload = { '1142317': { id: 1142317, valorvenda: '1500000' } }
		const { appendVehicleToSnapshot } = await import('@/lib/inventory-snapshot')
		await appendVehicleToSnapshot(1142317, { id: 1142317, valorvenda: '1450000' } as never)
		expect(gravadas).toHaveLength(1)
	})

	it('carro que não estava na cópia: grava', async () => {
		ultima.payload = { '1': { id: 1 } }
		const { appendVehicleToSnapshot } = await import('@/lib/inventory-snapshot')
		await appendVehicleToSnapshot(1142317, { id: 1142317 } as never)
		expect(gravadas).toHaveLength(1)
	})
})
