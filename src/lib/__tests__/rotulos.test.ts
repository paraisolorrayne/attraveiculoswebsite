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

	// Conserto 5: das sete carrocerias canônicas do projeto (SUV, Sedã, Hatch,
	// Cupê, Conversível, Picape, Perua), picape era a única sem nenhum rótulo
	// de uso — zero cobertura em qualquer eixo. Ela cabota família e viagem
	// (cabine dupla) e tem espaço de carga real (a caçamba), então entra em
	// FAMILIARES/ESPACOSAS, sujeita ao mesmo gate de portas que já vale para
	// hatch/sedan: cabine simples (2 portas) não vira família.
	it('picape de cabine dupla (4 portas) é família, viagem e tem espaço', () => {
		const r = derivarRotulos({ body_type: 'Picape', doors: 4, price: 400_000 }, ANO)
		expect(r.uso).toContain('familia')
		expect(r.uso).toContain('viagem')
		expect(r.comprador).toContain('familia')
		expect(r.forca).toContain('espaco')
	})

	it('picape de cabine simples (2 portas) não vira família — mesmo gate de portas do resto da regra', () => {
		const r = derivarRotulos({ body_type: 'Picape', doors: 2, price: 400_000 }, ANO)
		expect(r.uso).not.toContain('familia')
		expect(r.comprador).not.toContain('familia')
		expect(r.forca).not.toContain('espaco')
	})

	it('carroceria esportiva vira fim de semana', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2 }, ANO).uso).toContain('fim-de-semana')
		expect(derivarRotulos({ body_type: 'Conversível', doors: 2 }, ANO).uso).toContain('fim-de-semana')
	})

	it('carroceria esportiva com potência acima do limiar vira pista', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, horsepower: 450 }, ANO).uso).toContain('pista')
	})

	it('carroceria esportiva sem potência acima do limiar não vira pista', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, horsepower: 250 }, ANO).uso).not.toContain('pista')
	})

	// Sem body_type não dá para afirmar nada sobre uso.
	it('sem carroceria não inventa rótulo de uso', () => {
		expect(derivarRotulos({ doors: 4, price: 300_000 }, ANO).uso).toEqual([])
	})

	it('veículo com 20 anos ou mais entra em coleção', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2006 }, ANO).uso).toContain('colecao')
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2020 }, ANO).uso).not.toContain('colecao')
	})

	it('fronteira: 20 anos exatos entra em coleção, 19 anos não', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: ANO - 20 }, ANO).uso).toContain('colecao')
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: ANO - 19 }, ANO).uso).not.toContain('colecao')
	})
})

describe('derivarRotulos — força', () => {
	it('menos de 30 mil km é baixa quilometragem', () => {
		expect(derivarRotulos({ mileage: 19_930 }, ANO).forca).toContain('baixa-quilometragem')
		expect(derivarRotulos({ mileage: 80_000 }, ANO).forca).not.toContain('baixa-quilometragem')
	})

	it('fronteira: 29.999 km é baixa quilometragem, 30.000 km não', () => {
		expect(derivarRotulos({ mileage: 29_999 }, ANO).forca).toContain('baixa-quilometragem')
		expect(derivarRotulos({ mileage: 30_000 }, ANO).forca).not.toContain('baixa-quilometragem')
	})

	it('400 cv ou mais é desempenho', () => {
		expect(derivarRotulos({ horsepower: 450 }, ANO).forca).toContain('desempenho')
		expect(derivarRotulos({ horsepower: 250 }, ANO).forca).not.toContain('desempenho')
	})

	it('fronteira: 400 cv é desempenho, 399 cv não', () => {
		expect(derivarRotulos({ horsepower: 400 }, ANO).forca).toContain('desempenho')
		expect(derivarRotulos({ horsepower: 399 }, ANO).forca).not.toContain('desempenho')
	})

	// Nada no banco sustenta "confortável", "boa liquidez" ou "exclusividade".
	// A regra não pode inventar isso — só a Attra atribui, à mão.
	// `exclusividade` viria da marca ser superesportiva, mas `brand` saiu das
	// regras (adjudicado pelo controlador): fica órfão de propósito.
	it('nunca deriva conforto, liquidez nem exclusividade', () => {
		const r = derivarRotulos(
			{ body_type: 'SUV', doors: 4, price: 900_000, horsepower: 500, mileage: 5_000 },
			ANO,
		)
		expect(r.forca).not.toContain('conforto')
		expect(r.forca).not.toContain('liquidez')
		expect(r.forca).not.toContain('exclusividade')
	})
})

describe('derivarRotulos — comprador', () => {
	it('fronteira: preço 250.000 com carro familiar é executivo, 249.999 não', () => {
		const base = { body_type: 'SUV', doors: 4 }
		expect(derivarRotulos({ ...base, price: 250_000 }, ANO).comprador).toContain('executivo')
		expect(derivarRotulos({ ...base, price: 249_999 }, ANO).comprador).not.toContain('executivo')
	})

	it('fronteira: preço 299.999 é primeiro-premium, 300.000 não', () => {
		expect(derivarRotulos({ price: 299_999 }, ANO).comprador).toContain('primeiro-premium')
		expect(derivarRotulos({ price: 300_000 }, ANO).comprador).not.toContain('primeiro-premium')
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
