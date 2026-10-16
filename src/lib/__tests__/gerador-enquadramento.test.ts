import { describe, it, expect } from 'vitest'
import { enquadrar } from '@content/admin/creative/gerador/enquadramento'

/** A caixa da foto principal do Clássico Loja: 1080×1000. */
const CAIXA = { x: 0, y: 0, largura: 1080, altura: 1000 }
const CENTRO = { zoom: 1, x: 0.5, y: 0.5 }
/** Foto típica do estoque: 4:3 horizontal. */
const HORIZONTAL = { width: 1920, height: 1440 }

describe('enquadrar — cover, o modo padrão', () => {
	it('preenche a caixa inteira, deixando a sobra para fora', () => {
		const r = enquadrar(HORIZONTAL, CAIXA, CENTRO, 'cover')
		expect(r.dh).toBeCloseTo(1000, 0)
		expect(r.dw).toBeGreaterThan(1080)
		expect(r.dy).toBeCloseTo(0, 0)
	})

	it('zoom amplia a partir do centro', () => {
		const base = enquadrar(HORIZONTAL, CAIXA, CENTRO, 'cover')
		const zoom = enquadrar(HORIZONTAL, CAIXA, { ...CENTRO, zoom: 1.5 }, 'cover')
		expect(zoom.dw).toBeCloseTo(base.dw * 1.5, 0)
		expect(zoom.dx).toBeLessThan(base.dx)
	})

	it('y menor sobe a foto, y maior desce', () => {
		const vertical = { width: 1080, height: 2000 }
		const cima = enquadrar(vertical, CAIXA, { zoom: 1, x: 0.5, y: 0 }, 'cover')
		const baixo = enquadrar(vertical, CAIXA, { zoom: 1, x: 0.5, y: 1 }, 'cover')
		expect(cima.dy).toBeGreaterThan(baixo.dy)
	})

	it('o alcance do deslocamento nunca é zero — mesmo sem sobra, a foto anda', () => {
		// Sem o piso de rw*.6 / rh*.6, uma foto do tamanho exato da caixa
		// ignoraria o slider e o operador acharia que o controle quebrou.
		const exata = { width: 1080, height: 1000 }
		const centro = enquadrar(exata, CAIXA, CENTRO, 'cover')
		const deslocada = enquadrar(exata, CAIXA, { zoom: 1, x: 0.5, y: 0 }, 'cover')
		expect(deslocada.dy).not.toBeCloseTo(centro.dy, 1)
	})

	it('devolve a escala base, que o desenho usa para o preenchimento borrado', () => {
		const r = enquadrar(HORIZONTAL, CAIXA, CENTRO, 'cover')
		expect(r.base).toBeCloseTo(Math.max(1080 / 1920, 1000 / 1440), 5)
	})
})

describe('enquadrar — fit', () => {
	it('mostra a foto inteira, cabendo dentro da caixa', () => {
		const r = enquadrar(HORIZONTAL, CAIXA, CENTRO, 'fit')
		expect(r.dw).toBeLessThanOrEqual(1080)
		expect(r.dh).toBeLessThanOrEqual(1000)
	})
})
