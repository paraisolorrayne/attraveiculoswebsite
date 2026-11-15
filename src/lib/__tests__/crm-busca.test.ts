import { describe, it, expect } from 'vitest'
import { termosDaBusca, cardCasaBusca } from '@/lib/crm-busca'

type CardBuscavel = Parameters<typeof cardCasaBusca>[0]

const card = (p: Partial<CardBuscavel> = {}): CardBuscavel => ({
	nome: null,
	veiculo: null,
	veiculo_troca: null,
	telefone: null,
	email: null,
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

	// O telefone chega do CRM em vários formatos; quem busca cola o número do
	// jeito que tem. Só os dígitos contam, dos dois lados.
	it('acha pelo telefone comparando só os dígitos', () => {
		expect(casa({ telefone: '+5545991242400' }, '45991242400')).toBe(true)
		expect(casa({ telefone: '+5545991242400' }, '(45) 99124-2400')).toBe(true)
		expect(casa({ telefone: '34 99988-7766' }, '34999887766')).toBe(true)
		expect(casa({ telefone: '34999887766' }, '7766')).toBe(true)
		expect(casa({ telefone: '34999887766' }, '11988776655')).toBe(false)
	})

	it('telefone digitado com espaços ou com o 55 na frente acha o card', () => {
		expect(casa({ telefone: '34999887766' }, '34 99988 7766')).toBe(true)
		expect(casa({ telefone: '34999887766' }, '+55 34 99988-7766')).toBe(true)
	})

	// "911" é o Porsche, não um pedaço de telefone: número curto só casa com texto.
	it('número curto não casa com telefone', () => {
		expect(casa({ telefone: '34991145566' }, '911')).toBe(false)
		expect(casa({ telefone: '34991145566', veiculo: 'Porsche 911' }, '911')).toBe(true)
	})

	it('cruza nome e pedaço do telefone', () => {
		const c = { nome: 'Ricardo Almeida', telefone: '34999887766' }
		expect(casa(c, 'ricardo 7766')).toBe(true)
		expect(casa(c, 'fernanda 7766')).toBe(false)
	})

	it('acha pelo e-mail, inteiro ou em pedaço, sem ligar para a caixa', () => {
		expect(casa({ email: 'Ricardo@Example.com' }, 'ricardo@example.com')).toBe(true)
		expect(casa({ email: 'ricardo@example.com' }, 'example')).toBe(true)
		expect(casa({ email: 'ricardo@example.com' }, 'fernanda@')).toBe(false)
	})

	it('card sem telefone e sem e-mail continua buscável pelo resto', () => {
		expect(cardCasaBusca({ nome: 'Ricardo', veiculo: null, veiculo_troca: null }, termosDaBusca('ricardo'))).toBe(true)
		expect(cardCasaBusca({ nome: 'Ricardo', veiculo: null, veiculo_troca: null }, termosDaBusca('99887766'))).toBe(false)
	})
})
