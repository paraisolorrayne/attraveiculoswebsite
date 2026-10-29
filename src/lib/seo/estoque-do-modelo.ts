/**
 * As unidades de um modelo à venda agora, para as páginas de preço
 * (/preco/<modelo>) e de modelo (/comprar/modelo/<modelo>).
 *
 * Até 28/10/2026 essas páginas buscavam o estoque no navegador: o robô (e a
 * IA que cita preço) lia "Consultando estoque..." e nada mais, numa página
 * chamada "Tabela Atualizada". Agora a lista sai no HTML, com os preços e o
 * aviso de que estão sujeitos a atualização (decisão da Attra, 28/10/2026).
 */

import { cache } from 'react'
import type { Vehicle } from '@/types'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { veiculosDoModelo } from './modelos-do-estoque'

/** Vai junto de todo preço destas páginas, marcado com asterisco. */
export const AVISO_DE_PRECO = 'Preços sujeitos a atualização.'

/**
 * Unidades à venda de um modelo, da mais barata para a mais cara (sem preço
 * publicado vai para o fim). Estoque fora do ar dá lista vazia: a página
 * segue com o texto editorial em vez de quebrar.
 */
export const estoqueDoModelo = cache(async (marca: string, modelo: string): Promise<Vehicle[]> => {
	try {
		const { vehicles } = await loadListedInventory()
		const preco = (v: Vehicle) => (v.price > 0 ? v.price : Number.POSITIVE_INFINITY)
		return veiculosDoModelo(vehicles, marca, modelo).sort((a, b) => preco(a) - preco(b))
	} catch (error) {
		console.error(`estoque do modelo ${marca} ${modelo} indisponível`, error)
		return []
	}
})

export interface ResumoDoEstoque {
	unidades: number
	/** Menor e maior preço publicados; null quando nenhuma unidade tem preço. */
	precos: { menor: number; maior: number } | null
	anos: { menor: number; maior: number } | null
}

export function resumoDoEstoque(veiculos: Pick<Vehicle, 'price' | 'year_model'>[]): ResumoDoEstoque {
	const precos = veiculos.map(v => v.price).filter(p => p > 0)
	const anos = veiculos.map(v => v.year_model).filter(a => a > 0)
	return {
		unidades: veiculos.length,
		precos: precos.length ? { menor: Math.min(...precos), maior: Math.max(...precos) } : null,
		anos: anos.length ? { menor: Math.min(...anos), maior: Math.max(...anos) } : null,
	}
}

/** "R$ 689.900", sem centavos: é o valor de vitrine, não o de nota. */
export function reais(valor: number): string {
	return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`
}

/**
 * A resposta em uma frase, do jeito que um buscador ou uma IA cita:
 * "4 unidades de Porsche 911 à venda na Attra, de R$ 689.900 a R$ 1.290.000*".
 * O asterisco remete a AVISO_DE_PRECO. Sem unidade, null.
 */
export function fraseDoEstoque(nome: string, resumo: ResumoDoEstoque): string | null {
	if (resumo.unidades === 0) return null
	const quantas = resumo.unidades === 1 ? `1 unidade de ${nome}` : `${resumo.unidades} unidades de ${nome}`
	const { precos } = resumo
	const valor = !precos
		? ''
		: precos.menor === precos.maior
			? `, por ${reais(precos.menor)}*`
			: `, de ${reais(precos.menor)} a ${reais(precos.maior)}*`
	return `${quantas} à venda na Attra${valor}`
}
