import { describe, expect, it } from 'vitest'
import { acharChao, limparJuntas } from '@content/admin/creative/gerador/juntas'

const W = 360
const H = 270
/** Onde o "carro" termina: acima disso é um bloco escuro com detalhe fino dentro. */
const BASE_DO_CARRO = 120

/** Ruído determinístico pequeno, para o chão ter grão como um piso de verdade. */
function ruido(x: number, y: number): number {
	let n = (x * 73856093) ^ (y * 19349663)
	n = Math.imul(n ^ (n >>> 13), 1274126177)
	return (((n >>> 0) % 9) - 4) as number
}

/** Cena sintética: carro escuro em cima, concreto claro embaixo. */
function cena(comJunta: boolean): Uint8ClampedArray {
	const d = new Uint8ClampedArray(W * H * 4)
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 4
			let v = y < BASE_DO_CARRO ? 40 : 190 + ruido(x, y)
			// raio de roda: detalhe fino e claro DENTRO do carro — não pode sumir
			if (y < BASE_DO_CARRO && x === 100) v = 220
			// a junta: 2px de largura, do carro até a borda de baixo
			if (comJunta && y >= BASE_DO_CARRO && (x === 200 || x === 201)) v = 140
			d[i] = d[i + 1] = d[i + 2] = v
			d[i + 3] = 255
		}
	}
	return d
}

const px = (d: Uint8ClampedArray, x: number, y: number) => d[(y * W + x) * 4]

describe('acharChao', () => {
	it('para na base do carro, nunca acima dela', () => {
		const topo = acharChao(cena(true), W, H)
		for (let x = 0; x < W; x++) expect(topo[x]).toBeGreaterThanOrEqual(BASE_DO_CARRO)
	})

	it('a junta não interrompe o chão na coluna dela', () => {
		const topo = acharChao(cena(true), W, H)
		expect(topo[200]).toBeLessThan(BASE_DO_CARRO + 30)
	})
})

describe('limparJuntas', () => {
	it('apaga a junta: a coluna volta ao tom do piso', () => {
		const d = cena(true)
		expect(limparJuntas(d, W, H)).toBeGreaterThan(0)
		for (let y = BASE_DO_CARRO + 30; y < H; y += 10) {
			expect(Math.abs(px(d, 200, y) - 190)).toBeLessThan(16)
			expect(Math.abs(px(d, 201, y) - 190)).toBeLessThan(16)
		}
	})

	it('não toca no carro, nem no detalhe fino dentro dele', () => {
		const antes = cena(true)
		const d = cena(true)
		limparJuntas(d, W, H)
		for (let y = 0; y < BASE_DO_CARRO; y++) {
			for (let x = 0; x < W; x++) expect(px(d, x, y)).toBe(px(antes, x, y))
		}
	})

	it('longe da junta o grão do piso fica como veio', () => {
		const antes = cena(true)
		const d = cena(true)
		limparJuntas(d, W, H)
		let iguais = 0
		let total = 0
		for (let y = BASE_DO_CARRO + 20; y < H; y++) {
			for (let x = 0; x < 150; x++) {
				total++
				if (px(d, x, y) === px(antes, x, y)) iguais++
			}
		}
		expect(iguais / total).toBeGreaterThan(0.97)
	})

	it('é idempotente o bastante: rodar de novo não acha outra junta', () => {
		const d = cena(true)
		limparJuntas(d, W, H)
		const depois = Uint8ClampedArray.from(d)
		limparJuntas(d, W, H)
		let maior = 0
		for (let i = 0; i < d.length; i += 4) maior = Math.max(maior, Math.abs(d[i] - depois[i]))
		expect(maior).toBeLessThan(16)
	})
})
