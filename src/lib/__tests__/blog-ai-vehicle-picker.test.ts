import { describe, it, expect } from 'vitest'
import type { Vehicle } from '@/types'
import {
	chavesUsadasRecentemente,
	escolherParParaComparativo,
	escolherVeiculoParaReview,
	vehicleKey,
} from '@/lib/blog-ai/vehicle-picker'

function v(id: string, brand: string, model: string, price: number, category = 'superesportivo'): Vehicle {
	return { id, brand, model, price, category, slug: `${brand}-${model}`.toLowerCase(), photos: ['x'] } as unknown as Vehicle
}

// Estoque parecido com o real de agosto/2026, em ordem de preço desc (como a
// AutoConf devolve): 4 superesportivos, 2 SUVs, 1 picape.
const ESTOQUE = [
	v('296', 'Ferrari', '296 GTS', 3_790_000),
	v('gts', 'McLaren', 'GTS', 3_500_000),
	v('sf90', 'Ferrari', 'SF90 Spider', 3_200_000),
	v('vantage', 'Aston Martin', 'Vantage', 2_690_000),
	v('g63', 'Mercedes-Benz', 'G 63 AMG', 1_490_000, 'suv'),
	v('urus', 'Lamborghini', 'Urus', 3_000_000, 'suv'),
	v('ram', 'RAM', '1500', 689_000, 'picape'),
]

describe('chavesUsadasRecentemente — comparativos também contam', () => {
	it('inclui os carros de reviews (car_review) E os de comparativos (ids no source)', () => {
		const usados = chavesUsadasRecentemente({
			reviews: [{ brand: 'Audi', model: 'Q5' }],
			comparativos: [{ vehicle_a_id: '296', vehicle_b_id: 'gts' }],
			elegiveis: ESTOQUE,
		})
		expect(usados.has('audi|q5')).toBe(true)
		expect(usados.has(vehicleKey(ESTOQUE[0]))).toBe(true) // ferrari|296 gts
		expect(usados.has(vehicleKey(ESTOQUE[1]))).toBe(true) // mclaren|gts
		expect(usados.has(vehicleKey(ESTOQUE[2]))).toBe(false)
	})

	it('id de comparativo que já saiu do estoque é ignorado sem quebrar', () => {
		const usados = chavesUsadasRecentemente({
			reviews: [], comparativos: [{ vehicle_a_id: 'sumiu', vehicle_b_id: null }], elegiveis: ESTOQUE,
		})
		expect(usados.size).toBe(0)
	})
})

describe('escolherParParaComparativo — o bug de agosto/2026', () => {
	it('REPRODUÇÃO: seis rodadas em dias alternados não podem repetir o mesmo par', () => {
		// Sem exclusão (como o código antigo, que ignorava comparativos), só a
		// rotação já tem que variar: com 4 superesportivos há 6 pares possíveis.
		const pares = new Set<string>()
		for (let dia = 20_000; dia < 20_012; dia += 2) {
			const par = escolherParParaComparativo(ESTOQUE, new Set(), dia)!
			pares.add([vehicleKey(par[0]), vehicleKey(par[1])].sort().join(' vs '))
		}
		expect(pares.size).toBeGreaterThanOrEqual(4)
	})

	it('carros usados nos últimos 60 dias ficam fora enquanto houver alternativa', () => {
		const usados = new Set([vehicleKey(ESTOQUE[0]), vehicleKey(ESTOQUE[1])]) // 296 e McLaren
		for (let dia = 0; dia < 10; dia++) {
			const par = escolherParParaComparativo(ESTOQUE, usados, dia)!
			for (const c of par) expect(usados.has(vehicleKey(c))).toBe(false)
		}
	})

	it('par é da mesma categoria e nunca o mesmo marca+modelo duas vezes', () => {
		for (let dia = 0; dia < 20; dia++) {
			const [a, b] = escolherParParaComparativo(ESTOQUE, new Set(), dia)!
			expect(a.category).toBe(b.category)
			expect(vehicleKey(a)).not.toBe(vehicleKey(b))
		}
	})

	it('com todo mundo usado recentemente, volta ao estoque inteiro em vez de devolver null', () => {
		const todos = new Set(ESTOQUE.map(vehicleKey))
		expect(escolherParParaComparativo(ESTOQUE, todos, 3)).not.toBeNull()
	})

	it('sem categoria com 2 modelos, junta os dois de preço mais próximo', () => {
		const misto = [v('a', 'A', '1', 1_000_000, 'x'), v('b', 'B', '2', 950_000, 'y'), v('c', 'C', '3', 400_000, 'z')]
		const par = escolherParParaComparativo(misto, new Set(), 0)!
		expect([par[0].id, par[1].id].sort()).toEqual(['a', 'b'])
	})

	it('menos de 2 carros: null', () => {
		expect(escolherParParaComparativo([ESTOQUE[0]], new Set(), 0)).toBeNull()
	})
})

describe('escolherVeiculoParaReview', () => {
	it('prefere carro não usado; só cai no pool inteiro quando nada sobra', () => {
		const usados = new Set(ESTOQUE.slice(0, 6).map(vehicleKey))
		expect(escolherVeiculoParaReview(ESTOQUE, usados, 7)!.id).toBe('ram')
		const todos = new Set(ESTOQUE.map(vehicleKey))
		expect(escolherVeiculoParaReview(ESTOQUE, todos, 7)).not.toBeNull()
	})
})
