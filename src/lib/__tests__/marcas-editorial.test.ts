import { describe, it, expect } from 'vitest'
import { MARCAS_EDITORIAL, editorialDaMarca, flexao, filtrarPelaLinha } from '@/lib/seo/marcas-editorial'
import { findSEOBrand, marcasDoHub } from '@/lib/seo-brands'

describe('MARCAS_EDITORIAL', () => {
	// A rota /[brand] é gerada a partir das chaves deste objeto. Chave que não
	// resolve para uma marca real vira página gerada sem estoque e sem página
	// comercial para apontar. Uma LINHA (range-rover) resolve pela marca-base.
	it('todo slug resolve para uma marca de SEO_BRANDS', () => {
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			const base = e.linha?.marcaBase ?? slug
			expect(findSEOBrand(base), `slug sem marca: ${slug} (base: ${base})`).toBeDefined()
		}
	})

	// O filtro de modelo da linha é o que impede /range-rover de mostrar
	// Defender e Discovery — `range-rover` é alias de `land-rover` na
	// normalização de marca, então o filtro de marca sozinho casaria com tudo.
	it('toda linha declara filtro de modelo em minúsculas', () => {
		for (const [slug, e] of Object.entries(MARCAS_EDITORIAL)) {
			if (!e.linha) continue
			expect(e.linha.filtroDeModelo.length, slug).toBeGreaterThan(2)
			expect(e.linha.filtroDeModelo, slug).toBe(e.linha.filtroDeModelo.toLowerCase())
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
			const brand = findSEOBrand(e.linha?.marcaBase ?? slug)!
			expect(e.titulo, slug).not.toBe(brand.metaTitle)
		}
	})

	// Título repetido entre duas páginas editoriais é o mesmo defeito que a
	// duplicação com /comprar, só que dentro da própria família.
	it('não repete título entre as próprias páginas', () => {
		const titulos = Object.values(MARCAS_EDITORIAL).map(e => e.titulo)
		expect(new Set(titulos).size).toBe(titulos.length)
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

describe('flexao', () => {
	// Sem isto a página do Range Rover diria "numa Range Rover usada" em todos
	// os títulos — nome de linha segue o gênero do carro, não o da marca.
	it('flexiona no masculino para nome de linha', () => {
		const g = flexao('m')
		expect(`O que verificar ${g.em} Range Rover ${g.usado}`).toBe(
			'O que verificar num Range Rover usado',
		)
		expect(`${g.defMaiusculo} Range Rover no Brasil`).toBe('O Range Rover no Brasil')
		expect(`Procura ${g.indef} Range Rover ${g.especifico}?`).toBe(
			'Procura um Range Rover específico?',
		)
	})

	it('mantém o feminino como padrão, que é o caso das marcas', () => {
		const g = flexao()
		expect(`O que verificar ${g.em} Ferrari ${g.usado}`).toBe(
			'O que verificar numa Ferrari usada',
		)
		expect(`${g.nenhum} Ferrari no estoque`).toBe('Nenhuma Ferrari no estoque')
	})
})

describe('filtrarPelaLinha', () => {
	const linha = MARCAS_EDITORIAL['range-rover'].linha!
	// O estoque real hoje tem um único Land Rover, e ele é um Range Rover — a
	// página pareceria certa mesmo com o filtro quebrado. Estes são os carros
	// que ainda não entraram.
	const estoque = [
		{ model: 'Range Rover' },
		{ model: 'RANGE ROVER' },
		{ model: 'Defender' },
		{ model: 'Discovery Sport' },
		{ model: null },
	]

	it('deixa passar só os Range Rover', () => {
		expect(filtrarPelaLinha(estoque, linha)).toEqual([
			{ model: 'Range Rover' },
			{ model: 'RANGE ROVER' },
		])
	})

	it('não devolve nada da marca-base que não seja da linha', () => {
		const modelos = filtrarPelaLinha(estoque, linha).map(v => v.model)
		expect(modelos).not.toContain('Defender')
		expect(modelos).not.toContain('Discovery Sport')
	})

	it('devolve tudo quando não há linha — página de marca mostra a marca inteira', () => {
		expect(filtrarPelaLinha(estoque, undefined)).toHaveLength(5)
	})
})
