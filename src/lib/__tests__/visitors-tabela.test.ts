import { describe, it, expect } from 'vitest'
import {
	filtrarLinhas,
	normalizarTexto,
	opcoesDaColuna,
	ordenarLinhas,
	proximaOrdenacao,
	type Filtro,
} from '@/lib/visitors/tabela'

interface Linha {
	fonte: string
	canal: string
	sessoes: number
	conversao: number
	cidade: string | null
}

const LINHAS: Linha[] = [
	{ fonte: 'Google', canal: 'Busca paga', sessoes: 2520, conversao: 4.7, cidade: 'Uberlândia' },
	{ fonte: 'Meta', canal: 'Social pago', sessoes: 657, conversao: 0.3, cidade: 'São Paulo' },
	{ fonte: 'Linktree', canal: 'Social orgânico', sessoes: 557, conversao: 1.3, cidade: 'Belo Horizonte' },
	{ fonte: 'ChatGPT', canal: 'Assistente de IA', sessoes: 10, conversao: 10, cidade: null },
]

const valorDe = (l: Linha, chave: string) => l[chave as keyof Linha]

describe('ordenarLinhas', () => {
	it('ordena por número, nas duas direções, sem alterar o array original', () => {
		const desc = ordenarLinhas(LINHAS, valorDe, { chave: 'sessoes', direcao: 'desc' })
		expect(desc.map(l => l.sessoes)).toEqual([2520, 657, 557, 10])
		const asc = ordenarLinhas(LINHAS, valorDe, { chave: 'sessoes', direcao: 'asc' })
		expect(asc.map(l => l.sessoes)).toEqual([10, 557, 657, 2520])
		expect(LINHAS[0].fonte).toBe('Google') // original intacto
	})

	it('ordena texto ignorando acento e caixa', () => {
		const asc = ordenarLinhas(LINHAS, valorDe, { chave: 'cidade', direcao: 'asc' })
		expect(asc.map(l => l.cidade)).toEqual(['Belo Horizonte', 'São Paulo', 'Uberlândia', null])
	})

	it('linha sem valor vai para o fim nas DUAS direções — ausência não é o menor valor', () => {
		const desc = ordenarLinhas(LINHAS, valorDe, { chave: 'cidade', direcao: 'desc' })
		expect(desc[desc.length - 1].cidade).toBeNull()
	})

	it('sem ordenação devolve a ordem que veio do servidor', () => {
		expect(ordenarLinhas(LINHAS, valorDe, null)).toBe(LINHAS)
	})
})

describe('filtrarLinhas', () => {
	const f = (filtros: Record<string, Filtro>) => filtrarLinhas(LINHAS, valorDe, filtros).map(l => l.fonte)

	it('texto casa por trecho, sem acento e sem caixa', () => {
		expect(f({ cidade: { tipo: 'texto', valor: 'uberlandia' } })).toEqual(['Google'])
		expect(f({ fonte: { tipo: 'texto', valor: 'ee' } })).toEqual(['Linktree'])
	})

	it('opções casa por valor exato', () => {
		expect(f({ canal: { tipo: 'opcoes', valor: 'Social pago' } })).toEqual(['Meta'])
		expect(f({ canal: { tipo: 'opcoes', valor: 'Social' } })).toEqual([])
	})

	it('número compara com maior/menor ou igual', () => {
		expect(f({ sessoes: { tipo: 'numero', valor: '600', operador: 'maior' } })).toEqual(['Google', 'Meta'])
		expect(f({ conversao: { tipo: 'numero', valor: '1.3', operador: 'menor' } })).toEqual(['Meta', 'Linktree'])
	})

	it('filtros se somam (e), e filtro vazio não filtra nada', () => {
		expect(f({ canal: { tipo: 'opcoes', valor: 'Busca paga' }, sessoes: { tipo: 'numero', valor: '3000', operador: 'maior' } })).toEqual([])
		expect(f({ fonte: { tipo: 'texto', valor: '   ' } })).toHaveLength(4)
	})

	it('linha sem valor não passa em filtro numérico', () => {
		const comNulo = [...LINHAS, { fonte: 'X', canal: 'Direto', sessoes: null as unknown as number, conversao: 0, cidade: null }]
		const r = filtrarLinhas(comNulo, valorDe, { sessoes: { tipo: 'numero', valor: '0', operador: 'maior' } })
		expect(r.map(l => l.fonte)).not.toContain('X')
	})
})

describe('opcoesDaColuna', () => {
	it('devolve os valores distintos, em ordem alfabética, sem vazios', () => {
		expect(opcoesDaColuna(LINHAS, valorDe, 'canal')).toEqual(['Assistente de IA', 'Busca paga', 'Social orgânico', 'Social pago'])
		expect(opcoesDaColuna(LINHAS, valorDe, 'cidade')).toEqual(['Belo Horizonte', 'São Paulo', 'Uberlândia'])
	})

	it('agrupa grafias que só diferem em caixa/acento, mantendo a primeira exibição', () => {
		const linhas = [{ x: 'Ferrari' }, { x: 'ferrari' }, { x: 'FERRARI' }]
		expect(opcoesDaColuna(linhas, (l, c) => l[c as 'x'], 'x')).toEqual(['Ferrari'])
	})
})

describe('proximaOrdenacao — o ciclo do clique no cabeçalho', () => {
	it('primeiro clique ordena do maior para o menor', () => {
		expect(proximaOrdenacao(null, 'sessoes')).toEqual({ chave: 'sessoes', direcao: 'desc' })
	})

	it('segundo clique inverte, terceiro volta à ordem original', () => {
		const um = proximaOrdenacao(null, 'sessoes')!
		const dois = proximaOrdenacao(um, 'sessoes')!
		expect(dois.direcao).toBe('asc')
		expect(proximaOrdenacao(dois, 'sessoes')).toBeNull()
	})

	it('clicar em outra coluna recomeça o ciclo nela', () => {
		expect(proximaOrdenacao({ chave: 'sessoes', direcao: 'asc' }, 'fonte')).toEqual({ chave: 'fonte', direcao: 'desc' })
	})
})

describe('normalizarTexto', () => {
	it('tira acento, caixa e espaços das pontas', () => {
		expect(normalizarTexto('  Uberlândia ')).toBe('uberlandia')
		expect(normalizarTexto(null)).toBe('')
		expect(normalizarTexto(42)).toBe('42')
	})
})
