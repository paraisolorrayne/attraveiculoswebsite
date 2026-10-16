import { describe, expect, it } from 'vitest'
import { hexParaRgb, luminanciaRelativa, razaoDeContraste } from '@content/admin/creative/gerador/contraste'
import { RED } from '@content/admin/creative/gerador/desenho'
import {
	corDeDestaque,
	corDoRotulo,
	corSugeridaPeloNome,
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
