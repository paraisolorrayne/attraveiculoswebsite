import { describe, it, expect } from 'vitest'
import { anoDoVeiculo, nomeDoVeiculo, tituloDoVeiculo, versaoDoVeiculo } from '@/lib/identidade-do-veiculo'

describe('tituloDoVeiculo — o nome que vai para o <title> e o JSON-LD', () => {
	it('traz a versão, que distingue um 911 GTS de um 911 Carrera', () => {
		expect(tituloDoVeiculo({
			brand: 'Porsche', model: '911', version: 'Carrera GTS Cabriolet', year_manufacture: 2026, year_model: 2026,
		})).toBe('Porsche 911 Carrera GTS Cabriolet 2026')
	})

	it('mostra fabricação/modelo quando diferem, como o h1', () => {
		expect(tituloDoVeiculo({
			brand: 'Ferrari', model: '296', version: 'GTS', year_manufacture: 2024, year_model: 2025,
		})).toBe('Ferrari 296 GTS 2024/2025')
	})

	it('sem versão, fica marca + modelo + ano', () => {
		expect(tituloDoVeiculo({ brand: 'Chevrolet', model: 'Corvette', version: null, year_model: 2023 }))
			.toBe('Chevrolet Corvette 2023')
	})

	it('sem nada, cai num nome genérico em vez de título vazio', () => {
		expect(tituloDoVeiculo({})).toBe('Veículo premium')
	})
})

describe('versaoDoVeiculo', () => {
	it('expande a abreviação do AutoConf', () => {
		expect(versaoDoVeiculo({ model: 'Cayenne', version: 'Turbo E-Hybrid Bi-TB' })).toBe('Turbo E-Hybrid Bi-Turbo')
	})

	it('tira o modelo repetido no começo da versão', () => {
		expect(versaoDoVeiculo({ model: 'Range Rover', version: 'Range Rover VELAR SV' })).toBe('VELAR SV')
		expect(nomeDoVeiculo({ brand: 'Land Rover', model: 'Range Rover', version: 'Range Rover VELAR SV' }))
			.toBe('Land Rover Range Rover VELAR SV')
	})

	it('não confunde prefixo de palavra com o modelo ("X5" não corta "X50")', () => {
		expect(versaoDoVeiculo({ model: 'X5', version: 'X50 Edition' })).toBe('X50 Edition')
	})

	it('versão igual ao modelo não se repete', () => {
		expect(nomeDoVeiculo({ brand: 'Chevrolet', model: 'Z06', version: 'Z06' })).toBe('Chevrolet Z06')
	})
})

describe('anoDoVeiculo', () => {
	it('colapsa quando fabricação e modelo coincidem', () => {
		expect(anoDoVeiculo({ year_manufacture: 2026, year_model: 2026 })).toBe('2026')
	})

	it('ano zerado do feed não vira "0/2025"', () => {
		expect(anoDoVeiculo({ year_manufacture: 0, year_model: 2025 })).toBe('2025')
	})
})
