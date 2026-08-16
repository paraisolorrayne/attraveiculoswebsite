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
})
