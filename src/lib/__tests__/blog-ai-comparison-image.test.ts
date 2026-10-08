import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { composeComparisonBuffers } from '@/lib/blog-ai/comparison-image'

// Fotos sintéticas no formato das do estoque (4:3), com fundo de pátio cinza.
const W = 1920
const H = 1440

function svg(conteudo: string) {
	return sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
		<rect width="${W}" height="${H}" fill="#8a8d90"/>${conteudo}</svg>`)).jpeg().toBuffer()
}

describe('composeComparisonBuffers', () => {
	it('preserva a orientação da foto — não espelha placas, logotipos ou textos', async () => {
		// O lado esquerdo da foto A é vermelho e o direito é azul. Se a capa a
		// espelhar, essas cores aparecem invertidas no painel esquerdo.
		const fotoA = await svg(`<rect width="${W / 2}" height="${H}" fill="#e00000"/><rect x="${W / 2}" width="${W / 2}" height="${H}" fill="#004dff"/>`)
		const fotoB = await svg('')
		const capa = await composeComparisonBuffers(fotoA, fotoB)
		const { data } = await sharp(capa).raw().toBuffer({ resolveWithObject: true })
		const pixel = (x: number, y: number) => {
			const i = (y * 2400 + x) * 3
			return { r: data[i], g: data[i + 1], b: data[i + 2] }
		}

		const ladoEsquerdo = pixel(150, 630)
		const ladoDireito = pixel(1050, 630)
		expect(ladoEsquerdo.r).toBeGreaterThan(ladoEsquerdo.b)
		expect(ladoDireito.b).toBeGreaterThan(ladoDireito.r)
	})
})
