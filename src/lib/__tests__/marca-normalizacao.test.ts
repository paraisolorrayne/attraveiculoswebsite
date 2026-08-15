import { describe, it, expect } from 'vitest'
import { normalizarMarca, marcaCasaCom, slugDeMarca } from '@/lib/marca-normalizacao'

describe('normalizarMarca', () => {
	// O caso que motivou tudo: o AutoConf grava "Mercedes", o catálogo tem
	// "Mercedes-Benz", e 10 veículos ficavam invisíveis (auditoria de 14/08).
	it('trata Mercedes e Mercedes-Benz como a mesma marca', () => {
		expect(normalizarMarca('Mercedes')).toBe('mercedes-benz')
		expect(normalizarMarca('Mercedes-Benz')).toBe('mercedes-benz')
		expect(normalizarMarca('mercedes benz')).toBe('mercedes-benz')
		expect(normalizarMarca('MERCEDES-AMG')).toBe('mercedes-benz')
	})

	it('ignora caixa e espaços em volta', () => {
		expect(normalizarMarca('  FERRARI ')).toBe('ferrari')
		expect(normalizarMarca('Mclaren')).toBe('mclaren')
		expect(normalizarMarca('McLaren')).toBe('mclaren')
	})

	it('converte separadores em hífen', () => {
		expect(normalizarMarca('Land Rover')).toBe('land-rover')
		expect(normalizarMarca('land_rover')).toBe('land-rover')
		expect(normalizarMarca('Aston Martin')).toBe('aston-martin')
	})

	it('ignora acento — marca digitada à mão não vem normalizada', () => {
		expect(normalizarMarca('Citroën')).toBe('citroen')
	})

	it('devolve null para entrada vazia, não string vazia', () => {
		expect(normalizarMarca('')).toBeNull()
		expect(normalizarMarca('   ')).toBeNull()
		expect(normalizarMarca(null)).toBeNull()
		expect(normalizarMarca(undefined)).toBeNull()
	})

	// Marca desconhecida não pode virar null: o estoque tem RAM, Pontiac, GMC,
	// Cadillac — sem página de marca, mas precisam continuar filtráveis.
	it('normaliza marca sem catálogo em vez de descartá-la', () => {
		expect(normalizarMarca('RAM')).toBe('ram')
		expect(normalizarMarca('Pontiac')).toBe('pontiac')
	})
})

describe('marcaCasaCom', () => {
	it('casa o veículo do estoque com o slug da página', () => {
		expect(marcaCasaCom('Mercedes', 'mercedes-benz')).toBe(true)
		expect(marcaCasaCom('Mclaren', 'mclaren')).toBe(true)
		expect(marcaCasaCom('Land Rover', 'land-rover')).toBe(true)
	})

	// A regra dura dos dois specs: /ferrari mostra SOMENTE Ferrari.
	it('NUNCA casa marcas diferentes', () => {
		expect(marcaCasaCom('Porsche', 'ferrari')).toBe(false)
		expect(marcaCasaCom('Ferrari', 'lamborghini')).toBe(false)
		expect(marcaCasaCom('BMW', 'mercedes-benz')).toBe(false)
	})

	// O filtro antigo usava includes(): substring casava marca com marca.
	// Se algum dia entrar uma marca contida em outra, o bug volta calado.
	it('não casa por substring', () => {
		expect(marcaCasaCom('Mini Cooper', 'mini')).toBe(false)
		expect(marcaCasaCom('Alfa Romeo', 'alfa')).toBe(false)
	})

	it('veículo sem marca não casa com nada', () => {
		expect(marcaCasaCom('', 'ferrari')).toBe(false)
		expect(marcaCasaCom(null, 'ferrari')).toBe(false)
	})
})

describe('slugDeMarca', () => {
	it('gera o slug de URL a partir do nome de exibição', () => {
		expect(slugDeMarca('Aston Martin')).toBe('aston-martin')
		expect(slugDeMarca('Mercedes-Benz')).toBe('mercedes-benz')
	})
})
