import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { desfocarPixels } from '@content/admin/creative/gerador/desenho'

/** Imagem w×h em cinza, opaca, com o valor de cada pixel dado por `v(x, y)`. */
function imagem(w: number, h: number, v: (x: number, y: number) => number): Uint8ClampedArray {
	const d = new Uint8ClampedArray(w * h * 4)
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4
			d[i] = d[i + 1] = d[i + 2] = v(x, y)
			d[i + 3] = 255
		}
	return d
}
const cinza = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4]

describe('desfoque feito à mão (o Safari ignora ctx.filter)', () => {
	it('imagem lisa continua igual, inclusive nas bordas', () => {
		const d = imagem(20, 12, () => 120)
		desfocarPixels(d, 20, 12, 3)
		expect(new Set(d)).toEqual(new Set([120, 255]))
	})

	it('um degrau vira rampa: some a quina, fica a média dos dois lados', () => {
		const w = 40
		const d = imagem(w, 4, x => (x < w / 2 ? 0 : 200))
		desfocarPixels(d, w, 4, 3)
		const linha = Array.from({ length: w }, (_, x) => cinza(d, w, x, 1))
		for (let x = 1; x < w; x++) expect(linha[x]).toBeGreaterThanOrEqual(linha[x - 1])
		expect(linha[0]).toBe(0)
		expect(linha[w - 1]).toBe(200)
		expect(linha[w / 2 - 1] + linha[w / 2]).toBeCloseTo(200, -1)
		// o degrau se espalha por vários pixels em vez de pular de 0 a 200
		expect(linha.filter(v => v > 0 && v < 200).length).toBeGreaterThan(8)
	})
})

describe('o motor do gerador não usa ctx.filter', () => {
	// O Safari aceita a propriedade e não faz nada: em 16/10/2026 o piso do
	// Premium saiu cinza claro em produção, com o texto branco em cima.
	it('nenhum arquivo do motor atribui ctx.filter', () => {
		const raiz = join(process.cwd(), 'content/admin/creative/gerador')
		const arquivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' }).filter(f => f.endsWith('.ts'))
		expect(arquivos.length).toBeGreaterThan(5)
		const comFilter = arquivos.filter(f => /\.filter\s*=(?!=)/.test(readFileSync(join(raiz, f), 'utf8')))
		expect(comFilter).toEqual([])
	})
})
