import { describe, expect, it } from 'vitest'
import {
	haloCss,
	hexParaRgb,
	luminanciaRelativa,
	paletaLegivel,
	razaoDeContraste,
	type FundoMedido,
} from '@content/admin/creative/gerador/contraste'

/** Atalho: monta um fundo uniforme na luminância de um cinza sRGB. */
function fundoUniforme(cinza: number): FundoMedido {
	const l = luminanciaRelativa(cinza, cinza, cinza)
	return { escuro: l, mediana: l, claro: l }
}

describe('luminanciaRelativa', () => {
	it('ancora nos extremos do WCAG', () => {
		expect(luminanciaRelativa(0, 0, 0)).toBe(0)
		expect(luminanciaRelativa(255, 255, 255)).toBeCloseTo(1, 6)
	})

	it('lineariza a gama em vez de tratar 128 como meia luz', () => {
		// O erro que esta função existe para não cometer: a média ingênua diria
		// 0,502. Com a linearização do sRGB, cinza 128 tem ~21,6% da luz.
		expect(luminanciaRelativa(128, 128, 128)).toBeCloseTo(0.2159, 3)
	})

	it('pesa o verde acima do vermelho e o vermelho acima do azul', () => {
		const verde = luminanciaRelativa(0, 255, 0)
		const vermelho = luminanciaRelativa(255, 0, 0)
		const azul = luminanciaRelativa(0, 0, 255)
		expect(verde).toBeGreaterThan(vermelho)
		expect(vermelho).toBeGreaterThan(azul)
	})
})

describe('razaoDeContraste', () => {
	it('vai de 1:1 a 21:1', () => {
		const preto = luminanciaRelativa(0, 0, 0)
		const branco = luminanciaRelativa(255, 255, 255)
		expect(razaoDeContraste(preto, preto)).toBe(1)
		expect(razaoDeContraste(preto, branco)).toBeCloseTo(21, 4)
	})

	it('não depende da ordem dos argumentos', () => {
		const a = luminanciaRelativa(30, 30, 30)
		const b = luminanciaRelativa(200, 200, 200)
		expect(razaoDeContraste(a, b)).toBeCloseTo(razaoDeContraste(b, a), 10)
	})
})

describe('hexParaRgb', () => {
	it('lê a forma curta e a longa', () => {
		expect(hexParaRgb('#fff')).toEqual([255, 255, 255])
		expect(hexParaRgb('#2b2b31')).toEqual([43, 43, 49])
	})
})

describe('paletaLegivel', () => {
	it('põe texto claro sobre o asfalto escuro do G 63', () => {
		// O caso que motivou tudo: com a paleta fixa em escuro, o preço mediu
		// 1,00:1 sobre este fundo.
		const p = paletaLegivel(fundoUniforme(35))
		expect(p.textoClaro).toBe(true)
		expect(p.razao).toBeGreaterThanOrEqual(4.5)
	})

	it('mantém texto escuro sobre o concreto claro da McLaren', () => {
		const p = paletaLegivel(fundoUniforme(190))
		expect(p.textoClaro).toBe(false)
		expect(p.razao).toBeGreaterThanOrEqual(4.5)
	})

	it('fecha o alvo em toda a faixa de cinzas, que é a promessa da função', () => {
		// Nenhum piso de foto pode produzir texto ilegível. É esta asserção que
		// substitui a constante escrita à mão.
		for (let cinza = 0; cinza <= 255; cinza += 5) {
			const p = paletaLegivel(fundoUniforme(cinza))
			expect(p.insuficiente, `cinza ${cinza} ficou em ${p.razao.toFixed(2)}:1`).toBe(false)
			expect(p.razao).toBeGreaterThanOrEqual(4.5)
		}
	})

	it('só aciona o halo quando a cor sozinha não resolve', () => {
		// Fundo bem claro com texto escuro já passa longe do alvo: halo zerado,
		// para o contorno não sujar a peça à toa.
		const facil = paletaLegivel(fundoUniforme(250))
		expect(facil.haloAlfa).toBe(0)
		expect(facil.razao).toBeGreaterThan(4.5)

		// Cinza médio é o caso duro: nenhuma das duas cores passa sozinha.
		const dificil = paletaLegivel(fundoUniforme(128))
		expect(dificil.haloAlfa).toBeGreaterThan(0)
		expect(dificil.razao).toBeGreaterThanOrEqual(4.5)
	})

	it('julga cada cor contra o pedaço de fundo que mais a prejudica', () => {
		// Fundo dividido: mediana clara, mas com um trecho escuro relevante.
		// Texto escuro seria escolhido pela mediana e sumiria no trecho escuro —
		// por isso a decisão usa os percentis, não a média.
		const dividido: FundoMedido = {
			escuro: luminanciaRelativa(20, 20, 20),
			mediana: luminanciaRelativa(160, 160, 160),
			claro: luminanciaRelativa(240, 240, 240),
		}
		const p = paletaLegivel(dividido)
		expect(p.razao).toBeGreaterThanOrEqual(4.5)
	})

	it('afrouxa o halo quando o alvo é o de texto grande', () => {
		// O preço tem 48px: pelo WCAG basta 3:1, e exigir 4,5 ali só engrossaria
		// o contorno do número que já é o maior elemento da peça.
		const normal = paletaLegivel(fundoUniforme(120), { alvo: 4.5 })
		const grande = paletaLegivel(fundoUniforme(120), { alvo: 3 })
		expect(grande.haloAlfa).toBeLessThan(normal.haloAlfa)
		expect(grande.razao).toBeGreaterThanOrEqual(3)
	})

	it('sem medição, devolve o comportamento anterior à função', () => {
		// Canvas tingido por foto de outra origem: a peça continua saindo, com
		// a paleta que o desenho usava antes desta função existir.
		const p = paletaLegivel(null)
		expect(p.textoClaro).toBe(false)
		expect(p.cor).toBe('#2b2b31')
		expect(p.haloAlfa).toBeCloseTo(0.45, 6)
		expect(p.insuficiente).toBe(false)
	})

	it('respeita as cores que o formato pedir', () => {
		const p = paletaLegivel(fundoUniforme(240), { corEscura: '#141416' })
		expect(p.cor).toBe('#141416')
	})

	it('monta o rgba do halo', () => {
		const p = paletaLegivel(fundoUniforme(128))
		expect(haloCss(p)).toMatch(/^rgba\(\d+,\d+,\d+,[\d.]+\)$/)
	})
})
