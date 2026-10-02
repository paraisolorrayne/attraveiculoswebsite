import { describe, expect, it } from 'vitest'
import { normalizarVeiculoInteresse, veiculoDoLead } from '@/lib/agencias/veiculo-lead'

describe('normalizarVeiculoInteresse', () => {
	it.each([
		['Ferrari 296 GTB (R$ 3.490.000) - interesse via WhatsApp', 'Ferrari 296 GTB'],
		['Mercedes-AMG G 63 2024 preto 12.000 km', 'Mercedes-Benz G 63 2024'],
		['mercedes benz AMG GT 63 S | anúncio webmotors', 'Mercedes-Benz AMG GT 63 S'],
		['Interesse em Porsche 911 Carrera S — cliente pediu fotos', 'Porsche 911 Carrera S'],
		['Range Rover Sport 2023 zero quilômetro', 'Land Rover Range Rover Sport 2023'],
		['Porsche Cayenne / BMW X6 / Audi RS6', 'Porsche Cayenne +2'],
		['McLaren 750S R$ 4,2 mi', 'McLaren 750S'],
	])('%s → %s', (bruto, esperado) => {
		expect(normalizarVeiculoInteresse(bruto).veiculo).toBe(esperado)
	})

	it('sem marca reconhecível não mostra o texto livre', () => {
		expect(normalizarVeiculoInteresse('cliente João quer algo até 500 mil, ligar 11 99999-0000').veiculo).toBe('Não especificado')
		expect(normalizarVeiculoInteresse(null).veiculo).toBe('Não especificado')
	})

	it('tipo: venda ou troca do carro do cliente × compra', () => {
		expect(normalizarVeiculoInteresse('Troca: BMW X5 2020').tipo).toBe('vender_trocar')
		expect(normalizarVeiculoInteresse('Venda do veículo do cliente: Porsche Macan').tipo).toBe('vender_trocar')
		expect(normalizarVeiculoInteresse('cliente quer VENDER a Ferrari Roma').tipo).toBe('vender_trocar')
		expect(normalizarVeiculoInteresse('Troca: BMW X5 2020').veiculo).toBe('BMW X5 2020')
		expect(normalizarVeiculoInteresse('Ferrari Roma').tipo).toBe('comprar')
	})
})

describe('veiculoDoLead', () => {
	it('o detalhe estruturado da Fykos tem precedência', () => {
		expect(
			veiculoDoLead('qualquer coisa', { tipo: 'comprar', marca: 'Mercedes', modelo: 'G 63', versao: 'AMG', ano: 2024 }),
		).toEqual({ veiculo: 'Mercedes-Benz G 63 AMG 2024', tipo: 'comprar' })
	})

	it('sem detalhe, cai no normalizador do texto', () => {
		expect(veiculoDoLead('Ferrari SF90 Stradale (R$ 4.590.000)', null)).toEqual({ veiculo: 'Ferrari SF90 Stradale', tipo: 'comprar' })
	})
})
