import { describe, it, expect } from 'vitest'
import { carroceriaEhEsportiva, podeAparecerNoHub } from '@/lib/estoque-superesportivo'

describe('carroceriaEhEsportiva', () => {
	it('aceita as grafias que o estoque realmente usa', () => {
		expect(carroceriaEhEsportiva('Cupê')).toBe(true)
		expect(carroceriaEhEsportiva('cupe')).toBe(true)
		expect(carroceriaEhEsportiva('Coupé')).toBe(true)
		expect(carroceriaEhEsportiva('Conversível')).toBe(true)
	})

	it('recusa SUV, sedã e vazio', () => {
		expect(carroceriaEhEsportiva('SUV')).toBe(false)
		expect(carroceriaEhEsportiva('Sedã')).toBe(false)
		expect(carroceriaEhEsportiva(null)).toBe(false)
		expect(carroceriaEhEsportiva(undefined)).toBe(false)
	})
})

describe('podeAparecerNoHub', () => {
	// Os casos exatos que estavam no ar em 15/08/2026 sob o H1
	// "Superesportivos à venda".
	it('barra os SUVs de marca de performance', () => {
		expect(podeAparecerNoHub({ body_type: 'SUV' }, 'performance')).toBe(false) // BMW X2
		expect(podeAparecerNoHub({ body_type: 'SUV' }, 'performance')).toBe(false) // Porsche Macan
		expect(podeAparecerNoHub({ body_type: 'SUV' }, 'performance')).toBe(false) // Mercedes G-63
	})

	it('mantém o esportivo de marca de performance', () => {
		expect(podeAparecerNoHub({ body_type: 'Cupê' }, 'performance')).toBe(true) // Corvette Z06
	})

	// O caso que a primeira versão deixou passar: Porsche está classificada como
	// superesportiva, e a isenção por marca manteve três Macan no hub.
	it('barra o SUV mesmo de marca superesportiva', () => {
		expect(podeAparecerNoHub({ body_type: 'SUV' }, 'superesportivo')).toBe(false) // Porsche Macan
		expect(podeAparecerNoHub({ body_type: 'SUV' }, 'superesportivo')).toBe(false) // Ferrari Purosangue
	})

	it('mantém o cupê de marca superesportiva', () => {
		expect(podeAparecerNoHub({ body_type: 'Cupê' }, 'superesportivo')).toBe(true)
	})

	// Sem carroceria não há como sustentar a promessa do H1.
	it('exclui veículo sem carroceria informada', () => {
		expect(podeAparecerNoHub({ body_type: null }, 'superesportivo')).toBe(false)
	})

	it('deixa de fora marca sem classificação editorial', () => {
		expect(podeAparecerNoHub({ body_type: 'Cupê' }, undefined)).toBe(false)
	})
})
