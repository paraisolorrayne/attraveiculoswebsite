import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/inventory-snapshot', () => ({
	appendVehicleToSnapshot: vi.fn(),
	loadLatestAdsHomeSnapshot: vi.fn(),
	loadLatestListSnapshot: vi.fn(),
	loadLatestVehicleSnapshot: vi.fn(),
	saveInventorySnapshot: vi.fn(),
	InventorySnapshotSources: { list: 'l', vehicle: 'v', adsHome: 'a' },
}))

type Bruto = Parameters<typeof import('@/lib/autoconf-api').mapAutoConfToVehicle>[0]

async function slugDe(campos: Record<string, unknown>) {
	const { mapAutoConfToVehicle } = await import('@/lib/autoconf-api')
	return mapAutoConfToVehicle({
		anofabricacao: '2023', km: 5600, valorvenda: '6300000', potencia: null, fotos: [],
		...campos,
	} as unknown as Bruto).slug
}

// 04/11/2026: com `marca_nome` nulo na AutoConf, a ficha já mostrava a marca
// (resolveBrand), mas o endereço saía sem ela: `/veiculo/812-2024-1154688`, a
// Ferrari 812 GTS na 3ª página do Google para "ferrari 812 gts".
describe('endereço da ficha com a marca', () => {
	it('marca_nome nulo: o endereço leva a marca resolvida (Ferrari 812)', async () => {
		expect(await slugDe({
			id: 1154688, marca_nome: null, marca_apelido: 'Ferrari', marca_slug: 'ferrari',
			modelopai_nome: '812', modelo_nome: 'GTS', anomodelo: '2024',
		})).toBe('ferrari-812-2024-1154688')
	})

	it('marca_nome nulo e sem apelido: vale a marca do slug da AutoConf (Ford F-150)', async () => {
		expect(await slugDe({
			id: 1121786, marca_nome: null, marca_apelido: null, marca_slug: 'ford',
			modelopai_nome: 'F-150', modelo_nome: 'Platinum', anomodelo: '2025',
		})).toBe('ford-f-150-2025-1121786')
	})

	it('com marca_nome preenchido o endereço não muda, mesmo com apelido diferente', async () => {
		expect(await slugDe({
			id: 1005152, marca_nome: 'Mercedes-Benz', marca_apelido: 'Mercedes', marca_slug: 'mercedes-benz',
			modelopai_nome: 'GLE 63s', modelo_nome: 'AMG', anomodelo: '2023',
		})).toBe('mercedes-benz-gle-63s-2023-1005152')
	})

	it('sem marca em lugar nenhum, o endereço sai como antes', async () => {
		expect(await slugDe({
			id: 7, marca_nome: null, marca_apelido: null, marca_slug: '',
			modelopai_nome: 'Modelo Desconhecido', modelo_nome: 'X', anomodelo: '2020',
		})).toBe('modelo-desconhecido-2020-7')
	})
})
