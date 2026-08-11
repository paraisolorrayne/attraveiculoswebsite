import { describe, it, expect } from 'vitest'
import { termosDaBusca, cardCasaBusca } from '@/lib/crm-busca'

type CardBuscavel = Parameters<typeof cardCasaBusca>[0]

const card = (p: Partial<CardBuscavel> = {}): CardBuscavel => ({
	nome: null,
	veiculo: null,
	veiculo_troca: null,
	...p,
})

const casa = (c: Partial<CardBuscavel>, termo: string) =>
	cardCasaBusca(card(c), termosDaBusca(termo))

describe('termosDaBusca', () => {
	it('devolve lista vazia quando não há o que buscar', () => {
		expect(termosDaBusca('')).toEqual([])
		expect(termosDaBusca('    ')).toEqual([])
	})

	it('quebra em palavras e normaliza caixa e acento', () => {
		expect(termosDaBusca('  Cláudio   ANTÔNIO ')).toEqual(['claudio', 'antonio'])
	})
})

describe('cardCasaBusca', () => {
	it('sem termo, todo card passa (busca vazia não filtra nada)', () => {
		expect(casa({ nome: 'Ricardo Almeida' }, '')).toBe(true)
		expect(casa({}, '   ')).toBe(true)
	})

	it('acha pelo nome do cliente, em pedaço e sem ligar para a caixa', () => {
		expect(casa({ nome: 'Ricardo Almeida' }, 'ricardo')).toBe(true)
		expect(casa({ nome: 'Ricardo Almeida' }, 'ALMEIDA')).toBe(true)
		expect(casa({ nome: 'Ricardo Almeida' }, 'mei')).toBe(true)
		expect(casa({ nome: 'Ricardo Almeida' }, 'fernanda')).toBe(false)
	})

	// Quem digita no painel não põe acento: "cladio" erra, mas "claudio"
	// precisa achar "Cláudio" — e vice-versa, colar o nome acentuado do CRM
	// tem de funcionar também.
	it('ignora acento nos dois sentidos', () => {
		expect(casa({ nome: 'Cláudio Antônio' }, 'claudio antonio')).toBe(true)
		expect(casa({ nome: 'Claudio Antonio' }, 'cláudio')).toBe(true)
		expect(casa({ veiculo: 'Mercedes-Benz GLE63s Coupé' }, 'coupe')).toBe(true)
	})

	it('acha pelo carro de interesse', () => {
		expect(casa({ veiculo: 'Porsche 911 Turbo S Coupe 2023' }, 'porsche')).toBe(true)
		expect(casa({ veiculo: 'Porsche 911 Turbo S Coupe 2023' }, '911')).toBe(true)
		expect(casa({ veiculo: 'Range Rover Sport 2023' }, 'porsche')).toBe(false)
	})

	// O carro dado na troca também é "o carro do cliente" para quem procura.
	it('acha pelo carro oferecido na troca', () => {
		expect(casa({ veiculo: 'Porsche 911', veiculo_troca: 'BMW X5 2021' }, 'bmw')).toBe(true)
	})

	// "porsche 2023" tem de achar "Porsche 911 Turbo S Coupe 2023" mesmo com
	// palavras no meio — senão a busca só serve para prefixo exato.
	it('exige todas as palavras, em qualquer ordem e sem precisar serem vizinhas', () => {
		const c = { nome: 'Ricardo Almeida', veiculo: 'Porsche 911 Turbo S Coupe 2023' }
		expect(casa(c, 'porsche 2023')).toBe(true)
		expect(casa(c, '2023 porsche')).toBe(true)
		expect(casa(c, 'porsche 2024')).toBe(false)
	})

	// Cliente e carro num mesmo campo de busca: "ricardo porsche" é uma
	// pergunta legítima ("o Ricardo do Porsche").
	it('cruza nome e carro no mesmo termo', () => {
		const c = { nome: 'Ricardo Almeida', veiculo: 'Porsche 911 Turbo S' }
		expect(casa(c, 'ricardo porsche')).toBe(true)
		expect(casa(c, 'fernanda porsche')).toBe(false)
	})

	it('card sem nome e sem carro não casa com nenhum termo', () => {
		expect(casa({}, 'ricardo')).toBe(false)
	})
})
