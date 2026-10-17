import { describe, expect, it } from 'vitest'
import { hexParaRgb, luminanciaRelativa, razaoDeContraste } from '@content/admin/creative/gerador/contraste'
import { RED } from '@content/admin/creative/gerador/desenho'
import {
	A_MAIS_ALTA,
	type BlocoDaFicha,
	corDeDestaque,
	corDoRotulo,
	corSugeridaPeloNome,
	diagramarFicha,
	FOLGA_A,
	INCL_A,
	PISO,
} from '@content/admin/creative/gerador/formatos/premium'

const lum = (c: [number, number, number]) => luminanciaRelativa(c[0], c[1], c[2])
const rgbDe = (css: string): [number, number, number] => {
	if (css.startsWith('#')) return hexParaRgb(css)
	const [r, g, b] = css.match(/\d+/g)!.map(Number)
	return [r, g, b]
}

describe('Premium — cor dos rótulos', () => {
	// O roxo e o laranja são os medidos nas peças do Temerario (16/10/2026).
	it.each([
		['roxo Viola Pasifae', '#4a1f87'],
		['laranja Arancio Xanto', '#f94b37'],
		['vermelho da Attra', RED],
		['preto', '#000000'],
	])('o rótulo em %s lê a 4,5:1 sobre o piso', (_nome, hex) => {
		const rotulo = rgbDe(corDoRotulo(hexParaRgb(hex)))
		expect(razaoDeContraste(lum(rotulo), lum(hexParaRgb(PISO)))).toBeGreaterThanOrEqual(4.5)
	})

	it('o rótulo continua com o tom do carro, não vira branco', () => {
		const [r, g, b] = rgbDe(corDoRotulo(hexParaRgb('#4a1f87')))
		expect(b).toBeGreaterThan(r)
		expect(b).toBeGreaterThan(g)
	})
})

describe('Premium — cor de destaque', () => {
	it('campo vazio ou inválido cai no vermelho da Attra', () => {
		expect(corDeDestaque('')).toEqual(hexParaRgb(RED))
		expect(corDeDestaque('roxo')).toEqual(hexParaRgb(RED))
		expect(corDeDestaque('#4a1f87')).toEqual([0x4a, 0x1f, 0x87])
	})

	it('sugere a partir da cor do estoque', () => {
		expect(corSugeridaPeloNome('Roxo')).toBe('#4a1f87')
		expect(corSugeridaPeloNome('Laranja')).toBe('#f94b37')
		expect(corSugeridaPeloNome('Vermelho')).toBe('#c8102e')
		expect(corSugeridaPeloNome('Vinho')).toBe('#7a1630')
	})

	it('preto, branco, cinza e prata não sugerem cor (fica o vermelho da Attra)', () => {
		for (const cor of ['Preto', 'Branco', 'Cinza', 'Prata', 'Grafite']) {
			expect(corSugeridaPeloNome(cor)).toBe('')
		}
	})
})

describe('Premium — ficha e corte da foto de baixo (Stories)', () => {
	const bloco = (rotulo: string, ...linhas: string[]): BlocoDaFicha => ({ rotulo, linhas })
	// O que a busca no estoque preenche: MOTOR com a versão, COR, e os outros
	// rótulos sem texto. Caso real: McLaren Artura, 16/10/2026.
	const ESTOQUE = [bloco('MOTOR', 'Coupe V6 2p'), bloco('COR', 'Laranja'), bloco('TRAÇÃO'), bloco('INTERIOR'), bloco('DESTAQUES')]
	// A ficha completa da referência (Temerario Viola Pasifae).
	const COMPLETA = [
		bloco('MOTOR', '4.0 V8 Biturbo Híbrido', '3 motores elétricos'),
		bloco('COR', 'Viola Pasifae', 'Detalhes em Giallo'),
		bloco('RODAS', 'Forjadas Velador 20"/21"', 'Preto Brilhante'),
		bloco('INTERIOR', 'Nero Ade', 'Detalhes em Giallo Taurus'),
		bloco('DESTAQUES', 'Display do Passageiro', 'Front Lift', 'Susp. Magneto-Reológica'),
	]
	const COLUNA_X = [70, 403, 717]

	it.each([
		['do estoque', ESTOQUE],
		['completa', COMPLETA],
		['só com o MOTOR', [bloco('MOTOR', 'V8', 'biturbo', '800 cv')]],
		['com o MOTOR de três linhas e o resto curto', [bloco('MOTOR', 'a', 'b', 'c'), bloco('COR', 'Preto')]],
	])('a reta passa abaixo de todo o texto da grade e do valor — ficha %s', (_nome, blocos) => {
		const d = diagramarFicha(blocos, true, false)
		const reta = (x: number) => d.aEsq + INCL_A * x
		d.fimColuna.forEach((fim, c) => {
			if (fim !== null) expect(reta(COLUNA_X[c])).toBeGreaterThanOrEqual(fim + FOLGA_A)
		})
		expect(reta(d.xValor)).toBeGreaterThanOrEqual(d.yValor + FOLGA_A)
	})

	it('ficha do estoque: rótulo sem texto sai, e a reta passa logo abaixo do MOTOR', () => {
		const d = diagramarFicha(ESTOQUE, true, false)
		expect([0, 1, 2, 3, 4].filter(d.naGrade)).toEqual([0, 1])
		// Antes a reta ficava 14 px acima do pé do "Coupe V6 2p".
		expect(d.aEsq + INCL_A * COLUNA_X[0]).toBeCloseTo(d.fimColuna[0]! + FOLGA_A)
	})

	it('ficha completa: os cinco blocos na grade, como na referência', () => {
		const d = diagramarFicha(COMPLETA, true, false)
		expect([0, 1, 2, 3, 4].filter(d.naGrade)).toEqual([0, 1, 2, 3, 4])
	})

	it('sem texto nenhum na ficha, a reta fica no mais alto: logo abaixo do KM', () => {
		expect(diagramarFicha([], false, false).aEsq).toBe(A_MAIS_ALTA)
	})
})
