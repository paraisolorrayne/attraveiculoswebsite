import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { generateReviewDoEstoque } from '@/lib/blog-ai/gemini-blog'
import type { Vehicle } from '@/types'

const CARRO = {
	id: '1142317',
	slug: 'mercedes-benz-amg-s-63-e-performance-2025-1142317',
	brand: 'Mercedes-Benz',
	model: 'AMG S 63',
	version: 'E Performance',
	year_manufacture: 2025,
	year_model: 2025,
	mileage: 3200,
	color: 'Preto',
	price: 1_390_000,
	is_new: false,
	status: 'available',
	photos: ['https://cdn/s63-1.jpg', 'https://cdn/s63-2.jpg'],
	horsepower: 802,
	transmission: 'Automático',
	ficha: {
		motor: 'V8 4.0 biturbo híbrido',
		potencia: '802 cv',
		torque: '143 kgfm',
		cambio: 'AMG Speedshift 9 marchas',
		tracao: 'Integral 4MATIC+',
		aceleracao_0_100: '3,3 s',
		velocidade_maxima: null,
		cor: 'Preto Obsidiana',
		interior: 'Couro Nappa bege',
		som: 'Burmester 4D',
		rodas: null,
		freios: 'Carbono-cerâmica',
		diferenciais: ['Eixo traseiro direcional'],
		opcionais: ['Teto panorâmico', 'Massagem nos bancos'],
	},
} as unknown as Vehicle

const paragrafo = '<p>O S 63 junta o V8 biturbo a um motor elétrico no eixo traseiro e entrega a força nas quatro rodas. </p>'

/** Resposta do Gemini que passa na revisão: tamanho certo, sem clichê, "Attra" uma vez. */
const RESPOSTA = {
	title: 'Mercedes-AMG S 63 E Performance 2025 em Preto Obsidiana',
	slug_hint: 'mercedes-amg-s-63-e-performance-2025-preto',
	excerpt: 'Um S 63 E Performance 2025 com 3.200 km — Preto Obsidiana e interior bege.',
	content_html:
		'<p>Este S 63 está à venda na Attra por R$ 1.390.000 — com 3.200 km.</p><img src="IMAGEM_0">' +
		paragrafo.repeat(40),
	meta_title: 'Mercedes-AMG S 63 E Performance 2025 à venda',
	meta_description: 'S 63 E Performance 2025, 802 cv e 3.200 km.',
	keywords: ['mercedes s 63 à venda'],
	faq: [{ question: 'Quanto anda?', answer: 'Faz de 0 a 100 km/h em 3,3 s, segundo a ficha.' }],
	evaluation: { summary: 'Sedã híbrido de 802 cv.', highlights: ['802 cv'], target_profile: 'Quem quer sedã de motorista e de pista.' },
}

describe('generateReviewDoEstoque: o post sem Instagram', () => {
	const prompts: string[] = []

	beforeEach(() => {
		prompts.length = 0
		vi.stubEnv('GEMINI_API_KEY', 'teste')
		vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
			prompts.push(JSON.parse(init.body).contents[0].parts[0].text)
			return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(RESPOSTA) }] } }] }) }
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('pede o texto só com a ficha, sem legenda', async () => {
		await generateReviewDoEstoque(CARRO)
		expect(prompts).toHaveLength(1)
		expect(prompts[0]).toContain('FONTES: a ficha do anúncio abaixo é a única fonte de número')
		expect(prompts[0]).toContain('- Interior: Couro Nappa bege')
		expect(prompts[0]).toContain('- 0 a 100 km/h: 3,3 s')
		expect(prompts[0]).not.toContain('LEGENDA DO INSTAGRAM')
	})

	it('sai como review, sem preço, sem travessão e sem rodapé do Instagram', async () => {
		const { strategy, post } = await generateReviewDoEstoque(CARRO)
		expect(strategy).toBe('review')
		expect(post.post_type).toBe('car_review')
		expect(post.content).not.toMatch(/R\$|1\.390\.000/)
		expect(`${post.content} ${post.excerpt}`).not.toContain('—')
		expect(post.content).toContain('https://cdn/s63-1.jpg')
		expect(post.content).not.toContain('Instagram')
		expect(post.featured_image).toBe('https://cdn/s63-1.jpg')
	})

	it('a tabela do review vem da ficha; o que a ficha não tem fica vazio', async () => {
		const { post } = await generateReviewDoEstoque(CARRO)
		const review = post.car_review!
		expect(review.color).toBe('Preto Obsidiana')
		expect(review.specs.power).toBe('802 cv')
		expect(review.specs.torque).toBe('143 kgfm')
		expect(review.specs.top_speed).toBe('')
		expect(review.optionals).toEqual(['Teto panorâmico', 'Massagem nos bancos'])
		expect(review.availability.stock_url).toBe('/veiculo/mercedes-benz-amg-s-63-e-performance-2025-1142317')
	})
})
