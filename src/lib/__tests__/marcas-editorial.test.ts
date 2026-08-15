import { describe, it, expect } from 'vitest'
import { MARCAS_EDITORIAL, editorialDaMarca } from '@/lib/seo/marcas-editorial'
import { findSEOBrand, marcasDoHub } from '@/lib/seo-brands'

describe('MARCAS_EDITORIAL', () => {
	// A rota /[brand] é gerada a partir das chaves deste objeto. Chave que não
	// corresponde a uma marca real vira página gerada sem dado de marca.
	it('só contém slugs que existem em SEO_BRANDS', () => {
		for (const slug of Object.keys(MARCAS_EDITORIAL)) {
			expect(findSEOBrand(slug), `slug sem marca: ${slug}`).toBeDefined()
		}
	})

	// O hub /superesportivos e a seção "outras marcas" linkam para /${slug}.
	// Marca do hub sem editorial = link para uma rota que não é gerada, ou seja,
	// 404 que ninguém vê até um usuário clicar.
	it('cobre toda marca linkada pelo hub', () => {
		for (const marca of marcasDoHub()) {
			expect(editorialDaMarca(marca.slug), `marca do hub sem editorial: ${marca.slug}`).toBeDefined()
		}
	})

	it('tem todas as seções preenchidas em toda marca', () => {
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			expect(e.titulo.length, slug).toBeGreaterThan(10)
			expect(e.resumo.length, slug).toBeGreaterThan(40)
			expect(e.origem.length, slug).toBeGreaterThan(100)
			expect(e.identidade.length, slug).toBeGreaterThan(100)
			expect(e.noBrasil.length, slug).toBeGreaterThan(80)
			expect(e.oQueVerificar.length, slug).toBeGreaterThanOrEqual(4)
			expect(e.perguntas.length, slug).toBeGreaterThanOrEqual(2)
		}
	})

	// O título é o que separa esta página da comercial no resultado de busca.
	// Se ele repetir o metaTitle de /comprar/marca, as duas voltam a competir.
	it('não repete o título da página comercial', () => {
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			const brand = findSEOBrand(slug)!
			expect(e.titulo, slug).not.toBe(brand.metaTitle)
		}
	})

	// Decisão de redação: número de potência e aceleração envelhece, varia por
	// geração e por mercado, e um número errado queima a página inteira.
	it('não afirma potência nem aceleração', () => {
		const proibido = /\b\d+\s?(cv|hp|km\/h)\b|0[–-]100/i
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			const texto = [
				e.resumo, e.origem, e.identidade, e.noBrasil,
				...e.oQueVerificar,
				...e.perguntas.flatMap(p => [p.pergunta, p.resposta]),
			].join(' ')
			expect(proibido.test(texto), `${slug} afirma número volátil`).toBe(false)
		}
	})

	it('faz perguntas de verdade nas FAQ', () => {
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			for (const p of e.perguntas) {
				expect(p.pergunta.endsWith('?'), `${slug}: "${p.pergunta}"`).toBe(true)
				expect(p.resposta.length, slug).toBeGreaterThan(80)
			}
		}
	})
})
