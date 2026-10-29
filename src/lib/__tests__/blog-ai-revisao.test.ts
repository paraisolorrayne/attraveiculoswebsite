import { describe, it, expect } from 'vitest'
import { problemasDoTexto } from '@/lib/blog-ai/gemini-blog'

const paragrafo = (n: number) => `<p>${'O carro chegou com a cor escolhida pelo cliente e a ficha completa. '.repeat(n)}</p>`

describe('problemasDoTexto: a revisão antes de publicar o post automático', () => {
	it('texto direto, no tamanho e com a marca na medida passa', () => {
		const r = { title: 'Lamborghini Temerário roxo: a entrega em Goiânia', content_html: `<p>A Attra entregou.</p>${paragrafo(70)}` }
		expect(problemasDoTexto(r)).toEqual([])
	})

	it('acusa clichê de IA, marca repetida, tamanho e título longo', () => {
		const r = {
			title: 'Ferrari 296 GTS: a obra-prima híbrida que redefine o conceito de esportivo italiano',
			content_html: `<p>${'Na Attra, '.repeat(6)}uma sinfonia.</p>${paragrafo(10)}`,
		}
		const problemas = problemasDoTexto(r)
		expect(problemas[0]).toMatch(/obra-prima.*sinfonia.*redefine|obra-prima/)
		expect(problemas.some(p => p.includes('"Attra" aparece 6 vezes'))).toBe(true)
		expect(problemas.some(p => p.includes('mínimo 700'))).toBe(true)
		expect(problemas.some(p => p.includes('caracteres (máximo 60)'))).toBe(true)
	})
})
