import { describe, it, expect } from 'vitest'
import { fraseDoEstoque, reais, resumoDoEstoque } from '../estoque-do-modelo'

describe('resumoDoEstoque', () => {
	it('faixa de preço e de ano, ignorando preço zero (não publicado)', () => {
		expect(
			resumoDoEstoque([
				{ price: 1_290_000, year_model: 2026 },
				{ price: 0, year_model: 2024 },
				{ price: 689_900, year_model: 2022 },
			]),
		).toEqual({ unidades: 3, precos: { menor: 689_900, maior: 1_290_000 }, anos: { menor: 2022, maior: 2026 } })
	})

	it('sem preço publicado, a faixa de preço fica de fora', () => {
		expect(resumoDoEstoque([{ price: 0, year_model: 2025 }]).precos).toBeNull()
	})
})

describe('fraseDoEstoque', () => {
	it('várias unidades: quantas e de quanto a quanto, com o asterisco', () => {
		const resumo = resumoDoEstoque([
			{ price: 689_900, year_model: 2022 },
			{ price: 1_290_000, year_model: 2026 },
		])
		expect(fraseDoEstoque('Porsche 911', resumo)).toBe(
			'2 unidades de Porsche 911 à venda na Attra, de R$ 689.900 a R$ 1.290.000*',
		)
	})

	it('uma unidade: o preço dela', () => {
		const resumo = resumoDoEstoque([{ price: 2_450_000, year_model: 2025 }])
		expect(fraseDoEstoque('Ferrari 296', resumo)).toBe('1 unidade de Ferrari 296 à venda na Attra, por R$ 2.450.000*')
	})

	it('sem preço publicado, sem valor e sem asterisco', () => {
		expect(fraseDoEstoque('BMW M3', resumoDoEstoque([{ price: 0, year_model: 2024 }]))).toBe(
			'1 unidade de BMW M3 à venda na Attra',
		)
	})

	it('sem unidade, nada', () => {
		expect(fraseDoEstoque('Audi RS6', resumoDoEstoque([]))).toBeNull()
	})

	it('reais sem centavos', () => {
		expect(reais(689_900.4)).toBe('R$ 689.900')
	})
})
