import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	__resetParaTeste,
	buscaSegura,
	trackVehicle,
	valorEmReais,
	vehicleIdFromPath,
	vehicleIdFromSlug,
} from '@/lib/meta-pixel'

const PIXEL_ID = '1228434935031776'

/** As chamadas que chegaram ao `fbq`, já separadas em evento + parâmetros. */
interface Chamada {
	evento: string
	params: Record<string, unknown>
}

function instalarPixel(): Chamada[] {
	const chamadas: Chamada[] = []
	;(globalThis as { window?: unknown }).window = {
		fbq: (...args: unknown[]) => {
			expect(args[0]).toBe('trackSingle')
			expect(args[1]).toBe(PIXEL_ID)
			chamadas.push({ evento: args[2] as string, params: (args[3] ?? {}) as Record<string, unknown> })
		},
	}
	return chamadas
}

/** Página sem pixel: é o estado antes de o GTM publicar o `fbq`. */
function instalarSemPixel(): void {
	;(globalThis as { window?: unknown }).window = {}
}

beforeEach(() => {
	__resetParaTeste()
})

afterEach(() => {
	delete (globalThis as { window?: unknown }).window
	vi.useRealTimers()
})

describe('vehicleIdFromSlug', () => {
	it('tira o vehicle_id do slug, que é o do catálogo', () => {
		// Os três pares conferidos no diagnóstico de 27/09.
		expect(vehicleIdFromSlug('mercedes-g-63-2019-1006232')).toBe('1006232')
		expect(vehicleIdFromSlug('porsche-cayenne-2023-1006120')).toBe('1006120')
		expect(vehicleIdFromSlug('porsche-911-2025-1019207')).toBe('1019207')
	})

	it('não confunde designação de modelo nem ano com id', () => {
		// Sem piso de dígitos, estes devolveriam 63, 911 e 2019 — ids que não
		// existem no feed, e correspondência tentada que falha é pior que evento
		// de fora da conta.
		expect(vehicleIdFromSlug('mercedes-g-63')).toBeNull()
		expect(vehicleIdFromSlug('porsche-911')).toBeNull()
		expect(vehicleIdFromSlug('mercedes-g-63-2019')).toBeNull()
		expect(vehicleIdFromSlug('')).toBeNull()
	})
})

describe('vehicleIdFromPath', () => {
	it('lê o id na ficha do veículo, com ou sem barra no fim', () => {
		expect(vehicleIdFromPath('/veiculo/mercedes-g-63-2019-1006232')).toBe('1006232')
		expect(vehicleIdFromPath('/veiculo/porsche-911-2025-1019207/')).toBe('1019207')
	})

	it('ignora qualquer caminho que não seja ficha de veículo', () => {
		// O ouvinte de WhatsApp roda no site inteiro: sem a âncora em /veiculo/,
		// o ano no fim do título de um post viraria "o veículo 2025".
		expect(vehicleIdFromPath('/blog/top-10-suvs-2025')).toBeNull()
		expect(vehicleIdFromPath('/veiculos')).toBeNull()
		expect(vehicleIdFromPath('/')).toBeNull()
		expect(vehicleIdFromPath('/veiculo/mercedes-g-63-2019-1006232/fotos')).toBeNull()
	})
})

