import { describe, it, expect } from 'vitest'
import type { Vehicle } from '@/types'
import {
	chaveDoPar,
	chavesDoExemplar,
	chavesUsadasRecentemente,
	escolherParParaComparativo,
	escolherVeiculoParaReview,
	jaResenhado,
	paresJaFeitos,
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

describe('nunca dois reviews do mesmo carro — o bug de outubro/2026', () => {
	// Em 13/10/2026: 3 reviews do mesmo Corvette Z06 preto, 2 do mesmo 911 Turbo S
	// rosa (id 993322) e 2 do mesmo RAM 1500 amarelo.
	const corvette = { ...v('1100', 'Chevrolet', 'Corvette Z06', 1_200_000), year_model: 2023, color: 'Preto' } as Vehicle
	const ram = { ...v('1056317', 'RAM', '1500', 689_000, 'picape'), year_model: 2023, color: 'Amarelo' } as Vehicle

	it('REPRODUÇÃO: com todo o estoque já usado nos 60 dias, o código antigo repetia um carro já resenhado', () => {
		const usadosTodos = new Set([corvette, ram].map(vehicleKey))
		const resenhados = new Set(chavesDoExemplar({ id: '1100', brand: 'Chevrolet', model: 'Corvette Z06', year: 2023, color: 'Preto' }))
		for (let i = 0; i < 6; i++) {
			const escolhido = escolherVeiculoParaReview([corvette, ram], usadosTodos, i, resenhados)
			expect(escolhido?.id).toBe('1056317')
		}
	})

	it('sem carro inédito devolve null (o job tenta o comparativo)', () => {
		const resenhados = new Set([...chavesDoExemplar({ id: '1100' }), ...chavesDoExemplar({ id: '1056317' })])
		expect(escolherVeiculoParaReview([corvette, ram], new Set(), 0, resenhados)).toBeNull()
	})

	it('o mesmo carro recadastrado com outro id continua reconhecido (marca|modelo|ano|cor)', () => {
		const resenhados = new Set(chavesDoExemplar({ id: '999', brand: 'RAM', model: '1500', year: 2023, color: 'Amarelo' }))
		expect(jaResenhado(ram, resenhados)).toBe(true)
		const outraCor = { ...ram, id: '2000', color: 'Preto' } as Vehicle
		expect(jaResenhado(outraCor, resenhados)).toBe(false)
	})
})

describe('par de comparativo nunca se repete', () => {
	it('"McLaren GTS vs Ferrari 296 GTS" é o mesmo par que "Ferrari 296 GTS vs McLaren GTS"', () => {
		expect(chaveDoPar('mclaren|gts', 'ferrari|296 gts')).toBe(chaveDoPar('ferrari|296 gts', 'mclaren|gts'))
	})

	it('pares já publicados ficam fora em todas as rodadas, mesmo com todos os carros "usados"', () => {
		const feitos = paresJaFeitos([{ vehicle_a_id: '296', vehicle_b_id: 'gts' }, { vehicle_a_id: 'sf90', vehicle_b_id: 'gts' }], ESTOQUE)
		const todos = new Set(ESTOQUE.map(vehicleKey))
		for (let i = 0; i < 20; i++) {
			const [a, b] = escolherParParaComparativo(ESTOQUE, todos, i, feitos)!
			expect(feitos.has(chaveDoPar(vehicleKey(a), vehicleKey(b)))).toBe(false)
		}
	})

	it('as chaves gravadas no source valem mesmo se o carro mudou de id', () => {
		const feitos = paresJaFeitos([{ vehicle_a_id: 'id-antigo', vehicle_a_key: 'ferrari|296 gts', vehicle_b_key: 'mclaren|gts' }], ESTOQUE)
		expect(feitos.has(chaveDoPar('ferrari|296 gts', 'mclaren|gts'))).toBe(true)
	})

	it('sem par inédito devolve null', () => {
		const dois = [ESTOQUE[0], ESTOQUE[1]]
		const feitos = new Set([chaveDoPar(vehicleKey(dois[0]), vehicleKey(dois[1]))])
		expect(escolherParParaComparativo(dois, new Set(), 0, feitos)).toBeNull()
	})
})
