import { describe, it, expect } from 'vitest'
import { derivarRotulos, VOCABULARIO } from '@/lib/mcp/rotulos'

const ANO = 2026

describe('derivarRotulos — uso', () => {
	// A regra que não pode falhar nunca: o case que abre o artigo da Auto
	// Trader é "SUV familiar", e um cupê jamais pode entrar nessa resposta.
	it('cupê de duas portas nunca é família', () => {
		const r = derivarRotulos({ body_type: 'Cupê', doors: 2, price: 500_000 }, ANO)
		expect(r.uso).not.toContain('familia')
		expect(r.comprador).not.toContain('familia')
	})

	it('SUV de quatro portas é família e viagem', () => {
		const r = derivarRotulos({ body_type: 'SUV', doors: 4, price: 400_000 }, ANO)
		expect(r.uso).toContain('familia')
		expect(r.uso).toContain('viagem')
	})

	it('carroceria esportiva vira fim de semana', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2 }, ANO).uso).toContain('fim-de-semana')
		expect(derivarRotulos({ body_type: 'Conversível', doors: 2 }, ANO).uso).toContain('fim-de-semana')
	})

	// Sem body_type não dá para afirmar nada sobre uso.
	it('sem carroceria não inventa rótulo de uso', () => {
		expect(derivarRotulos({ doors: 4, price: 300_000 }, ANO).uso).toEqual([])
	})

	it('veículo com 20 anos ou mais entra em coleção', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2006 }, ANO).uso).toContain('colecao')
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2020 }, ANO).uso).not.toContain('colecao')
	})
})

describe('derivarRotulos — força', () => {
	it('menos de 30 mil km é baixa quilometragem', () => {
		expect(derivarRotulos({ mileage: 19_930 }, ANO).forca).toContain('baixa-quilometragem')
		expect(derivarRotulos({ mileage: 80_000 }, ANO).forca).not.toContain('baixa-quilometragem')
	})

	it('400 cv ou mais é desempenho', () => {
		expect(derivarRotulos({ horsepower: 450 }, ANO).forca).toContain('desempenho')
		expect(derivarRotulos({ horsepower: 250 }, ANO).forca).not.toContain('desempenho')
	})

	// Nada no banco sustenta "confortável" ou "boa liquidez". A regra não pode
	// inventar isso — só a Attra atribui, à mão.
	it('nunca deriva conforto nem liquidez', () => {
		const r = derivarRotulos(
			{ body_type: 'SUV', doors: 4, price: 900_000, horsepower: 500, mileage: 5_000 },
			ANO,
		)
		expect(r.forca).not.toContain('conforto')
		expect(r.forca).not.toContain('liquidez')
	})
})

describe('derivarRotulos — vocabulário', () => {
	it('nunca produz rótulo fora da lista fechada', () => {
		const casos = [
			{ body_type: 'SUV', doors: 4, price: 400_000, horsepower: 500, mileage: 10_000, year_model: 2024 },
			{ body_type: 'Cupê', doors: 2, price: 3_790_000, horsepower: 830, mileage: 900, year_model: 2025 },
			{ body_type: 'Sedã', doors: 4, price: 180_000, mileage: 120_000, year_model: 2001 },
			{},
		]
		for (const caso of casos) {
			const r = derivarRotulos(caso, ANO)
			for (const u of r.uso) expect(VOCABULARIO.uso).toContain(u)
			for (const c of r.comprador) expect(VOCABULARIO.comprador).toContain(c)
			for (const f of r.forca) expect(VOCABULARIO.forca).toContain(f)
		}
	})

	it('não repete rótulo', () => {
		const r = derivarRotulos({ body_type: 'SUV', doors: 4, price: 400_000 }, ANO)
		expect(new Set(r.uso).size).toBe(r.uso.length)
	})
})
