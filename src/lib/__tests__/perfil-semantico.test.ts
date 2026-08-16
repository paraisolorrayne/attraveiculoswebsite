import { describe, it, expect } from 'vitest'
import { montarPassagem, prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

const FATUAL = 'Porsche Macan GTS Bi-Turbo 2024. tipo SUV. 19.930 km. R$ 499.000'
const ROTULOS: Rotulos = {
	uso: ['familia', 'viagem', 'urbano'],
	comprador: ['familia', 'executivo'],
	forca: ['baixa-quilometragem'],
}

describe('prosaEhAceitavel', () => {
	// A trava que a própria Attra impôs revisando o exemplo do spec: a prosa
	// não pode afirmar conforto nem comparar com categoria nenhuma.
	it('recusa juízo de conforto', () => {
		expect(prosaEhAceitavel('SUV com espaço real para quatro adultos.').ok).toBe(false)
		expect(prosaEhAceitavel('Interior confortável e espaçoso.').ok).toBe(false)
	})

	it('recusa comparativo e superlativo', () => {
		expect(prosaEhAceitavel('Desempenho acima da média da categoria.').ok).toBe(false)
		expect(prosaEhAceitavel('O mais rápido da linha.').ok).toBe(false)
		expect(prosaEhAceitavel('Ideal para quem viaja.').ok).toBe(false)
	})

	it('aceita reescrita de rótulo e valor de ficha', () => {
		expect(prosaEhAceitavel('SUV premium para uso diário e viagem em família. Baixa quilometragem.').ok).toBe(true)
	})

	it('explica o motivo da recusa', () => {
		const r = prosaEhAceitavel('Interior espaçoso.')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.motivo).toContain('espaçoso')
	})

	// Quase-fronteira: "espaço de carga" contém "espaço" mas nenhum termo
	// proibido inteiro ('espaço real', 'espaçoso'). A lista é generosa, não
	// gatilha em qualquer substring parecida — só nas que estão de fato na lista.
	it('não recusa "espaço de carga", que não contém nenhum termo proibido inteiro', () => {
		expect(prosaEhAceitavel('SUV com espaço de carga para viagem em família.').ok).toBe(true)
	})

	// Segundo exemplo do lado aceito, reaproveitando outro par rótulo/ficha
	// (executivo, baixa quilometragem) para não depender de um único caso feliz.
	it('aceita outra reescrita de rótulo e valor de ficha, sem juízo nem comparação', () => {
		expect(prosaEhAceitavel('Uso executivo, baixa quilometragem, revisões em dia.').ok).toBe(true)
	})
})

describe('montarPassagem', () => {
	it('junta ficha, prosa e rótulos', () => {
		const p = montarPassagem(FATUAL, ROTULOS, 'SUV premium para uso diário e viagem em família.')
		expect(p).toContain(FATUAL)
		expect(p).toContain('SUV premium para uso diário')
		expect(p).toContain('família')
		expect(p).toContain('executivo')
	})

	// O caso que motivou o projeto: a pergunta da Auto Trader precisa casar.
	it('faz a passagem conter as palavras da pergunta do comprador', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null).toLowerCase()
		expect(p).toContain('família')
		expect(p).toContain('viagem')
	})

	// Índice sem prosa é ruim; índice desatualizado é pior.
	it('funciona sem prosa nenhuma', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null)
		expect(p).toContain(FATUAL)
		expect(p.length).toBeGreaterThan(FATUAL.length)
	})

	it('devolve só o factual quando não há rótulo nem prosa', () => {
		const vazio: Rotulos = { uso: [], comprador: [], forca: [] }
		expect(montarPassagem(FATUAL, vazio, null)).toBe(FATUAL)
	})

	// Prosa reprovada não pode entrar no índice de jeito nenhum.
	it('descarta prosa que não passa na trava', () => {
		const p = montarPassagem(FATUAL, ROTULOS, 'Espaço real para quatro adultos.')
		expect(p).not.toContain('quatro adultos')
	})

	// Cada eixo de rótulo (uso, comprador, força) decide sozinho se entra na
	// passagem. Os testes acima só exercitam "todos vazios" vs "todos
	// preenchidos" — aqui os dois lados de cada eixo são cobertos isoladamente,
	// para não deixar passar um eixo que vaze rótulo de outro ou que suma
	// quando só ele está vazio.
	it('inclui só o eixo "uso" quando comprador e força estão vazios', () => {
		const r: Rotulos = { uso: ['fim-de-semana'], comprador: [], forca: [] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).toContain('Uso: fim de semana.')
		expect(p).not.toContain('Perfil:')
		expect(p).not.toContain('Destaques:')
	})

	it('inclui só o eixo "comprador" quando uso e força estão vazios', () => {
		const r: Rotulos = { uso: [], comprador: ['entusiasta'], forca: [] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).not.toContain('Uso:')
		expect(p).toContain('Perfil: entusiasta.')
		expect(p).not.toContain('Destaques:')
	})

	it('inclui só o eixo "força" quando uso e comprador estão vazios', () => {
		const r: Rotulos = { uso: [], comprador: [], forca: ['espaco'] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).not.toContain('Uso:')
		expect(p).not.toContain('Perfil:')
		expect(p).toContain('Destaques: espaço de carga.')
	})
})
