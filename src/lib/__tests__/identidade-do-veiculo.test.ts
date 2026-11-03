import { describe, it, expect } from 'vitest'
import { anoDoVeiculo, nomeDoVeiculo, tituloDeVendaDoVeiculo, tituloDistintoDoVeiculo, tituloDoVeiculo, versaoDoVeiculo } from '@/lib/identidade-do-veiculo'

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

describe('tituloDistintoDoVeiculo', () => {
	const temerario = { brand: 'Lamborghini', model: 'Temerário', version: 'V8 Bi-Turbo', year_manufacture: 2026, year_model: 2026 }

	it('sem outro carro de mesmo nome, é o título de sempre', () => {
		const v = { ...temerario, id: '1', color: 'Roxo', mileage: 0 }
		expect(tituloDistintoDoVeiculo(v, [v])).toBe('Lamborghini Temerário V8 Bi-Turbo 2026')
	})

	it('com outro de mesmo nome e ano, acrescenta a cor', () => {
		const roxo = { ...temerario, id: '1', color: 'Roxo', mileage: 0 }
		const laranja = { ...temerario, id: '2', color: 'Laranja', mileage: 0 }
		expect(tituloDistintoDoVeiculo(roxo, [roxo, laranja])).toBe('Lamborghini Temerário V8 Bi-Turbo 2026 Roxo')
		expect(tituloDistintoDoVeiculo(laranja, [roxo, laranja])).toBe('Lamborghini Temerário V8 Bi-Turbo 2026 Laranja')
	})

	it('com a cor também igual, acrescenta a quilometragem', () => {
		const a = { ...temerario, id: '1', color: 'Cinza', mileage: 23070 }
		const b = { ...temerario, id: '2', color: 'cinza', mileage: 0 }
		expect(tituloDistintoDoVeiculo(a, [a, b])).toBe('Lamborghini Temerário V8 Bi-Turbo 2026 Cinza, 23.070 km')
		expect(tituloDistintoDoVeiculo(b, [a, b])).toBe('Lamborghini Temerário V8 Bi-Turbo 2026 cinza, 0 km')
	})
})

describe('tituloDeVendaDoVeiculo', () => {
	it('segue "{Modelo} {Ano} à venda | Attra" quando cabe inteiro', () => {
		const v = { id: '1', brand: 'Porsche', model: 'Cayenne', version: 'Coupe V6', year_manufacture: 2025, year_model: 2025 }
		expect(tituloDeVendaDoVeiculo(v, [v])).toBe('Porsche Cayenne Coupe V6 2025 à venda | Attra')
	})

	it('tira palavras do fim da versão até caber em 60', () => {
		const v = { id: '1', brand: 'Mercedes', model: 'G-63', version: 'AMG Edition 1 4MATIC V8 Bi-Turbo Automático', year_manufacture: 2018, year_model: 2019 }
		const t = tituloDeVendaDoVeiculo(v, [v])
		expect(t.length).toBeLessThanOrEqual(60)
		expect(t).toBe('Mercedes G-63 AMG Edition 1 4MATIC 2018/2019 à venda | Attra')
	})

	it('mantém a cor que distingue dois carros de mesmo nome', () => {
		const a = { id: '1', brand: 'Lamborghini', model: 'Temerario', version: '', year_manufacture: 2026, year_model: 2026, color: 'Laranja' }
		const b = { ...a, id: '2', color: 'Verde' }
		expect(tituloDeVendaDoVeiculo(a, [a, b])).toBe('Lamborghini Temerario 2026 Laranja à venda | Attra')
	})
})
