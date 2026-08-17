import { describe, it, expect } from 'vitest'
import { resumoDoVeiculo } from '@/lib/resumo-do-veiculo'

describe('resumoDoVeiculo', () => {
	// O formato exato pedido pela Attra.
	it('reproduz o formato pedido', () => {
		expect(resumoDoVeiculo({
			brand: 'Ferrari', model: 'SF90', version: 'Spider',
			year_manufacture: 2023, year_model: 2024,
			mileage: 0, price: 5_500_000,
		})).toBe('Ferrari SF90 Spider 2023/2024 | zero quilômetro | R$ 5.500.000,00')
	})

	it('mostra a quilometragem quando não é zero km', () => {
		expect(resumoDoVeiculo({
			brand: 'Audi', model: 'RS6', version: 'Avant',
			year_manufacture: 2022, year_model: 2023,
			mileage: 33_500, price: 899_000,
		})).toBe('Audi RS6 Avant 2022/2023 | 33.500 km | R$ 899.000,00')
	})

	it('colapsa o ano quando fabricação e modelo são iguais', () => {
		const r = resumoDoVeiculo({
			brand: 'Porsche', model: 'Macan', year_manufacture: 2024, year_model: 2024,
			mileage: 4_580, price: 599_000,
		})
		expect(r).toContain('Porsche Macan 2024 |')
		expect(r).not.toContain('2024/2024')
	})

	// Sem isso o cliente recebe "1500 LARAM. NIGHT ED. BI-TB 4x4 Aut." no WhatsApp.
	it('expande a abreviação do AutoConf na versão', () => {
		expect(resumoDoVeiculo({
			brand: 'RAM', model: '1500', version: 'LARAM. NIGHT ED. BI-TB 4x4 Aut.',
			year_manufacture: 2024, year_model: 2025,
			mileage: 7_010, price: 649_000,
		})).toBe('RAM 1500 Laramie NIGHT Edition Bi-Turbo 4x4 Automático 2024/2025 | 7.010 km | R$ 649.000,00')
	})

	it('trata is_new como zero quilômetro mesmo com quilometragem ausente', () => {
		expect(resumoDoVeiculo({
			brand: 'Ferrari', model: '296', version: 'GTB',
			year_model: 2025, is_new: true, price: 4_200_000,
		})).toContain('| zero quilômetro |')
	})

	// "R$ 0,00" colado no WhatsApp de um cliente é afirmação falsa. A Attra não
	// usa "sob consulta", então preço ausente é defeito de cadastro.
	it('omite o preço em vez de escrever R$ 0,00', () => {
		const r = resumoDoVeiculo({
			brand: 'Porsche', model: '911', year_model: 2023, mileage: 12_000, price: 0,
		})
		expect(r).not.toContain('R$')
		expect(r).toBe('Porsche 911 2023 | 12.000 km')
	})

	it('funciona sem versão', () => {
		expect(resumoDoVeiculo({
			brand: 'Tesla', model: 'Cybertruck', year_model: 2024, mileage: 0, price: 1_200_000,
		})).toBe('Tesla Cybertruck 2024 | zero quilômetro | R$ 1.200.000,00')
	})
})
