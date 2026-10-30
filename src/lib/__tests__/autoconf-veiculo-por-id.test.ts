import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { guardarCopia } = vi.hoisted(() => ({ guardarCopia: vi.fn() }))

vi.mock('@/lib/inventory-snapshot', () => ({
	appendVehicleToSnapshot: guardarCopia,
	loadLatestAdsHomeSnapshot: vi.fn(async () => null),
	loadLatestListSnapshot: vi.fn(async () => null),
	loadLatestVehicleSnapshot: vi.fn(async () => null),
	saveInventorySnapshot: vi.fn(),
	InventorySnapshotSources: { list: 'l', vehicle: 'v', adsHome: 'a' },
}))

/**
 * `POST /veiculo` da AutoConf. Até outubro de 2026 o carro vinha dentro de
 * `{ veiculo: {...} }`; em 29/10/2026, conferido da VPS, vem direto
 * (`{"id":1142317,"modelo_id":2218656,...}`). O site só lia o envelope: recebia
 * null sem erro nenhum, caía na lista (que não traz a Descrição Customizada) e
 * a ficha do molde saía vazia em todo carro; `/api/vehicles/{id}` dava 404.
 */
const S63 = {
	id: 1142317,
	modelo_id: 2218656,
	modelo_nome: 'S-63 AMG S E Performance Aut. (Híbrido)',
	modelopai_nome: 'S-63',
	marca_nome: 'Mercedes',
	anofabricacao: '2025',
	anomodelo: '2025',
	km: 1200,
	valorvenda: '1500000',
	potencia: null,
	cor_nome: 'Prata',
	fotos: [],
	acessorios: [{ nome: 'Blindado' }],
	acessorios_destaque: [],
	descricao: ['MOTOR: 4.0 V8 Biturbo Híbrido', 'POTÊNCIA: 802 cv', 'TORQUE: 145,8 kgfm'].join('\n'),
}

function responder(corpo: unknown, status = 200) {
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })))
}

beforeEach(() => {
	guardarCopia.mockClear()
	vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('fetchAutoConfVehicleById — formato da resposta da AutoConf', () => {
	it('o carro direto, como a AutoConf responde hoje', async () => {
		responder(S63)
		const { fetchAutoConfVehicleById } = await import('@/lib/autoconf-api')
		const veiculo = await fetchAutoConfVehicleById(1142317)
		expect(veiculo?.id).toBe(1142317)
		expect(veiculo?.descricao).toContain('MOTOR:')
		expect(guardarCopia).toHaveBeenCalledWith(1142317, expect.objectContaining({ id: 1142317 }))
	})

	it('o envelope antigo, { veiculo }, segue valendo', async () => {
		responder({ veiculo: S63 })
		const { fetchAutoConfVehicleById } = await import('@/lib/autoconf-api')
		expect((await fetchAutoConfVehicleById(1142317))?.id).toBe(1142317)
	})

	it('corpo de erro com 200 não vira carro nem cópia', async () => {
		responder({ detail: [{ type: 'model_attributes_type', msg: 'Input should be a valid dictionary' }] })
		const { fetchAutoConfVehicleById } = await import('@/lib/autoconf-api')
		expect(await fetchAutoConfVehicleById(1142317)).toBeNull()
		expect(guardarCopia).not.toHaveBeenCalled()
	})

	it('403 continua devolvendo null', async () => {
		responder({}, 403)
		const { fetchAutoConfVehicleById } = await import('@/lib/autoconf-api')
		expect(await fetchAutoConfVehicleById(1142317)).toBeNull()
	})
})

describe('getVehicleBySlug com a resposta de hoje', () => {
	it('só o id, como o agente de atendimento chama, traz a ficha do molde', async () => {
		responder(S63)
		const { getVehicleBySlug } = await import('@/lib/autoconf-api')
		const vehicle = await getVehicleBySlug('1142317')
		expect(vehicle?.ficha?.torque).toBe('145,8 kgfm')
		expect(vehicle?.horsepower).toBe(802)
	})

	it('o slug da ficha também', async () => {
		responder(S63)
		const { getVehicleBySlug } = await import('@/lib/autoconf-api')
		expect((await getVehicleBySlug('mercedes-s-63-2025-1142317'))?.ficha?.motor).toBe('4.0 V8 Biturbo Híbrido')
	})
})

describe('getRelatedVehicles', () => {
	it('segue com os parecidos do estoque, sem buscar as sugestões da AutoConf por id', async () => {
		const outro = { ...S63, id: 2, modelo_nome: 'S-580', modelopai_nome: 'S-580', descricao: undefined }
		const chamadas: string[] = []
		vi.stubGlobal('fetch', vi.fn(async (url: string) => {
			chamadas.push(url)
			const corpo = url.endsWith('/veiculos')
				? { veiculos: [S63, outro], total: 2 }
				: { ...S63, sugestoes: [2] }
			return new Response(JSON.stringify(corpo), { status: 200 })
		}))
		const { getRelatedVehicles, mapAutoConfToVehicle } = await import('@/lib/autoconf-api')
		const similares = await getRelatedVehicles(mapAutoConfToVehicle(S63 as never), 4)
		expect(similares.map(v => v.id)).toEqual(['2'])
		expect(chamadas.some(u => u.endsWith('/veiculo'))).toBe(false)
	})
})
