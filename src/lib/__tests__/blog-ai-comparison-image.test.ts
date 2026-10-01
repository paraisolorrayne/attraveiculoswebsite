import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { temFaixaNoCanto } from '@/lib/blog-ai/comparison-image'

// Fotos sintéticas no formato das do estoque (4:3), com fundo de pátio cinza.
const W = 1920
const H = 1440

function svg(conteudo: string) {
	return sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
		<rect width="${W}" height="${H}" fill="#8a8d90"/>${conteudo}</svg>`)).jpeg().toBuffer()
}

describe('temFaixaNoCanto', () => {
	it('reconhece a faixa vermelha do anúncio, colada na borda direita, embaixo', async () => {
		// Como a "PPF FULL": faixa de ~37% da largura, encostada na direita, a ~88% da altura.
		const foto = await svg(`<rect x="${W * 0.63}" y="${H * 0.86}" width="${W * 0.37}" height="${H * 0.06}" fill="#c4151c"/>`)
		expect(await temFaixaNoCanto(foto)).toBe(true)
	})

	it('não confunde carro vermelho com faixa — o carro não encosta na borda', async () => {
		const foto = await svg(`<rect x="${W * 0.1}" y="${H * 0.45}" width="${W * 0.75}" height="${H * 0.45}" rx="120" fill="#c4151c"/>`)
		expect(await temFaixaNoCanto(foto)).toBe(false)
	})

	it('foto sem nada vermelho', async () => {
		expect(await temFaixaNoCanto(await svg(''))).toBe(false)
	})
})
