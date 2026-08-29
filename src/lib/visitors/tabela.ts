/**
 * Ordenação e filtro por coluna das tabelas do painel de visitantes.
 *
 * Arquivo puro (sem React) para as regras poderem ser testadas sem montar
 * tela: o que decide se uma linha aparece, e em que ordem, é aqui.
 *
 * As tabelas do painel são todas de leitura e cabem inteiras na memória do
 * navegador (a maior é a de sessões, com teto de 50 por página), então
 * ordenar e filtrar acontece no cliente — sem ida ao servidor a cada clique.
 */

export type Direcao = 'asc' | 'desc'

export interface Ordenacao {
	chave: string
	direcao: Direcao
}

/** O que a coluna sabe fazer: texto casa por trecho, opções por igualdade, número por comparação. */
export type TipoFiltro = 'texto' | 'opcoes' | 'numero'

export interface Filtro {
	tipo: TipoFiltro
	/** texto: trecho procurado · opções: valor exato · número: o limite. */
	valor: string
	/** Só para número. */
	operador?: 'maior' | 'menor'
}

/** Valor bruto de uma célula, usado para ordenar e filtrar (nunca o JSX). */
export type ValorDaCelula = string | number | null | undefined

export type LeitorDeValor<T> = (linha: T, chave: string) => ValorDaCelula

/**
 * Normaliza texto para busca: sem acento, minúsculo, sem espaço nas pontas.
 * "Uberlândia" tem que ser encontrada digitando "uberlandia".
 */
export function normalizarTexto(valor: ValorDaCelula): string {
	return String(valor ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase()
}

function numeroDe(valor: ValorDaCelula): number | null {
	if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
	if (valor === null || valor === undefined || valor === '') return null
	// Aceita "1.234", "12,5%", "R$ 1.890.000" — o que o painel exibe.
	const limpo = String(valor).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
	const n = Number(limpo)
	return Number.isFinite(n) ? n : null
}

/**
 * Ordena sem alterar o array recebido. Vazios vão sempre para o fim, nas duas
 * direções: linha sem valor é ausência de dado, não o menor valor — deixá-la
 * no topo em ordem crescente empurraria a informação para longe.
 */
export function ordenarLinhas<T>(linhas: T[], valorDe: LeitorDeValor<T>, ordenacao: Ordenacao | null): T[] {
	if (!ordenacao) return linhas
	const fator = ordenacao.direcao === 'asc' ? 1 : -1
	return [...linhas].sort((a, b) => {
		const va = valorDe(a, ordenacao.chave)
		const vb = valorDe(b, ordenacao.chave)
		const vazioA = va === null || va === undefined || va === ''
		const vazioB = vb === null || vb === undefined || vb === ''
		if (vazioA && vazioB) return 0
		if (vazioA) return 1
		if (vazioB) return -1
		const na = numeroDe(va)
		const nb = numeroDe(vb)
		if (na !== null && nb !== null && typeof va !== 'string') return (na - nb) * fator
		if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator
		return normalizarTexto(va).localeCompare(normalizarTexto(vb), 'pt-BR') * fator
	})
}

/** Uma linha passa quando satisfaz TODOS os filtros ativos (e). */
export function filtrarLinhas<T>(linhas: T[], valorDe: LeitorDeValor<T>, filtros: Record<string, Filtro>): T[] {
	const ativos = Object.entries(filtros).filter(([, f]) => f && String(f.valor).trim() !== '')
	if (ativos.length === 0) return linhas
	return linhas.filter(linha =>
		ativos.every(([chave, filtro]) => {
			const valor = valorDe(linha, chave)
			if (filtro.tipo === 'texto') return normalizarTexto(valor).includes(normalizarTexto(filtro.valor))
			if (filtro.tipo === 'opcoes') return normalizarTexto(valor) === normalizarTexto(filtro.valor)
			const alvo = numeroDe(filtro.valor)
			const atual = numeroDe(valor)
			if (alvo === null) return true
			if (atual === null) return false
			return filtro.operador === 'menor' ? atual <= alvo : atual >= alvo
		}),
	)
}

/** Valores distintos de uma coluna, para montar o select do filtro de opções. */
export function opcoesDaColuna<T>(linhas: T[], valorDe: LeitorDeValor<T>, chave: string): string[] {
	const vistos = new Map<string, string>()
	for (const linha of linhas) {
		const bruto = valorDe(linha, chave)
		const texto = String(bruto ?? '').trim()
		if (!texto) continue
		const k = normalizarTexto(texto)
		if (!vistos.has(k)) vistos.set(k, texto)
	}
	return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Clique no cabeçalho: primeira vez ordena pela coluna (decrescente, que é o
 * que interessa numa tabela de métrica), segunda inverte, terceira volta à
 * ordem original — sem precisar de um botão "limpar" só para isso.
 */
export function proximaOrdenacao(atual: Ordenacao | null, chave: string): Ordenacao | null {
	if (!atual || atual.chave !== chave) return { chave, direcao: 'desc' }
	if (atual.direcao === 'desc') return { chave, direcao: 'asc' }
	return null
}