describe('trackVehicle', () => {
	it('manda content_type vehicle e content_ids como array de strings', () => {
		const chamadas = instalarPixel()
		trackVehicle('ViewContent', ['1006232'], { value: 335000, currency: 'BRL' })

		expect(chamadas).toHaveLength(1)
		expect(chamadas[0].evento).toBe('ViewContent')
		expect(chamadas[0].params).toEqual({
			content_type: 'vehicle',
			content_ids: ['1006232'],
			value: 335000,
			currency: 'BRL',
		})
	})

	it('converte id numérico em string — o feed publica texto', () => {
		const chamadas = instalarPixel()
		trackVehicle('AddToWishlist', [1006232])
		expect(chamadas[0].params.content_ids).toEqual(['1006232'])
	})

	it('não dispara sem id: evento vazio é o defeito que estamos consertando', () => {
		const chamadas = instalarPixel()
		trackVehicle('ViewContent', [])
		trackVehicle('ViewContent', [null, undefined, ''])
		expect(chamadas).toHaveLength(0)
	})

	it('descarta os ids vazios e mantém os bons', () => {
		const chamadas = instalarPixel()
		trackVehicle('Search', ['1006232', null, '1006120'], { search_string: 'porsche' })
		expect(chamadas[0].params.content_ids).toEqual(['1006232', '1006120'])
	})

	it('só um ViewContent por ficha, mesmo com o efeito rodando duas vezes', () => {
		// StrictMode do React monta todo efeito duas vezes em desenvolvimento.
		const chamadas = instalarPixel()
		trackVehicle('ViewContent', ['1006232'])
		trackVehicle('ViewContent', ['1006232'])
		expect(chamadas).toHaveLength(1)
	})

	it('trocar de veículo sem recarregar gera um novo ViewContent', () => {
		const chamadas = instalarPixel()
		trackVehicle('ViewContent', ['1006232'])
		trackVehicle('ViewContent', ['1006120'])
		expect(chamadas.map(c => c.params.content_ids)).toEqual([['1006232'], ['1006120']])
	})

	it('voltar para um veículo já visto conta de novo', () => {
		// A → B → A são duas visualizações de A, não uma.
		const chamadas = instalarPixel()
		trackVehicle('ViewContent', ['1006232'])
		trackVehicle('ViewContent', ['1006120'])
		trackVehicle('ViewContent', ['1006232'])
		expect(chamadas).toHaveLength(3)
	})

	it('não repete o mesmo Search — o efeito da listagem roda duas vezes no StrictMode', () => {
		const chamadas = instalarPixel()
		trackVehicle('Search', ['988028', '789896'], { search_string: 'porsche' })
		trackVehicle('Search', ['988028', '789896'], { search_string: 'porsche' })
		expect(chamadas).toHaveLength(1)
	})

	it('busca nova, com outro resultado, dispara de novo', () => {
		const chamadas = instalarPixel()
		trackVehicle('Search', ['988028'], { search_string: 'porsche' })
		trackVehicle('Search', ['990053'], { search_string: 'fiat' })
		expect(chamadas).toHaveLength(2)
	})

	it('a trava de repetição vale só para ViewContent e Search', () => {
		// Dois leads do mesmo carro são dois leads.
		const chamadas = instalarPixel()
		trackVehicle('Lead', ['1006232'])
		trackVehicle('Lead', ['1006232'])
		expect(chamadas).toHaveLength(2)
	})
})

describe('trackVehicle antes de o GTM publicar o fbq', () => {
	it('segura o evento e dispara quando o pixel aparece', () => {
		vi.useFakeTimers()
		instalarSemPixel()

		trackVehicle('ViewContent', ['1006232'])
		vi.advanceTimersByTime(1000)

		// O pixel chega depois — é o caso de quem entra pelo anúncio numa conexão lenta.
		const chamadas = instalarPixel()
		vi.advanceTimersByTime(400)

		expect(chamadas).toHaveLength(1)
		expect(chamadas[0].params.content_ids).toEqual(['1006232'])
	})

	it('desiste depois de 10s em vez de contar uma visita que já acabou', () => {
		vi.useFakeTimers()
		instalarSemPixel()

		trackVehicle('ViewContent', ['1006232'])
		vi.advanceTimersByTime(11_000)

		const chamadas = instalarPixel()
		vi.advanceTimersByTime(5_000)
		expect(chamadas).toHaveLength(0)
	})
})

describe('valorEmReais', () => {
	it('manda value e currency quando há preço', () => {
		expect(valorEmReais(335000)).toEqual({ value: 335000, currency: 'BRL' })
	})

	it('aceita preço em texto, como vem de alguns campos do estoque', () => {
		expect(valorEmReais('335000')).toEqual({ value: 335000, currency: 'BRL' })
		expect(valorEmReais('R$ 335000')).toEqual({ value: 335000, currency: 'BRL' })
	})

	it('omite o valor em vez de mandar zero', () => {
		// value: 0 é número válido para a Meta e rebaixaria o retorno médio.
		expect(valorEmReais(0)).toEqual({})
		expect(valorEmReais(null)).toEqual({})
		expect(valorEmReais(undefined)).toEqual({})
		expect(valorEmReais('sob consulta')).toEqual({})
		expect(valorEmReais(-1)).toEqual({})
	})
})

describe('buscaSegura', () => {
	it('passa o termo normal', () => {
		expect(buscaSegura('porsche cayenne')).toEqual({ search_string: 'porsche cayenne' })
	})

	it('recusa o que parece dado pessoal', () => {
		// Campo de busca é texto livre, e a regra da Meta proíbe PII nos parâmetros.
		expect(buscaSegura('fulano@exemplo.com')).toEqual({})
		expect(buscaSegura('11 98765-4321')).toEqual({})
	})

	it('omite em vez de mandar vazio', () => {
		expect(buscaSegura('')).toEqual({})
		expect(buscaSegura('   ')).toEqual({})
		expect(buscaSegura(null)).toEqual({})
	})

	it('corta termo gigante', () => {
		const busca = buscaSegura('a'.repeat(500))
		expect((busca.search_string as string).length).toBe(100)
	})
})
